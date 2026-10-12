package com.clinicar.backend.service;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpEntity;
import org.springframework.http.ResponseEntity;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.client.RestTemplate;
import java.util.List;
import java.util.Map;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class WhatsAppEliminacaoVeiculoTest {
    @Test void usaTemplateIdiomaETwoParametrosNaOrdemCorretaSemAcessarMeta() {
        var service = new WhatsAppService();
        ReflectionTestUtils.setField(service, "apiUrl", "https://example.invalid");
        ReflectionTestUtils.setField(service, "phoneNumberId", "1234");
        ReflectionTestUtils.setField(service, "accessToken", "token-falso-de-teste");
        ReflectionTestUtils.setField(service, "templateLanguage", "pt_BR");
        ReflectionTestUtils.setField(service, "templateEliminacaoVeiculo", "eliminacao_veiculo");
        try (var clients = mockConstruction(RestTemplate.class, (mock, context) ->
                when(mock.postForEntity(anyString(), any(), eq(String.class))).thenReturn(ResponseEntity.ok("{\"messages\":[{\"id\":\"teste\"}]}")))) {
            service.enviarAlertaExclusaoVeiculo("(11) 99999-1111", "Nome social", "Toyota Corolla - Placa ABC-1234");
            var request = org.mockito.ArgumentCaptor.forClass(HttpEntity.class);
            verify(clients.constructed().get(0)).postForEntity(eq("https://example.invalid/1234/messages"), request.capture(), eq(String.class));
            var body = (Map<?, ?>) request.getValue().getBody(); assertNotNull(body);
            assertEquals("5511999991111", body.get("to"));
            var template = (Map<?, ?>) body.get("template");
            assertEquals("eliminacao_veiculo", template.get("name"));
            assertEquals(Map.of("code", "pt_BR"), template.get("language"));
            var component = (Map<?, ?>) ((List<?>) template.get("components")).get(0);
            assertEquals("body", component.get("type"));
            assertEquals(List.of(Map.of("type", "text", "text", "Nome social"),
                    Map.of("type", "text", "text", "Toyota Corolla - Placa ABC-1234")), component.get("parameters"));
        }
    }
}
