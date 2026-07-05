package com.clinicar.backend.controller;
import com.clinicar.backend.mapper.UsuarioMapper;
import com.clinicar.backend.dto.LoginResponse;
import com.clinicar.backend.dto.UsuarioRequest;
import com.clinicar.backend.dto.UsuarioResponse;
import com.clinicar.backend.model.Usuario;
import com.clinicar.backend.repository.UsuarioRepository;
import com.clinicar.backend.service.MfaService;
import com.clinicar.backend.service.UsuarioService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/usuario")
@CrossOrigin(
        origins = "http://localhost:4200",
        allowCredentials = "true"
)
public class UsuarioController {

    private final UsuarioRepository usuarioRepository;
    private final UsuarioService usuarioService;
    private final PasswordEncoder passwordEncoder;
    private final MfaService mfaService;
    private final UsuarioMapper usuarioMapper;

    public UsuarioController(
        UsuarioRepository usuarioRepository,
        UsuarioService usuarioService,
        PasswordEncoder passwordEncoder,
        MfaService mfaService,
        UsuarioMapper usuarioMapper
    ) {
        this.usuarioRepository = usuarioRepository;
        this.usuarioService = usuarioService;
        this.passwordEncoder = passwordEncoder;
        this.mfaService = mfaService;
        this.usuarioMapper = usuarioMapper;
    }

    @PostMapping
    public ResponseEntity<UsuarioResponse> criarUsuario(@RequestBody UsuarioRequest request) {
        Usuario salvo = usuarioService.criar(request);

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(usuarioMapper.toResponse(salvo));
    }

    @PostMapping("/login")
    public ResponseEntity<Object> login(@RequestBody Map<String, String> loginData) {
        String email = loginData.get("email");
        String senha = loginData.get("senha");

        Optional<Usuario> usuarioOpt = usuarioService.autenticar(email, senha);

        if (usuarioOpt.isEmpty()) {
            return ResponseEntity
                    .status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("mensagem", "E-mail ou senha inválidos."));
        }

        Usuario usuario = usuarioOpt.get();

        /*
         * Como todos os usuários usam MFA/TOTP, o login não devolve usuário direto.
         * Ele devolve um desafio MFA.
         */
        LoginResponse response = mfaService.prepararSegundoFator(usuario);

        return ResponseEntity.ok(response);
    }

    @GetMapping("/email/{email}")
    public ResponseEntity<UsuarioResponse> buscarPorEmail(@PathVariable String email) {
        Optional<Usuario> usuario = usuarioRepository.findByEmail(email);

        return usuario
                .map(u -> ResponseEntity.ok(usuarioMapper.toResponse(u)))
                .orElse(ResponseEntity.status(HttpStatus.NOT_FOUND).build());
    }

    @GetMapping
    public ResponseEntity<List<UsuarioResponse>> listarTodos() {
        List<UsuarioResponse> usuarios = usuarioRepository.findAll()
                .stream()
                .map(usuarioMapper::toResponse)
                .toList();

        return ResponseEntity.ok(usuarios);
    }

    @PutMapping("/{id}")
    public ResponseEntity<UsuarioResponse> atualizarUsuario(
            @PathVariable Long id,
            @RequestBody UsuarioDTO usuarioAtualizado
    ) {
        Optional<Usuario> usuarioOptional = usuarioRepository.findById(id);

        if (usuarioOptional.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        Usuario usuario = usuarioOptional.get();

        usuario.setNome(usuarioAtualizado.getNome());
        usuario.setNome_social(usuarioAtualizado.getNome_social());
        usuario.setEmail(usuarioAtualizado.getEmail());

        /*
         * Só altera a senha se uma nova senha for enviada.
         * Se vier null ou vazia, mantém a senha atual.
         */
        if (usuarioAtualizado.getSenha() != null && !usuarioAtualizado.getSenha().isBlank()) {
            String novaSenha = usuarioAtualizado.getSenha();

            if (senhaEstaCriptografadaComBCrypt(novaSenha)) {
                usuario.setSenha(novaSenha);
            } else {
                usuario.setSenha(passwordEncoder.encode(novaSenha));
            }
        }

        usuario.setNascimento(parseNascimento(usuarioAtualizado.getNascimento()));
        usuario.setCpf(soDigitos(usuarioAtualizado.getCpf()));
        usuario.setTelefone(usuarioAtualizado.getTelefone());
        usuario.setCep(soDigitos(usuarioAtualizado.getCep()));
        usuario.setLogradouro(usuarioAtualizado.getLogradouro());
        usuario.setBairro(usuarioAtualizado.getBairro());
        usuario.setCidade(usuarioAtualizado.getCidade());
        usuario.setEstado(usuarioAtualizado.getEstado());
        usuario.setComplemento_endereco(usuarioAtualizado.getComplemento_endereco());
        usuario.setNumero_endereco(usuarioAtualizado.getNumero_endereco());
        usuario.setTipo_do_acesso(usuarioAtualizado.getTipo_do_acesso());

        if (usuarioAtualizado.getStatus() == null || usuarioAtualizado.getStatus().isBlank()) {
            usuario.setStatus("ATIVO");
        } else {
            usuario.setStatus(usuarioAtualizado.getStatus());
        }

        Usuario salvo = usuarioRepository.save(usuario);

        return ResponseEntity.ok(usuarioMapper.toResponse(salvo));
    }

    @PutMapping("/{id}/resetar-mfa")
    public ResponseEntity<Map<String, String>> resetarMfaUsuario(@PathVariable Long id) {
        mfaService.resetarMfaUsuario(id);

        return ResponseEntity.ok(
                Map.of("mensagem", "Autenticação em duas etapas resetada com sucesso.")
        );
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> removerUsuario(@PathVariable Long id) {
        if (!usuarioRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }

        usuarioRepository.deleteById(id);

        return ResponseEntity.noContent().build();
    }

    private String soDigitos(String valor) {
        return valor == null ? null : valor.replaceAll("\\D", "");
    }

    private LocalDate parseNascimento(String nascimentoStr) {
        if (nascimentoStr == null || nascimentoStr.isBlank()) {
            return null;
        }

        String valor = nascimentoStr.trim();

        /*
         * Primeiro tenta formato ISO: yyyy-MM-dd.
         * Depois tenta formato brasileiro: dd/MM/yyyy.
         */
        try {
            return LocalDate.parse(valor);
        } catch (DateTimeParseException ignored) {
            try {
                DateTimeFormatter fmt = DateTimeFormatter.ofPattern("dd/MM/yyyy");
                return LocalDate.parse(valor, fmt);
            } catch (DateTimeParseException ignoredAgain) {
                return null;
            }
        }
    }

    private boolean senhaEstaCriptografadaComBCrypt(String senhaSalva) {
        return senhaSalva != null &&
                (
                        senhaSalva.startsWith("$2a$") ||
                        senhaSalva.startsWith("$2b$") ||
                        senhaSalva.startsWith("$2y$")
                );
    }

    public static class UsuarioDTO {

        private String nome;
        private String nome_social;
        private String email;
        private String senha;
        private String nascimento;
        private String cpf;
        private String telefone;
        private String cep;
        private String logradouro;
        private String bairro;
        private String cidade;
        private String estado;
        private String complemento_endereco;
        private String numero_endereco;
        private String tipo_do_acesso;
        private String status;

        public String getNome() {
            return nome;
        }

        public void setNome(String nome) {
            this.nome = nome;
        }

        public String getNome_social() {
            return nome_social;
        }

        public void setNome_social(String nome_social) {
            this.nome_social = nome_social;
        }

        public String getEmail() {
            return email;
        }

        public void setEmail(String email) {
            this.email = email;
        }

        public String getSenha() {
            return senha;
        }

        public void setSenha(String senha) {
            this.senha = senha;
        }

        public String getNascimento() {
            return nascimento;
        }

        public void setNascimento(String nascimento) {
            this.nascimento = nascimento;
        }

        public String getCpf() {
            return cpf;
        }

        public void setCpf(String cpf) {
            this.cpf = cpf;
        }

        public String getTelefone() {
            return telefone;
        }

        public void setTelefone(String telefone) {
            this.telefone = telefone;
        }

        public String getCep() {
            return cep;
        }

        public void setCep(String cep) {
            this.cep = cep;
        }

        public String getLogradouro() {
            return logradouro;
        }

        public void setLogradouro(String logradouro) {
            this.logradouro = logradouro;
        }

        public String getBairro() {
            return bairro;
        }

        public void setBairro(String bairro) {
            this.bairro = bairro;
        }

        public String getCidade() {
            return cidade;
        }

        public void setCidade(String cidade) {
            this.cidade = cidade;
        }

        public String getEstado() {
            return estado;
        }

        public void setEstado(String estado) {
            this.estado = estado;
        }

        public String getComplemento_endereco() {
            return complemento_endereco;
        }

        public void setComplemento_endereco(String complemento_endereco) {
            this.complemento_endereco = complemento_endereco;
        }

        public String getNumero_endereco() {
            return numero_endereco;
        }

        public void setNumero_endereco(String numero_endereco) {
            this.numero_endereco = numero_endereco;
        }

        public String getTipo_do_acesso() {
            return tipo_do_acesso;
        }

        public void setTipo_do_acesso(String tipo_do_acesso) {
            this.tipo_do_acesso = tipo_do_acesso;
        }

        public String getStatus() {
            return status;
        }

        public void setStatus(String status) {
            this.status = status;
        }
    }
}