package com.clinicar.backend;

import com.clinicar.backend.model.*;
import com.clinicar.backend.repository.*;
import com.clinicar.backend.service.AlertaManutencaoService;
import com.clinicar.backend.service.WhatsAppService;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import java.time.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@SpringBootTest @ActiveProfiles("test")
class AlertaManutencaoIntegrationTest {
    @Autowired AlertaManutencaoService service;
    @Autowired ConfiguracaoAlertaManutencaoRepository configs;
    @Autowired EnvioAlertaManutencaoRepository envios;
    @Autowired PrevisaoManutencaoVeiculoRepository previsoes;
    @Autowired UsuarioRepository usuarios;
    @Autowired VeiculoRepository veiculos;
    @Autowired RegraManutencaoPreventivaRepository regras;
    @MockitoBean WhatsAppService whatsapp;
    Usuario dono;
    @BeforeEach void preparar() {
        envios.deleteAll(); previsoes.deleteAll(); regras.deleteAll(); veiculos.deleteAll(); usuarios.deleteAll(); configs.deleteAll();
        var c = new ConfiguracaoAlertaManutencao(); c.setAtivo(true); c.setHoraInicio(0); c.setHoraFim(24);
        service.salvar(c);
        dono = new Usuario(); dono.setEmail("dono@example.test"); dono.setTelefone("11999990000"); dono.setNome("Dono"); dono.setStatus("ATIVO"); dono = usuarios.saveAndFlush(dono);
        var v = new Veiculo(); v.setPlaca("ABC1D23"); v.setFabricante("Teste"); v.setCor("Azul");
        v.setModelo("Teste"); v.setAnoModeloCombustivel("2026 Flex"); v.setIdProprietario(dono.getId()); v = veiculos.saveAndFlush(v);
        var r = new RegraManutencaoPreventiva(); r.setGrupoManutencao("FILTRO"); r.setDescricao("Troca de filtro"); r.setIntervaloDias(30); r = regras.saveAndFlush(r);
        var p = new PrevisaoManutencaoVeiculo(); p.setVeiculo(v); p.setCliente(dono); p.setRegraManutencao(r);
        p.setGrupoManutencao("FILTRO"); p.setDescricao("Troca de filtro"); p.setKmReferencia(10000);
        p.setDataReferencia(LocalDate.now()); p.setDataRecomendada(LocalDate.now()); p.setCriterioUtilizado("TEMPO"); p.setNivelConfianca("BAIXA");
        previsoes.saveAndFlush(p);
    }
    @Test void enviaUmaVezEPersisteHistoricoEntreExecucoes() {
        service.processar(); service.processar();
        verify(whatsapp,times(1)).enviarAlertaManutencao(eq("11999990000"), eq("Dono"), eq("ABC1D23"), eq("Troca de filtro"), anyString());
        assertEquals(1,envios.count()); assertEquals("ENVIADO",envios.findAll().getFirst().getStatus());
    }
    @Test void falhaNaoReenviaSemConciliacao() {
        doThrow(new IllegalStateException("Teste")).when(whatsapp).enviarAlertaManutencao(anyString(), anyString(), anyString(), anyString(), anyString());
        service.processar(); service.processar();
        assertEquals("ERRO",envios.findAll().getFirst().getStatus()); verify(whatsapp,times(1)).enviarAlertaManutencao(anyString(), anyString(), anyString(), anyString(), anyString());
        service.conciliar(envios.findAll().getFirst().getId(),false);
        reset(whatsapp); service.processar(); verify(whatsapp).enviarAlertaManutencao(anyString(), anyString(), anyString(), anyString(), anyString());
        assertEquals(2,envios.count());
    }
    @Test void enviaParaProprietarioAtualEmVezDoClienteAntigo() {
        var novo = new Usuario(); novo.setEmail("novo@example.test"); novo.setTelefone("11988880000"); novo.setNome("Novo"); novo.setStatus("ATIVO"); novo = usuarios.saveAndFlush(novo);
        var v = veiculos.findAll().getFirst(); v.setIdProprietario(novo.getId()); veiculos.saveAndFlush(v);
        service.processar(); assertEquals("11988880000",envios.findAll().getFirst().getDestinatario());
    }
    @Test void configuracaoInvalidaNaoESalva() {
        var c = service.consultar(); c.setIntervaloDias(0);
        assertThrows(IllegalArgumentException.class, () -> service.salvar(c));
        assertEquals(7,service.consultar().getIntervaloDias());
    }
    @Test void duasExecucoesSimultaneasReservamUmUnicoEnvio() throws Exception {
        try (var executor = java.util.concurrent.Executors.newFixedThreadPool(2)) {
            var a = executor.submit(() -> service.processar()); var b = executor.submit(() -> service.processar());
            a.get(); b.get();
        }
        verify(whatsapp,times(1)).enviarAlertaManutencao(anyString(), anyString(), anyString(), anyString(), anyString()); assertEquals(1,envios.count());
    }
}
