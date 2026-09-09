package com.clinicar.backend.service;

import com.clinicar.backend.dto.LoginResponse;
import com.clinicar.backend.dto.UsuarioResponse;
import com.clinicar.backend.event.UsuarioMfaResetadoEvent;
import com.clinicar.backend.mapper.UsuarioMapper;
import com.clinicar.backend.model.MfaChallenge;
import com.clinicar.backend.model.Usuario;
import com.clinicar.backend.repository.MfaChallengeRepository;
import com.clinicar.backend.repository.UsuarioRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import jakarta.persistence.PersistenceContext;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;

@Slf4j
@Service
public class MfaService {

    @PersistenceContext
    private EntityManager entityManager;

    // Somente rejeições esperadas de MFA preservam o contador e a invalidação do challenge.
    private static class FalhaValidacaoMfa extends IllegalArgumentException {
        private FalhaValidacaoMfa(String mensagem) {
            super(mensagem);
        }
    }

    private static final String TIPO_SETUP = "SETUP";
    private static final String TIPO_LOGIN = "LOGIN";
    private static final int MAX_TENTATIVAS = 5;

    private final UsuarioMapper usuarioMapper;
    private final MfaChallengeRepository challengeRepository;
    private final UsuarioRepository usuarioRepository;
    private final TotpService totpService;
    private final MfaCryptoService cryptoService;
    private final QrCodeService qrCodeService;
    private final ApplicationEventPublisher eventPublisher;

    @Value("${clinicar.mfa.issuer}")
    private String issuer;

    @Value("${clinicar.mfa.challenge-expiration-minutes}")
    private Integer minutosExpiracao;

    public MfaService(
            MfaChallengeRepository challengeRepository,
            UsuarioRepository usuarioRepository,
            TotpService totpService,
            MfaCryptoService cryptoService,
            QrCodeService qrCodeService,
            UsuarioMapper usuarioMapper,
            ApplicationEventPublisher eventPublisher) {
        this.challengeRepository = challengeRepository;
        this.usuarioRepository = usuarioRepository;
        this.totpService = totpService;
        this.cryptoService = cryptoService;
        this.qrCodeService = qrCodeService;
        this.usuarioMapper = usuarioMapper;
        this.eventPublisher = eventPublisher;
    }

    @Transactional
    public LoginResponse prepararSegundoFator(Usuario usuario) {
        if (usuario == null || usuario.getId() == null) {
            throw new IllegalArgumentException("Usuário inválido para MFA.");
        }

        invalidarChallengesAnteriores(usuario.getId());

        usuario = entityManager.find(Usuario.class, usuario.getId(), LockModeType.PESSIMISTIC_WRITE);
        if (usuario == null || !"ATIVO".equalsIgnoreCase(usuario.getStatus())) {
            throw new IllegalArgumentException("Não foi possível iniciar a autenticação.");
        }

        boolean mfaAtivo = Boolean.TRUE.equals(usuario.getMfaAtivo())
                && usuario.getMfaSecret() != null
                && !usuario.getMfaSecret().isBlank();

        if (Boolean.TRUE.equals(usuario.getMfaAtivo())
                && (!mfaAtivo || !"TOTP".equalsIgnoreCase(usuario.getMfaTipo()))) {
            throw new IllegalArgumentException("Não foi possível iniciar a autenticação.");
        }

        if (mfaAtivo) {
            return criarChallengeLogin(usuario);
        }

        return criarChallengeSetup(usuario);
    }

    @Transactional(noRollbackFor = FalhaValidacaoMfa.class)
    public UsuarioResponse validarMfa(String mfaToken, String codigo) {
        if (mfaToken == null || mfaToken.isBlank()) {
            throw new FalhaValidacaoMfa("Verificação MFA inválida ou expirada.");
        }

        String tokenHash = gerarHash(mfaToken);

        MfaChallenge challenge = challengeRepository
                .findByTokenHashAndUsadoFalse(tokenHash)
                .orElseThrow(() -> new FalhaValidacaoMfa("Verificação MFA inválida ou expirada."));

        if (!Boolean.FALSE.equals(challenge.getUsado())
                || challenge.getExpiraEm() == null
                || !challenge.getExpiraEm().isAfter(LocalDateTime.now())) {
            challenge.setUsado(true);
            challengeRepository.save(challenge);

            throw new FalhaValidacaoMfa("Verificação MFA inválida ou expirada.");
        }

        if (challenge.getTentativas() != null && challenge.getTentativas() >= MAX_TENTATIVAS) {
            challenge.setUsado(true);
            challengeRepository.save(challenge);

            throw new FalhaValidacaoMfa("Verificação MFA inválida ou expirada.");
        }

        Usuario usuario = challenge.getUsuarioId() == null ? null
                : entityManager.find(Usuario.class, challenge.getUsuarioId(), LockModeType.PESSIMISTIC_WRITE);
        if (usuario == null || !"ATIVO".equalsIgnoreCase(usuario.getStatus())
                || !challenge.getExpiraEm().isAfter(LocalDateTime.now())) {
            challenge.setUsado(true);
            challengeRepository.save(challenge);
            throw new FalhaValidacaoMfa("Verificação MFA inválida ou expirada.");
        }

        boolean mfaConfigurado = Boolean.TRUE.equals(usuario.getMfaAtivo())
                && "TOTP".equalsIgnoreCase(usuario.getMfaTipo())
                && usuario.getMfaSecret() != null && !usuario.getMfaSecret().isBlank();
        boolean setupValido = TIPO_SETUP.equals(challenge.getTipo())
                && !Boolean.TRUE.equals(usuario.getMfaAtivo())
                && challenge.getSecretTemporario() != null && !challenge.getSecretTemporario().isBlank();
        if (!(setupValido || (TIPO_LOGIN.equals(challenge.getTipo()) && mfaConfigurado))) {
            challenge.setUsado(true);
            challengeRepository.save(challenge);
            throw new FalhaValidacaoMfa("Verificação MFA inválida ou expirada.");
        }

        if (codigo == null || !codigo.matches("\\d{6}")) {
            registrarTentativaInvalida(challenge);
            throw new FalhaValidacaoMfa("Código inválido.");
        }

        boolean codigoValido;

        if (TIPO_SETUP.equals(challenge.getTipo())) {
            String secretBase32 = cryptoService.descriptografar(challenge.getSecretTemporario());

            codigoValido = totpService.validarCodigo(secretBase32, codigo);

            if (codigoValido) {
                usuario.setMfaAtivo(true);
                usuario.setMfaTipo("TOTP");
                usuario.setMfaSecret(challenge.getSecretTemporario());

                usuarioRepository.save(usuario);
            }

        } else if (TIPO_LOGIN.equals(challenge.getTipo())) {
            String secretBase32 = cryptoService.descriptografar(usuario.getMfaSecret());

            codigoValido = totpService.validarCodigo(secretBase32, codigo);

        } else {
            throw new FalhaValidacaoMfa("Verificação MFA inválida ou expirada.");
        }

        if (!codigoValido) {
            registrarTentativaInvalida(challenge);
            throw new FalhaValidacaoMfa("Código inválido.");
        }

        challenge.setUsado(true);
        challengeRepository.save(challenge);

        return usuarioMapper.toResponse(usuario);
    }

    private void registrarTentativaInvalida(MfaChallenge challenge) {
        int tentativas = challenge.getTentativas() == null ? 0 : Math.max(0, challenge.getTentativas());
        challenge.setTentativas(tentativas + 1);
        if (challenge.getTentativas() >= MAX_TENTATIVAS) {
            challenge.setUsado(true);
        }
        challengeRepository.save(challenge);
    }

    private LoginResponse criarChallengeLogin(Usuario usuario) {
        String tokenOriginal = gerarTokenSeguro();

        MfaChallenge challenge = new MfaChallenge();

        challenge.setUsuarioId(usuario.getId());
        challenge.setTokenHash(gerarHash(tokenOriginal));
        challenge.setTipo(TIPO_LOGIN);
        challenge.setUsado(false);
        challenge.setTentativas(0);
        challenge.setCriadoEm(LocalDateTime.now());
        challenge.setExpiraEm(LocalDateTime.now().plusMinutes(minutosExpiracao));

        challengeRepository.save(challenge);

        return LoginResponse.mfaLogin(tokenOriginal);
    }

    private LoginResponse criarChallengeSetup(Usuario usuario) {
        String secretBase32 = totpService.gerarSecretBase32();
        String secretCriptografado = cryptoService.criptografar(secretBase32);

        String tokenOriginal = gerarTokenSeguro();

        MfaChallenge challenge = new MfaChallenge();

        challenge.setUsuarioId(usuario.getId());
        challenge.setTokenHash(gerarHash(tokenOriginal));
        challenge.setTipo(TIPO_SETUP);
        challenge.setSecretTemporario(secretCriptografado);
        challenge.setUsado(false);
        challenge.setTentativas(0);
        challenge.setCriadoEm(LocalDateTime.now());
        challenge.setExpiraEm(LocalDateTime.now().plusMinutes(minutosExpiracao));

        challengeRepository.save(challenge);

        String otpauthUri = montarOtpAuthUri(usuario, secretBase32);
        String qrCodeDataUrl = qrCodeService.gerarQrCodeDataUrl(otpauthUri);

        return LoginResponse.mfaSetup(
                tokenOriginal,
                qrCodeDataUrl,
                secretBase32);
    }

    private String montarOtpAuthUri(Usuario usuario, String secretBase32) {
        String conta = usuario.getEmail() == null
                ? "usuario-" + usuario.getId()
                : usuario.getEmail();

        String label = issuer + ":" + conta;

        return "otpauth://totp/"
                + URLEncoder.encode(label, StandardCharsets.UTF_8)
                + "?secret=" + URLEncoder.encode(secretBase32, StandardCharsets.UTF_8)
                + "&issuer=" + URLEncoder.encode(issuer, StandardCharsets.UTF_8)
                + "&algorithm=SHA1"
                + "&digits=6"
                + "&period=30";
    }

    private void invalidarChallengesAnteriores(Long usuarioId) {
        challengeRepository.findByUsuarioIdAndUsadoFalse(usuarioId)
                .forEach(challenge -> {
                    challenge.setUsado(true);
                    challengeRepository.save(challenge);
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
                    valor.getBytes(StandardCharsets.UTF_8));

            return Base64.getUrlEncoder()
                    .withoutPadding()
                    .encodeToString(hash);

        } catch (Exception e) {
            throw new RuntimeException("Erro ao gerar hash MFA.", e);
        }
    }

    @Transactional
    public void resetarMfaUsuario(Long usuarioId) {
        log.info("MfaService.resetarMfaUsuario iniciado para usuário ID {}.", usuarioId);

        if (usuarioId == null) {
            throw new IllegalArgumentException("ID do usuário não informado.");
        }

        invalidarChallengesAnteriores(usuarioId);
        Usuario usuario = entityManager.find(Usuario.class, usuarioId, LockModeType.PESSIMISTIC_WRITE);
        if (usuario == null) {
            throw new IllegalArgumentException("Usuário não encontrado.");
        }

        usuario.setMfaAtivo(false);
        usuario.setMfaTipo(null);
        usuario.setMfaSecret(null);

        Usuario salvo = usuarioRepository.save(usuario);

        log.info(
                "MFA resetado para usuário ID {}. Publicando UsuarioMfaResetadoEvent.",
                salvo.getId());

        eventPublisher.publishEvent(
                new UsuarioMfaResetadoEvent(
                        salvo.getId(),
                        nomePreferencial(salvo),
                        salvo.getTelefone()));
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