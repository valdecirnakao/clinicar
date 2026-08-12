package com.clinicar.backend.service;
import com.clinicar.backend.event.UsuarioAtualizadoEvent;
import com.clinicar.backend.event.UsuarioInativadoEvent;
import com.clinicar.backend.dto.UsuarioRequest;
import com.clinicar.backend.dto.UsuarioResponse;
import com.clinicar.backend.event.UsuarioAtualizadoEvent;
import com.clinicar.backend.event.UsuarioInativadoEvent;
import com.clinicar.backend.model.Usuario;
import com.clinicar.backend.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.Objects;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class UsuarioService {

    private final UsuarioRepository repo;
    private final PasswordEncoder passwordEncoder;
    private final WhatsAppService whatsAppService;
    private final ApplicationEventPublisher eventPublisher;

    @Transactional
    public UsuarioResponse criar(UsuarioRequest request) {
        String emailNormalizado = normalizarEmail(request.getEmail());

        validarEmailUnico(emailNormalizado, null);

        Usuario usuario = new Usuario();

        preencherDadosUsuario(usuario, request, emailNormalizado);

        if (request.getSenha() != null && !request.getSenha().isBlank()) {
            usuario.setSenha(passwordEncoder.encode(request.getSenha()));
        } else {
            throw new IllegalArgumentException("Informe a senha do usuário.");
        }

        Usuario salvo = repo.save(usuario);

        return toResponse(salvo);
    }

    @Transactional
    public UsuarioResponse atualizar(Long id, UsuarioRequest request) {
        log.info("UsuarioService.atualizar iniciado para usuário ID {}.", id);

        Usuario usuario = repo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Usuário não encontrado."));

        String emailNormalizado = normalizarEmail(request.getEmail());

        validarEmailUnico(emailNormalizado, id);

        String assinaturaAntes = assinaturaDadosUsuario(usuario);
        boolean estavaInativo = statusInativo(usuario.getStatus());

        log.info("Usuário ID {} antes da atualização: {}", id, assinaturaAntes);

        preencherDadosUsuario(usuario, request, emailNormalizado);

        /*
         * Só altera a senha se uma nova senha for informada.
         * Se vier null ou vazia, mantém a senha atual.
         */
        if (request.getSenha() != null && !request.getSenha().isBlank()) {
            usuario.setSenha(passwordEncoder.encode(request.getSenha()));
        }

        String assinaturaDepois = assinaturaDadosUsuario(usuario);

        boolean houveAlteracao = !Objects.equals(assinaturaAntes, assinaturaDepois);

        boolean ficouInativo = statusInativo(usuario.getStatus());
        boolean acabouDeSerInativado = !estavaInativo && ficouInativo;

        log.info("Usuário ID {} depois da atualização: {}", id, assinaturaDepois);

        log.info(
                "Resultado da atualização do usuário ID {}: houveAlteracao={}, acabouDeSerInativado={}, telefone={}",
                id,
                houveAlteracao,
                acabouDeSerInativado,
                usuario.getTelefone()
        );

        Usuario salvo = repo.save(usuario);

        /*
         * Regra de precedência:
         *
         * 1. Se o usuário acabou de ser inativado, envia somente o alerta de inativação.
         * 2. Se foi uma atualização comum, envia o alerta de atualização cadastral.
         * 3. Se não houve alteração real, não envia nada.
         */
        if (acabouDeSerInativado) {
            log.info("Publicando UsuarioInativadoEvent para usuário {}.", salvo.getId());

            eventPublisher.publishEvent(
                    new UsuarioInativadoEvent(
                            salvo.getId(),
                            nomePreferencial(salvo),
                            salvo.getTelefone()
                    )
            );

        } else if (houveAlteracao) {
            log.info("Publicando UsuarioAtualizadoEvent para usuário {}.", salvo.getId());

            eventPublisher.publishEvent(
                    new UsuarioAtualizadoEvent(
                            salvo.getId(),
                            nomePreferencial(salvo),
                            salvo.getTelefone()
                    )
            );

        } else {
            log.info("Nenhuma alteração cadastral detectada para usuário {}.", salvo.getId());
        }

        return toResponse(salvo);
    }

    @Transactional
    public Optional<Usuario> autenticar(String email, String senhaDigitada) {
        if (email == null || email.isBlank() || senhaDigitada == null || senhaDigitada.isBlank()) {
            return Optional.empty();
        }

        String emailNormalizado = normalizarEmail(email);

        Optional<Usuario> usuarioOpt = repo.findByEmailIgnoreCase(emailNormalizado);

        if (usuarioOpt.isEmpty()) {
            return Optional.empty();
        }

        Usuario usuario = usuarioOpt.get();
        String senhaSalva = usuario.getSenha();

        boolean senhaValida;

        if (senhaEstaCriptografadaComBCrypt(senhaSalva)) {
            senhaValida = passwordEncoder.matches(senhaDigitada, senhaSalva);
        } else {
            /*
             * Compatibilidade temporária com usuários antigos
             * que ainda estão com senha em texto puro no banco.
             */
            senhaValida = senhaDigitada.equals(senhaSalva);

            /*
             * Se a senha antiga em texto puro estiver correta,
             * converte automaticamente para BCrypt.
             */
            if (senhaValida) {
                usuario.setSenha(passwordEncoder.encode(senhaDigitada));
                repo.save(usuario);
            }
        }

        if (!senhaValida) {
            return Optional.empty();
        }

        return Optional.of(usuario);
    }

    private void preencherDadosUsuario(
            Usuario usuario,
            UsuarioRequest request,
            String emailNormalizado
    ) {
        usuario.setCpf(soDigitos(request.getCpf()));
        usuario.setNome(limparTexto(request.getNome()));
        usuario.setNome_social(limparTexto(request.getNome_social()));
        usuario.setTelefone(soDigitos(request.getTelefone()));
        usuario.setEmail(emailNormalizado);
        usuario.setCep(soDigitos(request.getCep()));
        usuario.setLogradouro(limparTexto(request.getLogradouro()));
        usuario.setBairro(limparTexto(request.getBairro()));
        usuario.setCidade(limparTexto(request.getCidade()));
        usuario.setEstado(normalizarEstado(request.getEstado()));
        usuario.setComplemento_endereco(limparTexto(request.getComplemento_endereco()));
        usuario.setNumero_endereco(limparTexto(request.getNumero_endereco()));
        usuario.setTipo_do_acesso(normalizarTipoAcesso(request.getTipo_do_acesso()));
        usuario.setStatus(normalizarStatus(request.getStatus()));
        usuario.setNascimento(parseNascimento(request.getNascimento()));
    }

    private UsuarioResponse toResponse(Usuario salvo) {
        UsuarioResponse resp = new UsuarioResponse();

        resp.setId(salvo.getId());
        resp.setCpf(salvo.getCpf());
        resp.setNome(salvo.getNome());
        resp.setNome_social(salvo.getNome_social());
        resp.setTelefone(salvo.getTelefone());
        resp.setEmail(salvo.getEmail());
        resp.setCep(salvo.getCep());
        resp.setLogradouro(salvo.getLogradouro());
        resp.setBairro(salvo.getBairro());
        resp.setCidade(salvo.getCidade());
        resp.setEstado(salvo.getEstado());
        resp.setComplemento_endereco(salvo.getComplemento_endereco());
        resp.setNumero_endereco(salvo.getNumero_endereco());
        resp.setTipo_do_acesso(salvo.getTipo_do_acesso());
        resp.setStatus(salvo.getStatus());
        resp.setNascimento(salvo.getNascimento());

        return resp;
    }

    private void validarEmailUnico(String email, Long usuarioIdIgnorado) {
        String emailNormalizado = normalizarEmail(email);

        if (emailNormalizado == null || emailNormalizado.isBlank()) {
            throw new IllegalArgumentException("Informe o e-mail do usuário.");
        }

        boolean emailJaExiste;

        if (usuarioIdIgnorado == null) {
            emailJaExiste = repo.existsByEmailIgnoreCase(emailNormalizado);
        } else {
            emailJaExiste = repo.existsByEmailIgnoreCaseAndIdNot(
                    emailNormalizado,
                    usuarioIdIgnorado
            );
        }

        if (emailJaExiste) {
            throw new IllegalArgumentException("Já existe um usuário cadastrado com este e-mail.");
        }
    }

    private LocalDate parseNascimento(String nascimento) {
        if (nascimento == null || nascimento.isBlank()) {
            return null;
        }

        String valor = nascimento.trim();

        /*
         * Aceita formato vindo de input type="date" do Angular:
         * yyyy-MM-dd
         */
        try {
            return LocalDate.parse(valor);
        } catch (DateTimeParseException ignored) {
            // tenta o próximo formato
        }

        /*
         * Aceita formato brasileiro:
         * dd/MM/yyyy
         */
        try {
            DateTimeFormatter fmt = DateTimeFormatter.ofPattern("dd/MM/yyyy");
            return LocalDate.parse(valor, fmt);
        } catch (DateTimeParseException ignored) {
            return null;
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

    private String soDigitos(String valor) {
        return valor == null ? null : valor.replaceAll("\\D", "");
    }

    private String normalizarEmail(String email) {
        if (email == null) {
            return null;
        }

        return email.trim().toLowerCase();
    }

    private String limparTexto(String valor) {
        if (valor == null) {
            return null;
        }

        return valor.trim();
    }

    private String normalizarEstado(String estado) {
        if (estado == null) {
            return null;
        }

        return estado.trim().toUpperCase();
    }

    private String normalizarTipoAcesso(String tipoAcesso) {
        if (tipoAcesso == null || tipoAcesso.isBlank()) {
            return "CLIENTE";
        }

        return tipoAcesso.trim().toUpperCase();
    }

    private String normalizarStatus(String status) {
        if (status == null || status.isBlank()) {
            return "ATIVO";
        }

        return status.trim().toUpperCase();
    }

    private String assinaturaDadosUsuario(Usuario usuario) {
        return String.join(
                "|",
                valorSeguro(usuario.getCpf()),
                valorSeguro(usuario.getNome()),
                valorSeguro(usuario.getNome_social()),
                valorSeguro(usuario.getTelefone()),
                valorSeguro(usuario.getEmail()),
                valorSeguro(usuario.getNascimento()),
                valorSeguro(usuario.getCep()),
                valorSeguro(usuario.getLogradouro()),
                valorSeguro(usuario.getNumero_endereco()),
                valorSeguro(usuario.getComplemento_endereco()),
                valorSeguro(usuario.getBairro()),
                valorSeguro(usuario.getCidade()),
                valorSeguro(usuario.getEstado()),
                valorSeguro(usuario.getTipo_do_acesso()),
                valorSeguro(usuario.getStatus())
        );
    }

    private String valorSeguro(Object valor) {
        return valor == null ? "" : String.valueOf(valor).trim();
    }

    private boolean statusInativo(String status) {
        return status != null && status.trim().equalsIgnoreCase("INATIVO");
    }

    private String nomePreferencial(Usuario usuario) {
        if (usuario.getNome_social() != null && !usuario.getNome_social().isBlank()) {
            return usuario.getNome_social().trim();
        }

        if (usuario.getNome() != null && !usuario.getNome().isBlank()) {
            return usuario.getNome().trim();
        }

        return "usuário";
    }
}