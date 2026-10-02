package com.clinicar.backend.service;

import com.clinicar.backend.dto.UsuarioRequest;
import com.clinicar.backend.dto.UsuarioResponse;
import com.clinicar.backend.event.UsuarioAtivadoEvent;
import com.clinicar.backend.event.UsuarioCadastradoEvent;
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
    private final ApplicationEventPublisher eventPublisher;
    private final ProtecaoAdministrativaService protecaoAdministrativa;
    private final com.clinicar.backend.repository.AuthSessionRepository sessoes;
    private final com.clinicar.backend.repository.SolicitacaoAcessoUsuarioRepository solicitacoesAcesso;

    @Transactional
    public UsuarioResponse criar(UsuarioRequest request) {
        return criarComPerfil(request, "CLIENTE", "ATIVO");
    }

    @Transactional
    public UsuarioResponse criarPorAdministrador(UsuarioRequest request) {
        String tipoAcesso = normalizarTipoAcesso(request.getTipo_do_acesso());
        String status = normalizarStatus(request.getStatus());

        if (!java.util.Set.of("CLIENTE", "COLABORADOR", "ADMINISTRADOR").contains(tipoAcesso)) {
            throw new IllegalArgumentException("Tipo de acesso inválido.");
        }
        if (!java.util.Set.of("ATIVO", "INATIVO").contains(status)) {
            throw new IllegalArgumentException("Status de usuário inválido.");
        }

        return criarComPerfil(request, tipoAcesso, status);
    }

    private UsuarioResponse criarComPerfil(UsuarioRequest request, String tipoAcesso, String status) {
        String emailNormalizado = normalizarEmail(request.getEmail());

        validarEmailUnico(emailNormalizado, null);
        validarCpfUnico(request.getCpf(), null);

        Usuario usuario = new Usuario();

        preencherDadosUsuario(usuario, request, emailNormalizado);

        usuario.setTipo_do_acesso(tipoAcesso);
        usuario.setStatus(status);
        usuario.setMfaAtivo(false);
        usuario.setMfaTipo(null);
        usuario.setMfaSecret(null);

        if (request.getSenha() != null && !request.getSenha().isBlank()) {
            usuario.setSenha(passwordEncoder.encode(request.getSenha()));
        } else {
            throw new IllegalArgumentException("Informe a senha do usuário.");
        }

        Usuario salvo = repo.saveAndFlush(usuario);

        eventPublisher.publishEvent(new UsuarioCadastradoEvent(
                salvo.getId(), nomePreferencial(salvo), salvo.getTelefone()));

        return toResponse(salvo);
    }

    @Transactional
    public UsuarioResponse atualizarProprio(Long id, UsuarioRequest request) {
        if (request.getStatus() != null || request.getTipo_do_acesso() != null) {
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.FORBIDDEN,
                    "Somente um administrador pode alterar o status ou o tipo de acesso da sua conta.");
        }
        return atualizarComPermissoes(id, request, false, null, java.util.List.of());
    }

    @Transactional
    public void inativarPorAdministrador(Long id, Long administradorId) {
        var administradores = protecaoAdministrativa.bloquearEValidarAdministrador(administradorId);
        var usuario = repo.buscarParaAtualizacao(id).orElseThrow(() -> new IllegalArgumentException("Usuário não encontrado."));
        protecaoAdministrativa.validarAlteracao(usuario, "INATIVO", usuario.getTipo_do_acesso(), administradorId, administradores);
        interromperPeriodo(id);
        boolean mudou = !statusInativo(usuario.getStatus());
        usuario.setStatus("INATIVO"); repo.saveAndFlush(usuario);
        sessoes.revogarTodasDoUsuario(id);
        if (mudou) eventPublisher.publishEvent(new UsuarioInativadoEvent(id, nomePreferencial(usuario), usuario.getTelefone()));
    }

    @Transactional
    public UsuarioResponse atualizarPorAdministrador(Long id, UsuarioRequest request, Long administradorId) {
        var administradores = protecaoAdministrativa.bloquearEValidarAdministrador(administradorId);
        return atualizarComPermissoes(id, request, true, administradorId, administradores);
    }

    private void interromperPeriodo(Long id) {
        for (var pedido : solicitacoesAcesso.findByUsuarioIdAndSituacaoPeriodoIn(id, java.util.List.of("AGENDADA", "EM_CURSO"))) {
            pedido.setSituacaoPeriodo("INTERROMPIDA"); pedido.setInterrompidoEm(java.time.Instant.now());
            solicitacoesAcesso.save(pedido);
        }
    }

    private UsuarioResponse atualizarComPermissoes(Long id, UsuarioRequest request, boolean administrador,
            Long administradorId, java.util.List<Usuario> administradores) {
        log.info("UsuarioService.atualizar iniciado para usuário ID {}.", id);

        Usuario usuario = (administrador ? repo.buscarParaAtualizacao(id) : repo.findById(id))
                .orElseThrow(() -> new IllegalArgumentException("Usuário não encontrado."));

        String emailNormalizado = administrador
                ? normalizarEmail(request.getEmail()) : usuario.getEmail();

        validarEmailUnico(emailNormalizado, id);
        if (administrador) validarCpfUnico(request.getCpf(), id);

        String assinaturaAntes = assinaturaDadosUsuario(usuario);
        boolean estavaInativo = statusInativo(usuario.getStatus());

        log.info("Usuário ID {} antes da atualização: {}", id, assinaturaAntes);

        if (administrador) {
            String tipoAcesso = request.getTipo_do_acesso() == null
                    ? normalizarTipoAcesso(usuario.getTipo_do_acesso()) : normalizarTipoAcesso(request.getTipo_do_acesso());
            String status = request.getStatus() == null
                    ? usuario.getStatus() : normalizarStatus(request.getStatus());
            if (!java.util.Set.of("CLIENTE", "COLABORADOR", "ADMINISTRADOR").contains(tipoAcesso)) {
                throw new IllegalArgumentException("Tipo de acesso inválido.");
            }
            if (request.getStatus() != null && !java.util.Set.of("ATIVO", "INATIVO").contains(status)) {
                throw new IllegalArgumentException("Status de usuário inválido.");
            }
            protecaoAdministrativa.validarAlteracao(usuario, status, tipoAcesso, administradorId, administradores);
            if (request.getStatus() != null || !Objects.equals(tipoAcesso, usuario.getTipo_do_acesso())) interromperPeriodo(id);
            preencherDadosUsuario(usuario, request, emailNormalizado);
            usuario.setTipo_do_acesso(tipoAcesso);
            usuario.setStatus(status);
        } else {
            preencherPerfilProprio(usuario, request);
        }

        /*
         * Só o administrador altera a senha aqui, se uma nova senha for informada.
         * Se vier null ou vazia, mantém a senha atual.
         */
        if (administrador && request.getSenha() != null && !request.getSenha().isBlank()) {
            usuario.setSenha(passwordEncoder.encode(request.getSenha()));
        }

        String assinaturaDepois = assinaturaDadosUsuario(usuario);

        boolean houveAlteracao = !Objects.equals(assinaturaAntes, assinaturaDepois);

        boolean ficouInativo = statusInativo(usuario.getStatus());
        boolean acabouDeSerInativado = !estavaInativo && ficouInativo;
        boolean foiReativado = estavaInativo && !ficouInativo;

        log.info("Usuário ID {} depois da atualização: {}", id, assinaturaDepois);

        log.info(
                "Resultado da atualização do usuário ID {}: houveAlteracao={}, acabouDeSerInativado={}, foiReativado={}, telefone={}",
                id,
                houveAlteracao,
                acabouDeSerInativado,
                foiReativado,
                usuario.getTelefone()
        );

        Usuario salvo = repo.saveAndFlush(usuario);

        /*
         * Regra de prioridade:
         *
         * 1. ATIVO -> INATIVO: envia alerta_inativa_usuario.
         * 2. INATIVO -> ATIVO: envia alerta_ativa_usuario.
         * 3. Outras alterações: envia alerta_atualiza_usuario.
         */
        if (ficouInativo) sessoes.revogarTodasDoUsuario(id);

        if (acabouDeSerInativado) {
            log.info("Publicando UsuarioInativadoEvent para usuário {}.", salvo.getId());

            eventPublisher.publishEvent(
                    new UsuarioInativadoEvent(
                            salvo.getId(),
                            nomePreferencial(salvo),
                            salvo.getTelefone()
                    )
            );

        } else if (foiReativado) {
            log.info("Publicando UsuarioAtivadoEvent para usuário {}.", salvo.getId());

            eventPublisher.publishEvent(
                    new UsuarioAtivadoEvent(
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

        if (!"ATIVO".equalsIgnoreCase(usuario.getStatus())
                || senhaSalva == null || senhaSalva.isBlank()) {
            return Optional.empty();
        }

        if (!passwordEncoder.matches(senhaDigitada, senhaSalva)) {
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
        usuario.setNascimento(parseNascimento(request.getNascimento()));
    }

    private void preencherPerfilProprio(Usuario usuario, UsuarioRequest request) {
        // Campos omitidos são preservados. Identificadores, senha, perfil, status e MFA não são copiados.
        if (request.getNome() != null) usuario.setNome(limparTexto(request.getNome()));
        if (request.getNome_social() != null) usuario.setNome_social(limparTexto(request.getNome_social()));
        if (request.getTelefone() != null) usuario.setTelefone(soDigitos(request.getTelefone()));
        if (request.getNascimento() != null) usuario.setNascimento(parseNascimento(request.getNascimento()));
        if (request.getCep() != null) usuario.setCep(soDigitos(request.getCep()));
        if (request.getLogradouro() != null) usuario.setLogradouro(limparTexto(request.getLogradouro()));
        if (request.getBairro() != null) usuario.setBairro(limparTexto(request.getBairro()));
        if (request.getCidade() != null) usuario.setCidade(limparTexto(request.getCidade()));
        if (request.getEstado() != null) usuario.setEstado(normalizarEstado(request.getEstado()));
        if (request.getComplemento_endereco() != null) usuario.setComplemento_endereco(limparTexto(request.getComplemento_endereco()));
        if (request.getNumero_endereco() != null) usuario.setNumero_endereco(limparTexto(request.getNumero_endereco()));
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
        resp.setCriadoEm(salvo.getCriadoEm());
        resp.setAtualizadoEm(salvo.getAtualizadoEm());
        return resp;
    }

    @Transactional(readOnly = true)
    public boolean emailCadastrado(String email) {
        String normalizado = normalizarEmail(email);
        if (normalizado == null || normalizado.length() > 255
                || !normalizado.matches("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$")) {
            throw new IllegalArgumentException("Informe um e-mail válido.");
        }
        return repo.existsByEmailIgnoreCase(normalizado);
    }

    @Transactional(readOnly = true)
    public boolean cpfCadastrado(String cpf) {
        String documento = soDigitos(cpf);
        if (documento == null || (documento.length() != 11 && documento.length() != 14)) {
            throw new IllegalArgumentException("Informe um CPF com 11 dígitos ou CNPJ com 14 dígitos.");
        }
        return repo.existsByCpf(documento);
    }

    private void validarCpfUnico(String cpf, Long idIgnorado) {
        String documento = soDigitos(cpf);
        if (documento == null || documento.isBlank()) return;
        boolean existe = idIgnorado == null ? repo.existsByCpf(documento)
                : repo.existsByCpfAndIdNot(documento, idIgnorado);
        if (existe) throw new IllegalArgumentException(documento.length() == 14
                ? "CNPJ já cadastrado anteriormente." : "CPF já cadastrado anteriormente.");
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
            throw new IllegalArgumentException("E-mail já cadastrado anteriormente.");
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

    private String soDigitos(String valor) {
        return valor == null ? null : valor.replaceAll("\\D", "");
    }

    private String normalizarEmail(String email) {
        if (email == null) {
            return null;
        }

        return email.trim().toLowerCase(java.util.Locale.ROOT);
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
