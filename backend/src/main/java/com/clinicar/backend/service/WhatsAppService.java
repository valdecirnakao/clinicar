package com.clinicar.backend.service;

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

    public String enviarMensagemTemplate(String telefoneDestino) {
        return enviarTemplateComParametros(
                telefoneDestino,
                templateName,
                templateLanguage,
                List.of()
        );
    }

    public String enviarMensagemCadastroUsuario(String telefoneDestino, String nomeUsuario) {
        return enviarTemplateComParametros(
                telefoneDestino,
                templateName,
                templateLanguage,
                List.of(valorSeguro(nomeUsuario, "Cliente"))
        );
    }

    public String enviarMensagemCadastroVeiculo(
            String telefoneDestino,
            String template,
            String languageCode,
            List<String> parametrosBody
    ) {
        String templateFinal = valorSeguro(template, templateCadastroVeiculoName);
        String idiomaFinal = valorSeguro(languageCode, templateLanguage);

        if (parametrosBody == null || parametrosBody.size() != 2) {
            throw new IllegalArgumentException(
                    "O template cadastro_veiculo deve receber exatamente 2 parâmetros: nome do usuário e modelo do veículo."
            );
        }

        return enviarTemplateComParametros(
                telefoneDestino,
                templateFinal,
                idiomaFinal,
                parametrosBody
        );
    }

    private String enviarTemplateComParametros(
            String telefoneDestino,
            String nomeTemplate,
            String codigoIdioma,
            List<String> parametrosBody
    ) {
        String url = apiUrl + "/" + phoneNumberId + "/messages";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(accessToken);

        Map<String, Object> body = new HashMap<>();
        body.put("messaging_product", "whatsapp");
        body.put("to", normalizarTelefone(telefoneDestino));
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

        System.out.println("URL WhatsApp Cloud API: " + url);
        System.out.println("Payload WhatsApp: " + body);

        HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);

        RestTemplate restTemplate = new RestTemplate();

        try {
            ResponseEntity<String> response = restTemplate.postForEntity(
                    url,
                    request,
                    String.class
            );

            System.out.println("Resposta WhatsApp: " + response.getBody());

            return response.getBody();

        } catch (HttpStatusCodeException e) {
            System.err.println("Erro HTTP ao enviar WhatsApp.");
            System.err.println("Status: " + e.getStatusCode());
            System.err.println("Resposta da Meta: " + e.getResponseBodyAsString());

            throw e;
        }
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

    private String valorSeguro(String valor, String valorPadrao) {
        if (valor == null || valor.isBlank()) {
            return valorPadrao;
        }

        return valor.trim();
    }
}