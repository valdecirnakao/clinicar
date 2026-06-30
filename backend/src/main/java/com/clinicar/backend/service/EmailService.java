package com.clinicar.backend.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username}")
    private String remetente;

    public EmailService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    public void enviarEmailRedefinicaoSenha(
            String destinatario,
            String nomeUsuario,
            String link
    ) {
        SimpleMailMessage mensagem = new SimpleMailMessage();

        mensagem.setFrom(remetente);
        mensagem.setTo(destinatario);
        mensagem.setSubject("Redefinição de senha - CliniCar");

        mensagem.setText(
                "Olá, " + tratarNome(nomeUsuario) + ".\n\n" +
                "Recebemos uma solicitação para redefinir a senha da sua conta no CliniCar.\n\n" +
                "Para criar uma nova senha, acesse o link abaixo:\n\n" +
                link + "\n\n" +
                "Este link é temporário e poderá ser usado apenas uma vez.\n\n" +
                "Caso você não tenha solicitado esta alteração, ignore este e-mail.\n\n" +
                "Atenciosamente,\n" +
                "Equipe CliniCar"
        );

        mailSender.send(mensagem);
    }

    private String tratarNome(String nomeUsuario) {
        if (nomeUsuario == null || nomeUsuario.isBlank()) {
            return "usuário";
        }

        return nomeUsuario.trim();
    }
}