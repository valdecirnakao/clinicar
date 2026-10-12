package com.clinicar.backend.service;

import com.clinicar.backend.config.TemplateAlertaEstoqueConfig;
import com.clinicar.backend.model.AlertaEstoquePeca;
import com.clinicar.backend.model.ConfiguracaoAlertaEstoque;
import com.clinicar.backend.model.Peca;
import com.clinicar.backend.repository.UsuarioRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import java.math.BigDecimal;
import org.springframework.http.MediaType;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestTemplate;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.mock;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.*;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class TemplateEstoqueServidorTest {
    @ParameterizedTest
    @ValueSource(strings = {"Litro", " Litro ", "Litro(s)"})
    void envioUsaTemplateEIdiomaDoServidorMesmoComDadosLegadosDiferentes(String unidade) {
        var service = new WhatsappEstoqueService(mock(UsuarioRepository.class),
                new TemplateAlertaEstoqueConfig("template_tecnico_estoque", "pt_BR"));
        ReflectionTestUtils.setField(service, "whatsappEnabled", true);
        ReflectionTestUtils.setField(service, "apiUrl", "https://graph.facebook.com");
        ReflectionTestUtils.setField(service, "apiVersion", "v23.0");
        ReflectionTestUtils.setField(service, "phoneNumberId", "numero_teste");
        ReflectionTestUtils.setField(service, "accessToken", "credencial_ficticia_de_teste");
        var server = MockRestServiceServer.bindTo((RestTemplate) ReflectionTestUtils.getField(service, "restTemplate")).build();
        server.expect(requestTo("https://graph.facebook.com/v23.0/numero_teste/messages"))
                .andExpect(jsonPath("$.template.name").value("template_tecnico_estoque"))
                .andExpect(jsonPath("$.template.language.code").value("pt_BR"))
                .andExpect(jsonPath("$.template.components[0].parameters[3].text").value("4 Litro(s)"))
                .andExpect(jsonPath("$.template.components[0].parameters[4].text").value("5 Litro(s)"))
                .andRespond(withSuccess("{\"messages\":[{\"id\":\"wamid.teste\"}]}", MediaType.APPLICATION_JSON));
        var configuracao = new ConfiguracaoAlertaEstoque();
        configuracao.setTelefoneAdministrador("5511999999999");
        configuracao.setTemplateWhatsapp("template_adulterado"); configuracao.setIdiomaTemplate("en_US");
        var alerta = new AlertaEstoquePeca(); alerta.setNivelAlerta("ATENCAO");
        var peca = new Peca(); peca.setUnidade(unidade); alerta.setPeca(peca);
        alerta.setQuantidadeAtual(new BigDecimal("4.00")); alerta.setEstoqueMinimo(new BigDecimal("5.00"));
        assertEquals("wamid.teste", service.enviarAlertaEstoque(alerta, configuracao)); server.verify();
    }
    @Test void configuracaoTecnicaInvalidaFalhaAntesDoEnvio() {
        assertThrows(IllegalArgumentException.class, () -> new TemplateAlertaEstoqueConfig("Nome inválido", "pt_BR"));
        assertThrows(IllegalArgumentException.class, () -> new TemplateAlertaEstoqueConfig("alerta_estoque_peca", "Português"));
    }
    @Test void contratoOperacionalNaoExpoeCamposTecnicos() {
        var nomes = java.util.Arrays.stream(com.clinicar.backend.controller.ConfiguracaoAlertaEstoqueController.ConfiguracaoRequest.class.getRecordComponents())
                .map(java.lang.reflect.RecordComponent::getName).toList();
        assertFalse(nomes.contains("templateWhatsapp")); assertFalse(nomes.contains("idiomaTemplate"));
        var resposta = com.clinicar.backend.controller.ConfiguracaoAlertaEstoqueController.ConfiguracaoResponse.de(new ConfiguracaoAlertaEstoque());
        var json = new com.fasterxml.jackson.databind.ObjectMapper().valueToTree(resposta);
        assertFalse(json.has("templateWhatsapp")); assertFalse(json.has("idiomaTemplate"));
    }
}
