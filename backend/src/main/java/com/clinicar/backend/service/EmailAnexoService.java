package com.clinicar.backend.service;

import jakarta.mail.internet.MimeMessage;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

@Service
public class EmailAnexoService {

    private final JavaMailSender mailSender;

    @Value("${clinicar.email.from:}")
    private String remetenteConfigurado;

    @Value("${spring.mail.username:}")
    private String usuarioEmail;

    public EmailAnexoService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    public void enviarEmailComAnexo(
            String destinatario,
            String assunto,
            String corpo,
            String nomeArquivo,
            byte[] arquivo
    ) {
        try {
            MimeMessage mensagem = mailSender.createMimeMessage();

            MimeMessageHelper helper = new MimeMessageHelper(
                    mensagem,
                    true,
                    "UTF-8"
            );

            helper.setFrom(obterRemetente());
            helper.setTo(destinatario);
            helper.setSubject(assunto);
            helper.setText(corpo, false);

            helper.addAttachment(
                    nomeArquivo,
                    new ByteArrayResource(arquivo)
            );

            mailSender.send(mensagem);

        } catch (Exception e) {
            throw new IllegalStateException("Erro ao enviar e-mail com anexo.", e);
        }
    }

    private String obterRemetente() {
        if (remetenteConfigurado != null && !remetenteConfigurado.isBlank()) {
            return remetenteConfigurado;
        }

        if (usuarioEmail != null && !usuarioEmail.isBlank()) {
            return usuarioEmail;
        }

        throw new IllegalStateException("Remetente de e-mail não configurado.");
    }
}