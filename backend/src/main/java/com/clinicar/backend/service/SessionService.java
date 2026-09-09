package com.clinicar.backend.service;

import com.clinicar.backend.model.AuthSession;
import com.clinicar.backend.model.Usuario;
import com.clinicar.backend.repository.AuthSessionRepository;
import com.clinicar.backend.repository.UsuarioRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import jakarta.persistence.PersistenceContext;
import com.clinicar.backend.dto.UsuarioResponse;
import com.clinicar.backend.mapper.UsuarioMapper;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.Optional;

@Service
public class SessionService {

    @PersistenceContext
    private EntityManager entityManager;

    private final AuthSessionRepository authSessionRepository;
    private final UsuarioRepository usuarioRepository;
    private final UsuarioMapper usuarioMapper;
    @Value("${clinicar.session.cookie-name}")
    private String cookieName;

    @Value("${clinicar.session.expiration-hours}")
    private Long expirationHours;

    @Value("${clinicar.session.cookie-secure}")
    private Boolean cookieSecure;

    @Value("${clinicar.session.cookie-same-site}")
    private String cookieSameSite;

    public SessionService(
        AuthSessionRepository authSessionRepository,
        UsuarioRepository usuarioRepository,
        UsuarioMapper usuarioMapper
    ) {
        this.authSessionRepository = authSessionRepository;
        this.usuarioRepository = usuarioRepository;
        this.usuarioMapper = usuarioMapper;
    }

    @Transactional
    public ResponseCookie criarSessaoCookie(Long usuarioId) {
        if (usuarioId == null) {
            throw new IllegalArgumentException("ID do usuário inválido para criação de sessão.");
        }
        Usuario usuario = entityManager.find(Usuario.class, usuarioId, LockModeType.PESSIMISTIC_WRITE);
        if (usuario == null || !"ATIVO".equalsIgnoreCase(usuario.getStatus())
                || !Boolean.TRUE.equals(usuario.getMfaAtivo())
                || !"TOTP".equalsIgnoreCase(usuario.getMfaTipo())
                || usuario.getMfaSecret() == null || usuario.getMfaSecret().isBlank()) {
            throw new IllegalArgumentException("Não foi possível concluir a autenticação.");
        }
        String tokenOriginal = gerarTokenSeguro();
        String tokenHash = gerarHash(tokenOriginal);
        AuthSession session = new AuthSession();
        session.setUsuarioId(usuarioId);
        session.setTokenHash(tokenHash);
        session.setCriadoEm(LocalDateTime.now());
        session.setUltimoUsoEm(LocalDateTime.now());
        session.setExpiraEm(LocalDateTime.now().plusHours(expirationHours));
        session.setRevogado(false);
        authSessionRepository.save(session);
        return ResponseCookie
            .from(cookieName, tokenOriginal)
            .httpOnly(true)
            .secure(Boolean.TRUE.equals(cookieSecure))
            .sameSite(cookieSameSite)
            .path("/")
            .maxAge(Duration.ofHours(expirationHours))
            .build();
    }

    public ResponseCookie limparCookie() {
        return ResponseCookie
                .from(cookieName, "")
                .httpOnly(true)
                .secure(Boolean.TRUE.equals(cookieSecure))
                .sameSite(cookieSameSite)
                .path("/")
                .maxAge(Duration.ZERO)
                .build();
    }

    @Transactional
    public Optional<UsuarioResponse> validarSessao(String tokenOriginal) {
        if (tokenOriginal == null || tokenOriginal.isBlank()) {
            return Optional.empty();
        }

        String tokenHash = gerarHash(tokenOriginal);

        Optional<AuthSession> sessionOpt =
                authSessionRepository.findByTokenHashAndRevogadoFalse(tokenHash);

        if (sessionOpt.isEmpty()) {
            return Optional.empty();
        }

        AuthSession session = sessionOpt.get();

        if (!Boolean.FALSE.equals(session.getRevogado())
                || session.getExpiraEm() == null
                || !session.getExpiraEm().isAfter(LocalDateTime.now())
                || session.getUsuarioId() == null) {
            session.setRevogado(true);
            authSessionRepository.save(session);
            return Optional.empty();
        }

        Optional<Usuario> usuarioOpt = usuarioRepository.findById(session.getUsuarioId());

        if (usuarioOpt.isEmpty() || !"ATIVO".equalsIgnoreCase(usuarioOpt.get().getStatus())) {
            session.setRevogado(true);
            authSessionRepository.save(session);
            return Optional.empty();
        }

        session.setUltimoUsoEm(LocalDateTime.now());
        authSessionRepository.save(session);

        Usuario usuario = usuarioOpt.get();
        return Optional.of(usuarioMapper.toResponse(usuario));
    }

    @Transactional
    public void revogarSessao(String tokenOriginal) {
        if (tokenOriginal == null || tokenOriginal.isBlank()) {
            return;
        }

        String tokenHash = gerarHash(tokenOriginal);

        authSessionRepository
                .findByTokenHashAndRevogadoFalse(tokenHash)
                .ifPresent(session -> {
                    session.setRevogado(true);
                    authSessionRepository.save(session);
                });
    }

    private String gerarTokenSeguro() {
        byte[] bytes = new byte[32];
        new SecureRandom().nextBytes(bytes);

        return Base64.getUrlEncoder()
                .withoutPadding()
                .encodeToString(bytes);
    }

    private String gerarHash(String valor) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");

            byte[] hash = digest.digest(
                    valor.getBytes(StandardCharsets.UTF_8)
            );

            return Base64.getUrlEncoder()
                    .withoutPadding()
                    .encodeToString(hash);

        } catch (Exception e) {
            throw new RuntimeException("Erro ao gerar hash da sessão.", e);
        }
    }
}
