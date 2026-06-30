package com.clinicar.backend.service;

import com.clinicar.backend.model.PasswordResetToken;
import com.clinicar.backend.model.Usuario;
import com.clinicar.backend.repository.PasswordResetTokenRepository;
import com.clinicar.backend.repository.UsuarioRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.Optional;

@Service
public class RecuperacaoSenhaService {

    private final UsuarioRepository usuarioRepository;
    private final PasswordResetTokenRepository tokenRepository;
    private final EmailService emailService;
    private final PasswordEncoder passwordEncoder;

    @Value("${clinicar.frontend-url}")
    private String frontendUrl;

    private static final int MINUTOS_EXPIRACAO_TOKEN = 30;

    public RecuperacaoSenhaService(
            UsuarioRepository usuarioRepository,
            PasswordResetTokenRepository tokenRepository,
            EmailService emailService,
            PasswordEncoder passwordEncoder
    ) {
        this.usuarioRepository = usuarioRepository;
        this.tokenRepository = tokenRepository;
        this.emailService = emailService;
        this.passwordEncoder = passwordEncoder;
    }

    public void solicitarRedefinicaoSenha(String email) {
        if (email == null || email.isBlank()) {
            return;
        }

        Optional<Usuario> usuarioOpt = usuarioRepository.findByEmail(email.trim());

        /*
         * Importante:
         * Mesmo que o e-mail não exista, não retornamos erro.
         * Isso evita que alguém descubra quais e-mails estão cadastrados.
         */
        if (usuarioOpt.isEmpty()) {
            return;
        }

        Usuario usuario = usuarioOpt.get();

        invalidarTokensAnteriores(usuario.getId());

        String tokenOriginal = gerarTokenSeguro();
        String tokenHash = gerarHashToken(tokenOriginal);

        PasswordResetToken token = new PasswordResetToken();
        token.setUsuarioId(usuario.getId());
        token.setTokenHash(tokenHash);
        token.setExpiraEm(LocalDateTime.now().plusMinutes(MINUTOS_EXPIRACAO_TOKEN));
        token.setUsado(false);
        token.setCriadoEm(LocalDateTime.now());

        tokenRepository.save(token);

        String link = frontendUrl + "/redefinir-senha?token=" + tokenOriginal;

        emailService.enviarEmailRedefinicaoSenha(
                usuario.getEmail(),
                usuario.getNome(),
                link
        );
    }

    public void redefinirSenha(
            String tokenOriginal,
            String novaSenha,
            String confirmarSenha
    ) {
        if (tokenOriginal == null || tokenOriginal.isBlank()) {
            throw new IllegalArgumentException("Token não informado.");
        }

        if (novaSenha == null || novaSenha.isBlank()) {
            throw new IllegalArgumentException("Nova senha não informada.");
        }

        if (confirmarSenha == null || confirmarSenha.isBlank()) {
            throw new IllegalArgumentException("Confirmação de senha não informada.");
        }

        if (!novaSenha.equals(confirmarSenha)) {
            throw new IllegalArgumentException("A confirmação de senha não confere.");
        }

        validarForcaSenha(novaSenha);

        String tokenHash = gerarHashToken(tokenOriginal);

        PasswordResetToken token = tokenRepository
                .findByTokenHash(tokenHash)
                .orElseThrow(() -> new IllegalArgumentException("Token inválido ou expirado."));

        if (Boolean.TRUE.equals(token.getUsado())) {
            throw new IllegalArgumentException("Token já utilizado.");
        }

        if (token.getExpiraEm().isBefore(LocalDateTime.now())) {
            throw new IllegalArgumentException("Token expirado.");
        }

        Usuario usuario = usuarioRepository
                .findById(token.getUsuarioId())
                .orElseThrow(() -> new IllegalArgumentException("Usuário não encontrado."));

        usuario.setSenha(passwordEncoder.encode(novaSenha));
        usuarioRepository.save(usuario);

        token.setUsado(true);
        tokenRepository.save(token);
    }

    private void invalidarTokensAnteriores(Long usuarioId) {
        tokenRepository.findByUsuarioIdAndUsadoFalse(usuarioId)
                .forEach(token -> {
                    token.setUsado(true);
                    tokenRepository.save(token);
                });
    }

    private String gerarTokenSeguro() {
        byte[] bytes = new byte[32];
        new SecureRandom().nextBytes(bytes);

        return Base64.getUrlEncoder()
                .withoutPadding()
                .encodeToString(bytes);
    }

    private String gerarHashToken(String tokenOriginal) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");

            byte[] hash = digest.digest(
                    tokenOriginal.getBytes(StandardCharsets.UTF_8)
            );

            return Base64.getUrlEncoder()
                    .withoutPadding()
                    .encodeToString(hash);

        } catch (Exception e) {
            throw new RuntimeException("Erro ao gerar hash do token.", e);
        }
    }

    private void validarForcaSenha(String senha) {
        if (senha.length() < 8) {
            throw new IllegalArgumentException("A senha deve ter pelo menos 8 caracteres.");
        }

        boolean temLetra = senha.matches(".*[A-Za-zÀ-ÿ].*");
        boolean temNumero = senha.matches(".*\\d.*");

        if (!temLetra || !temNumero) {
            throw new IllegalArgumentException("A senha deve conter letras e números.");
        }
    }
}