package com.clinicar.backend.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.web.util.HtmlUtils;
import org.springframework.web.util.UriComponentsBuilder;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

@Service
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${clinicar.mail.remetente}")
    private String remetente;

    @Value("${clinicar.app.public-url}")
    private String publicUrl;

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

    public void enviarAtivacaoAdministrador(
            String destinatario, String nomeUsuario, String token, LocalDateTime expiraEm
    ) throws MessagingException {
        String link = UriComponentsBuilder.fromUriString(publicUrl)
                .pathSegment("ativar-conta")
                .replaceQuery(null)
                .fragment(null)
                .queryParam("token", "{token}")
                .encode(StandardCharsets.UTF_8)
                .buildAndExpand(token)
                .toUriString();
        String validade = expiraEm.format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm"));
        String nome = tratarNome(nomeUsuario);
        String texto = "Olá, " + nome + ".\n\n"
                + "Você foi cadastrado como administrador inicial do CliniCar.\n"
                + "Para concluir o primeiro acesso e definir sua senha, acesse:\n" + link
                + "\n\nO link pode ser usado uma vez e expira em " + validade
                + " (horário do servidor CliniCar).\n"
                + "Se não solicitou este cadastro, ignore este e-mail.\nEquipe CliniCar";
        String html = "<h1>CliniCar</h1><p>Olá, " + HtmlUtils.htmlEscape(nome) + ".</p>"
                + "<p>Você foi cadastrado como administrador inicial. Conclua o primeiro acesso definindo sua senha.</p>"
                + "<p><a href=\"" + HtmlUtils.htmlEscape(link) + "\">Definir minha senha</a></p>"
                + "<p>Este link pode ser usado uma vez e expira em " + validade
                + " (horário do servidor CliniCar).</p>"
                + "<p>Se não solicitou este cadastro, ignore este e-mail.</p><p>Equipe CliniCar</p>";
        MimeMessage mensagem = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(mensagem, true, StandardCharsets.UTF_8.name());
        helper.setFrom(remetente);
        helper.setTo(destinatario);
        helper.setSubject("Ative sua conta de administrador - CliniCar");
        helper.setText(texto, html);
        mailSender.send(mensagem);
    }

    private String tratarNome(String nomeUsuario) {
        if (nomeUsuario == null || nomeUsuario.isBlank()) {
            return "usuário";
        }

        return nomeUsuario.trim();
    }
}