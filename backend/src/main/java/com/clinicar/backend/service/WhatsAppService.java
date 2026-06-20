package com.clinicar.backend.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import java.util.List;
import java.util.HashMap;
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

    @Value("${whatsapp.template-language}")
    private String templateLanguage;

    public String enviarMensagemTemplate(String telefoneDestino) {

        String url = apiUrl + "/" + phoneNumberId + "/messages";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(accessToken);

        Map<String, Object> body = new HashMap<>();

        body.put("messaging_product", "whatsapp");
        body.put("to", normalizarTelefone(telefoneDestino));
        body.put("type", "template");

        Map<String, Object> template = new HashMap<>();
        template.put("name", templateName);

        Map<String, String> language = new HashMap<>();
        language.put("code", templateLanguage);

        template.put("language", language);

        body.put("template", template);

        HttpEntity<Map<String, Object>> request =
                new HttpEntity<>(body, headers);

        RestTemplate restTemplate = new RestTemplate();

        ResponseEntity<String> response =
                restTemplate.postForEntity(
                        url,
                        request,
                        String.class
                );

        return response.getBody();
    }

    public String enviarMensagemCadastroUsuario(String telefoneDestino, String nomeUsuario) {
        String url = apiUrl + "/" + phoneNumberId + "/messages";
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(accessToken);
        Map<String, Object> body = new HashMap<>();
        body.put("messaging_product", "whatsapp");
        body.put("to", normalizarTelefone(telefoneDestino));
        body.put("type", "template");
        Map<String, Object> template = new HashMap<>();
        template.put("name", templateName);
        Map<String, String> language = new HashMap<>();
        language.put("code", templateLanguage);
        template.put("language", language);

        Map<String, Object> parameter = new HashMap<>();
        parameter.put("type", "text");
        parameter.put("text", nomeUsuario);

        Map<String, Object> component = new HashMap<>();
        component.put("type", "body");
        component.put("parameters", List.of(parameter));
        template.put("components", List.of(component));
        body.put("template", template);
        HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);
        RestTemplate restTemplate = new RestTemplate();
        ResponseEntity<String> response = restTemplate.postForEntity(url, request, String.class);
        return response.getBody();
    }

    private String normalizarTelefone(String telefone) {
    String numero = telefone == null ? "" : telefone.replaceAll("\\D", "");

    if (!numero.startsWith("55")) {
        numero = "55" + numero;
    }

    return numero;
    }
}