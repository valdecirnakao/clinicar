package com.clinicar.backend.controller;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;

import com.clinicar.backend.model.Usuario;
import com.clinicar.backend.repository.UsuarioRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/usuario")
@CrossOrigin(origins = "http://localhost:4200") // Libera requisições do Angular
public class UsuarioController {
  
  private final UsuarioRepository usuarioRepository;

  public UsuarioController(UsuarioRepository usuarioRepository) {
    this.usuarioRepository = usuarioRepository;
  }

  @PostMapping
  public ResponseEntity<Usuario> criarUsuario(@RequestBody Usuario usuario) {
    Usuario salvo = usuarioRepository.save(usuario);
    return ResponseEntity.status(201).body(salvo);
  }

  @PostMapping("/login")
  public ResponseEntity<Object> login(@RequestBody Map<String, String> loginData) {
    String email = loginData.get("email");
    String senha = loginData.get("senha");

    Usuario usuario = usuarioRepository.findByEmailAndSenha(email, senha);

    if (usuario != null) {
      return ResponseEntity.ok(usuario);  
    }
    return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Email ou senha inválidos."  );
  }

  @GetMapping("/email/{email}")
  public ResponseEntity<Usuario> buscarPorEmail(@PathVariable String email) {
    Optional<Usuario> usuario = usuarioRepository.findByEmail(email);
    return usuario.map(ResponseEntity::ok).orElse(ResponseEntity.status(HttpStatus.NOT_FOUND).build());
  }

  @GetMapping
  public ResponseEntity<List<Usuario>> listarTodos() {
    List<Usuario> usuarios = usuarioRepository.findAll();
    return ResponseEntity.ok(usuarios);
  }

  @PutMapping("/{id}")
  public ResponseEntity<Usuario> atualizarUsuario(@PathVariable Long id, @RequestBody UsuarioDTO usuarioAtualizado) {
    Optional<Usuario> usuarioOptional = usuarioRepository.findById(id);
    if (usuarioOptional.isPresent()) {
        Usuario usuario = usuarioOptional.get();
        // Atualize todos os campos necessários
    usuario.setNome(usuarioAtualizado.getNome());
    usuario.setNome_social(usuarioAtualizado.getNome_social());
    usuario.setEmail(usuarioAtualizado.getEmail());
    usuario.setSenha(usuarioAtualizado.getSenha());
    // convert DTO string nascimento to LocalDate expected by Usuario
    String nascimentoStr = usuarioAtualizado.getNascimento();
    if (nascimentoStr != null && !nascimentoStr.isEmpty()) {
      try {
        usuario.setNascimento(LocalDate.parse(nascimentoStr));
      } catch (DateTimeParseException ex) {
        usuario.setNascimento(null);
      }
    } else {
      usuario.setNascimento(null);
    }
    usuario.setCpf(usuarioAtualizado.getCpf());
    usuario.setTelefone(usuarioAtualizado.getTelefone());
    usuario.setWhatsappapikey(usuarioAtualizado.getWhatsappapikey());
    usuario.setCep(usuarioAtualizado.getCep());
    usuario.setLogradouro(usuarioAtualizado.getLogradouro());
    usuario.setBairro(usuarioAtualizado.getBairro());
    usuario.setCidade(usuarioAtualizado.getCidade());
    usuario.setEstado(usuarioAtualizado.getEstado());
    usuario.setComplemento_endereco(usuarioAtualizado.getComplemento_endereco());
    usuario.setNumero_endereco(usuarioAtualizado.getNumero_endereco());
    usuario.setTipo_do_acesso(usuarioAtualizado.getTipo_do_acesso());
        usuarioRepository.save(usuario);
        return ResponseEntity.ok(usuario);
    } else {
        return ResponseEntity.notFound().build();
    }
}

  // Simple DTO for updates (not a persistent entity)
  public static class UsuarioDTO {
    private String nome;
    private String nome_social;
    private String email;
    private String senha;
    private String nascimento;
    private String cpf;
    private String telefone;
    private String whatsappapikey;
    private String cep;
    private String logradouro;
    private String bairro;
    private String cidade;
    private String estado;
    private String complemento_endereco;
    private String numero_endereco;
    private String tipo_do_acesso;

    // getters and setters
    public String getNome() { return nome; }
    public void setNome(String nome) { this.nome = nome; }
    public String getNome_social() { return nome_social; }
    public void setNome_social(String nome_social) { this.nome_social = nome_social; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getSenha() { return senha; }
    public void setSenha(String senha) { this.senha = senha; }
    public String getNascimento() { return nascimento; }
    public void setNascimento(String nascimento) { this.nascimento = nascimento; }
    public String getCpf() { return cpf; }
    public void setCpf(String cpf) { this.cpf = cpf; }
    public String getTelefone() { return telefone; }
    public void setTelefone(String telefone) { this.telefone = telefone; }
    public String getWhatsappapikey() { return whatsappapikey; }
    public void setWhatsappapikey(String whatsappapikey) { this.whatsappapikey = whatsappapikey; }
    public String getCep() { return cep; }
    public void setCep(String cep) { this.cep = cep; }
    public String getLogradouro() { return logradouro; }
    public void setLogradouro(String logradouro) { this.logradouro = logradouro; }
    public String getBairro() { return bairro; }
    public void setBairro(String bairro) { this.bairro = bairro; }
    public String getCidade() { return cidade; }
    public void setCidade(String cidade) { this.cidade = cidade; }
    public String getEstado() { return estado; }
    public void setEstado(String estado) { this.estado = estado; }
    public String getComplemento_endereco() { return complemento_endereco; }
    public void setComplemento_endereco(String complemento_endereco) { this.complemento_endereco = complemento_endereco; }
    public String getNumero_endereco() { return numero_endereco; }
    public void setNumero_endereco(String numero_endereco) { this.numero_endereco = numero_endereco; }
    public String getTipo_do_acesso() { return tipo_do_acesso; }
    public void setTipo_do_acesso(String tipo_do_acesso) { this.tipo_do_acesso = tipo_do_acesso; }
  }

@DeleteMapping("/{id}")
public ResponseEntity<Void> removerUsuario(@PathVariable Long id) {
    if (!usuarioRepository.existsById(id)) {
        return ResponseEntity.notFound().build();
    }
    usuarioRepository.deleteById(id);
    return ResponseEntity.noContent().build();
}

}
