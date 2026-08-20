package com.clinicar.backend.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
public class WhatsAppService {

    @Value("${whatsapp.api-url}")
    private String apiUrl;

    @Value("${whatsapp.phone-number-id}")
    private String phoneNumberId;

    @Value("${whatsapp.access-token}")
    private String accessToken;

    @Value("${whatsapp.template-name}")
    private String templateName;

    @Value("${whatsapp.template-cadastro-veiculo-name}")
    private String templateCadastroVeiculoName;

    @Value("${whatsapp.template-language}")
    private String templateLanguage;

    @Value("${meta.whatsapp.templates.alerta-atualiza-usuario}")
    private String templateAlertaAtualizaUsuario;

    @Value("${meta.whatsapp.templates.alerta-redefine-2fa}")
    private String templateAlertaRedefine2fa;

    @Value("${meta.whatsapp.templates.alerta-inativa-usuario}")
    private String templateAlertaInativaUsuario;

    @Value("${meta.whatsapp.templates.alerta-ativa-usuario}")
    private String templateAlertaAtivaUsuario;

    @Value("${meta.whatsapp.templates.alerta-atualiza-veiculo}")
    private String templateAlertaAtualizaVeiculo;

    public String enviarMensagemTemplate(String telefoneDestino) {
        return enviarTemplateComParametros(
                telefoneDestino,
                templateName,
                templateLanguage,
                List.of()
        );
    }

    public String enviarMensagemCadastroUsuario(
            String telefoneDestino,
            String nomeUsuario
    ) {
        return enviarTemplateComParametros(
                telefoneDestino,
                templateName,
                templateLanguage,
                List.of(nomeNotificacao(nomeUsuario))
        );
    }

public String enviarMensagemCadastroVeiculo(
        String telefoneDestino,
        String nomeUsuario,
        String veiculoFabricante,
        String veiculoModelo,
        String veiculoPlaca
) {
    String nome = nomeNotificacao(nomeUsuario);
    String fabricante = valorSeguro(veiculoFabricante, "");
    String modelo = valorSeguro(veiculoModelo, "");
    String placa = veiculoPlaca;
    String descricaoVeiculo = (fabricante + " " + modelo).trim();

    if (descricaoVeiculo.isBlank()) {
        descricaoVeiculo = "Veículo";
    }

    if (placa != null && !placa.isBlank()) {
        descricaoVeiculo += " - Placa " + placa.substring(0, 3) + "-" + placa.substring(3);
    }

    log.info(
            "WhatsAppService cadastro veículo - {{1}}={}, {{2}}={}",
            nome,
            descricaoVeiculo
    );

    return enviarTemplateComParametros(
            telefoneDestino,
            templateCadastroVeiculoName,
            templateLanguage,
            List.of(
                    nome,
                    descricaoVeiculo
            )
    );
}

    public void enviarAlertaAtualizacaoUsuario(
            String telefone,
            String nome
    ) {
        enviarTemplate(
                telefone,
                templateAlertaAtualizaUsuario,
                List.of(nomeNotificacao(nome))
        );
    }

    public void enviarAlertaRedefinicao2fa(
            String telefone,
            String nome
    ) {
        enviarTemplate(
                telefone,
                templateAlertaRedefine2fa,
                List.of(nomeNotificacao(nome))
        );
    }

    public void enviarAlertaInativacaoUsuario(
            String telefone,
            String nome
    ) {
        enviarTemplate(
                telefone,
                templateAlertaInativaUsuario,
                List.of(nomeNotificacao(nome))
        );
    }

    public void enviarAlertaAtivacaoUsuario(
            String telefone,
            String nome
    ) {
        enviarTemplate(
                telefone,
                templateAlertaAtivaUsuario,
                List.of(nomeNotificacao(nome))
        );
    }

    public void enviarAlertaAtualizacaoVeiculo(
            String telefone,
            String nome,
            String veiculo
    ) {
        String nomeFormatado = nomeNotificacao(nome);
        String descricaoVeiculo = valorSeguro(veiculo, "Veículo");

        log.info(
                "WhatsAppService atualização veículo - {{1}}={}, {{2}}={}",
                nomeFormatado,
                descricaoVeiculo
        );

        enviarTemplate(
                telefone,
                templateAlertaAtualizaVeiculo,
                List.of(
                        nomeFormatado,
                        descricaoVeiculo
                )
        );
    }

    private String enviarTemplate(
            String telefoneDestino,
            String nomeTemplate,
            List<String> parametrosBody
    ) {
        return enviarTemplateComParametros(
                telefoneDestino,
                nomeTemplate,
                templateLanguage,
                parametrosBody
        );
    }

    private String enviarTemplateComParametros(
            String telefoneDestino,
            String nomeTemplate,
            String codigoIdioma,
            List<String> parametrosBody
    ) {
        if (nomeTemplate == null || nomeTemplate.isBlank()) {
            throw new IllegalArgumentException("Nome do template WhatsApp não configurado.");
        }

        if (codigoIdioma == null || codigoIdioma.isBlank()) {
            throw new IllegalArgumentException("Código de idioma do template WhatsApp não configurado.");
        }

        String url = apiUrl + "/" + phoneNumberId + "/messages";

        String telefoneNormalizado = normalizarTelefone(telefoneDestino);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(accessToken);

        Map<String, Object> body = new HashMap<>();

        body.put("messaging_product", "whatsapp");
        body.put("to", telefoneNormalizado);
        body.put("type", "template");

        Map<String, Object> template = new HashMap<>();

        template.put("name", nomeTemplate);

        Map<String, String> language = new HashMap<>();
        language.put("code", codigoIdioma);

        template.put("language", language);

        if (parametrosBody != null && !parametrosBody.isEmpty()) {
            List<Map<String, Object>> parameters = new ArrayList<>();

            for (String parametro : parametrosBody) {
                Map<String, Object> parameter = new HashMap<>();

                parameter.put("type", "text");
                parameter.put("text", valorSeguro(parametro, "-"));

                parameters.add(parameter);
            }

            Map<String, Object> component = new HashMap<>();

            component.put("type", "body");
            component.put("parameters", parameters);

            template.put("components", List.of(component));
        }

        body.put("template", template);

        log.info("WhatsApp Cloud API - URL: {}", url);
        log.info(
                "WhatsApp Cloud API - template='{}', idioma='{}', telefone='{}', parametros={}",
                nomeTemplate,
                codigoIdioma,
                mascararTelefone(telefoneNormalizado),
                parametrosBody
        );
        log.info("WhatsApp Cloud API - payload sem token: {}", body);

        HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);

        RestTemplate restTemplate = new RestTemplate();

        try {
            ResponseEntity<String> response = restTemplate.postForEntity(
                    url,
                    request,
                    String.class
            );

            log.info(
                    "WhatsApp Cloud API - template '{}' enviado. HTTP {}. Resposta da Meta: {}",
                    nomeTemplate,
                    response.getStatusCode().value(),
                    response.getBody()
            );

            return response.getBody();

        } catch (HttpStatusCodeException e) {
            log.error(
                    "Erro HTTP ao enviar WhatsApp. Template='{}'. Status: {}. Resposta da Meta: {}",
                    nomeTemplate,
                    e.getStatusCode(),
                    e.getResponseBodyAsString(),
                    e
            );

            throw e;
        }
    }

    private String nomeNotificacao(String nome) {
        return valorSeguro(nome, "Cliente");
    }

    private String normalizarTelefone(String telefone) {
        String numero = telefone == null ? "" : telefone.replaceAll("\\D", "");

        if (numero.isBlank()) {
            throw new IllegalArgumentException("Telefone de destino não informado.");
        }

        if (!numero.startsWith("55")) {
            numero = "55" + numero;
        }

        return numero;
    }

    private String normalizarPlaca(String placa) {
        if (placa == null || placa.isBlank()) {
            return "";
        }

        return placa
                .trim()
                .toUpperCase()
                .replaceAll("\\s+", "");
    }

    private String valorSeguro(
            String valor,
            String valorPadrao
    ) {
        if (valor == null || valor.isBlank()) {
            return valorPadrao;
        }

        return valor.trim();
    }

    private String mascararTelefone(String telefone) {
        if (telefone == null || telefone.length() <= 4) {
            return "****";
        }

        return "*********" + telefone.substring(telefone.length() - 4);
    }
}