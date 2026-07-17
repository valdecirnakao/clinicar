package com.clinicar.backend.service;

import com.clinicar.backend.model.AlertaEstoquePeca;
import com.clinicar.backend.model.ConfiguracaoAlertaEstoque;
import com.clinicar.backend.model.EstoquePeca;
import com.clinicar.backend.model.Peca;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@Service
public class WhatsappEstoqueService {

    @Value("${clinicar.whatsapp.enabled:false}")
    private boolean whatsappEnabled;

    @Value("${clinicar.whatsapp.api-url:https://graph.facebook.com}")
    private String apiUrl;

    @Value("${clinicar.whatsapp.api-version:v23.0}")
    private String apiVersion;

    @Value("${clinicar.whatsapp.phone-number-id:}")
    private String phoneNumberId;

    @Value("${clinicar.whatsapp.access-token:}")
    private String accessToken;

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    public String enviarAlertaEstoque(
            AlertaEstoquePeca alerta,
            ConfiguracaoAlertaEstoque configuracao
    ) {
        if (!whatsappEnabled) {
            throw new IllegalStateException(
                    "Envio de WhatsApp está desativado em clinicar.whatsapp.enabled."
            );
        }

        if (phoneNumberId == null || phoneNumberId.isBlank()) {
            throw new IllegalStateException("Phone Number ID do WhatsApp não configurado.");
        }

        if (accessToken == null || accessToken.isBlank()) {
            throw new IllegalStateException("Access Token do WhatsApp não configurado.");
        }

        if (configuracao == null) {
            throw new IllegalArgumentException("Configuração de alerta de estoque não encontrada.");
        }

        String telefone = limparTelefone(configuracao.getTelefoneAdministrador());

        if (telefone.isBlank()) {
            throw new IllegalArgumentException("Telefone do administrador não configurado.");
        }

        EstoquePeca estoque = alerta.getEstoquePeca();
        Peca peca = alerta.getPeca();

        String nomeAdministrador = "Administrador";
        String nomePeca = peca != null ? peca.getNome() : "Peça não identificada";
        String nivel = alerta.getNivelAlerta();
        String saldoAtual = formatarQuantidade(alerta.getQuantidadeAtual(), peca);
        String estoqueMinimo = formatarQuantidade(alerta.getEstoqueMinimo(), peca);
        String local = estoque != null && estoque.getLocalEstoque() != null
                ? estoque.getLocalEstoque().getNome()
                : "Local não informado";

        String url = apiUrl + "/" + apiVersion + "/" + phoneNumberId + "/messages";

        Map<String, Object> body = Map.of(
                "messaging_product", "whatsapp",
                "to", telefone,
                "type", "template",
                "template", Map.of(
                        "name", configuracao.getTemplateWhatsapp(),
                        "language", Map.of(
                                "code", configuracao.getIdiomaTemplate()
                        ),
                        "components", List.of(
                                Map.of(
                                        "type", "body",
                                        "parameters", List.of(
                                                parametroTexto(nomeAdministrador),
                                                parametroTexto(nomePeca),
                                                parametroTexto(nivel),
                                                parametroTexto(saldoAtual),
                                                parametroTexto(estoqueMinimo),
                                                parametroTexto(local)
                                        )
                                )
                        )
                )
        );

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(accessToken);

        HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);

        ResponseEntity<String> response = restTemplate.exchange(
                url,
                HttpMethod.POST,
                request,
                String.class
        );

        if (!response.getStatusCode().is2xxSuccessful()) {
            throw new IllegalStateException(
                    "Falha ao enviar WhatsApp. Status: " + response.getStatusCode()
            );
        }

        return extrairMessageId(response.getBody());
    }

    private Map<String, String> parametroTexto(String texto) {
        return Map.of(
                "type", "text",
                "text", texto == null ? "" : texto
        );
    }

    private String extrairMessageId(String json) {
        if (json == null || json.isBlank()) {
            return null;
        }

        try {
            JsonNode root = objectMapper.readTree(json);
            JsonNode messages = root.path("messages");

            if (messages.isArray() && !messages.isEmpty()) {
                return messages.get(0).path("id").asText(null);
            }

            return null;
        } catch (Exception e) {
            return null;
        }
    }

    private String limparTelefone(String telefone) {
        if (telefone == null) {
            return "";
        }

        return telefone.replaceAll("\\D", "");
    }

    private String formatarQuantidade(BigDecimal quantidade, Peca peca) {
        BigDecimal valor = quantidade == null ? BigDecimal.ZERO : quantidade.stripTrailingZeros();

        String unidade = "unidade(s)";

        if (peca != null && peca.getUnidade() != null && !peca.getUnidade().isBlank()) {
            unidade = peca.getUnidade();
        }

        return valor.toPlainString() + " " + unidade;
    }
}