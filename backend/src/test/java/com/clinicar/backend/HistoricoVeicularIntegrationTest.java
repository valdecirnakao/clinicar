package com.clinicar.backend;

import com.clinicar.backend.model.*;
import com.clinicar.backend.service.HistoricoVeicularService;
import com.clinicar.backend.service.WhatsAppService;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class HistoricoVeicularIntegrationTest {
    @Autowired EntityManager em;
    @Autowired HistoricoVeicularService service;
    @MockitoBean WhatsAppService whatsapp;
    Usuario cliente; Veiculo veiculo; Servico servico;
    final LocalDate dia = LocalDate.of(2026, 9, 30);

    @BeforeEach void preparar() {
        cliente = new Usuario(); cliente.setNome("Cliente de teste"); cliente.setStatus("ATIVO");
        cliente.setEmail(UUID.randomUUID() + "@example.test"); em.persist(cliente);
        veiculo = new Veiculo(); veiculo.setPlaca("HIS" + UUID.randomUUID().toString().substring(0, 5));
        veiculo.setFabricante("Toyota"); veiculo.setModelo("Corolla"); veiculo.setCor("Preto");
        veiculo.setAnoModeloCombustivel("2020/2021 Flex"); veiculo.setIdProprietario(cliente.getId()); em.persist(veiculo);
        servico = new Servico(); servico.setNome("Revisão preventiva"); servico.setCategoria("REVISÃO");
        servico.setTipoDoPrestador("INTERNO"); servico.setDuracaoEstimada(BigDecimal.ONE); servico.setUnidadeDuracao("HORA");
        servico.setValorBase(new BigDecimal("100")); servico.setUnidadeCobranca("SERVICO"); em.persist(servico);
    }
    Atendimento registrar(LocalDateTime data, String status, String valor, boolean preservar) {
        Agendamento ag = new Agendamento(); ag.setCodigoAgendamento("AG-" + UUID.randomUUID());
        ag.setCliente(cliente); ag.setVeiculo(veiculo); ag.setServico(servico);
        ag.setDataHoraInicio(data); ag.setDataHoraFim(data.plusHours(1)); ag.setDuracaoEstimadaMinutos(60);
        ag.setStatusAgendamento("CONCLUIDO"); ag.setValorEstimado(new BigDecimal("999")); em.persist(ag);
        Atendimento at = new Atendimento(); at.setCodigoAtendimento("AT-" + UUID.randomUUID());
        at.setAgendamento(ag); at.setCliente(cliente); at.setVeiculo(veiculo); at.setServico(servico);
        at.setDataEntrada(data); at.setStatusAtendimento(status); at.setValorMaoObra(new BigDecimal(valor));
        at.setQuilometragemEntrada(10000); at.setQuilometragemSaida(10020);
        at.setDiagnosticoTecnico("Diagnóstico registrado"); at.setServicoExecutado("Troca de óleo");
        at.setObservacoesInternas("INFORMAÇÃO_INTERNA_NÃO_EXPORTAR");
        if (preservar) at.preservarDadosVeiculo(); em.persist(at); em.flush(); return at;
    }
    @Test void mantemVeiculoHistoricoEPecasEServicosAposAlteracaoDoCadastro() {
        String placaOriginal = veiculo.getPlaca();
        Atendimento at = registrar(dia.atTime(9, 0), "ENTREGUE", "100", true);
        AtendimentoServicoExecutado item = new AtendimentoServicoExecutado(); item.setAtendimento(at); item.setServico(servico);
        item.setQuantidade(new BigDecimal("2")); item.setValorMaoObra(new BigDecimal("30")); em.persist(item);
        Peca peca = new Peca(); peca.setNome("Filtro de óleo"); em.persist(peca);
        AtendimentoPecaUtilizada utilizada = new AtendimentoPecaUtilizada(); utilizada.setAtendimento(at); utilizada.setPeca(peca);
        utilizada.setQuantidade(new BigDecimal("4")); utilizada.setValorUnitario(new BigDecimal("10")); utilizada.setUnidadeMedida("UN"); em.persist(utilizada);
        veiculo.setPlaca("XYZ9999"); veiculo.setModelo("Yaris"); em.flush(); em.clear();
        var relatorio = service.consultar(veiculo.getId(), null, null, "TODOS");
        assertEquals("XYZ9999", relatorio.veiculo().placa());
        assertEquals(2, relatorio.registros().size());
        for (var registro : relatorio.registros()) {
            assertEquals(placaOriginal, registro.placa()); assertEquals("Corolla", registro.modelo()); assertTrue(registro.veiculoPreservado());
        }
        var atendimento = relatorio.registros().stream().filter(r -> r.tipo().equals("ATENDIMENTO")).findFirst().orElseThrow();
        assertEquals(2, atendimento.itens().size());
        assertEquals(0, atendimento.itens().getFirst().valorTotal().compareTo(new BigDecimal("60")));
        assertEquals(0, atendimento.itens().getLast().valorTotal().compareTo(new BigDecimal("40")));
    }
    @Test void periodoIncluiDiaFinalInteiroEExcluiDiaSeguinte() {
        registrar(dia.atTime(23, 59), "ENTREGUE", "100", true);
        registrar(dia.plusDays(1).atStartOfDay(), "ENTREGUE", "200", true);
        var r = service.consultar(veiculo.getId(), dia, dia, "TODOS");
        assertEquals(2, r.registros().size()); assertEquals(1, r.resumo().atendimentos());
        assertEquals(0, r.resumo().valorFinalizados().compareTo(new BigDecimal("100")));
    }
    @Test void totalIgnoraCanceladosEAbertosENaoDuplicaEstimativasDeAgendamentos() {
        registrar(dia.atTime(9, 0), "ENTREGUE", "100", true);
        registrar(dia.atTime(10, 0), "CANCELADO", "700", true);
        registrar(dia.atTime(11, 0), "ABERTO", "900", false);
        var r = service.consultar(veiculo.getId(), null, null, "TODOS");
        assertEquals(1, r.resumo().finalizados()); assertEquals(3, r.resumo().atendimentos());
        assertEquals(0, r.resumo().valorFinalizados().compareTo(new BigDecimal("100")));
        assertEquals(10020, r.resumo().ultimaQuilometragem());
        var cancelados = service.consultar(veiculo.getId(), null, null, "CANCELADOS");
        assertEquals(1, cancelados.registros().size()); assertEquals("CANCELADO", cancelados.registros().getFirst().status());
        var abertos = service.consultar(veiculo.getId(), null, null, "EM_ABERTO");
        assertEquals(1, abertos.registros().size()); assertFalse(abertos.registros().getFirst().veiculoPreservado());
    }
    @Test void outroVeiculoNaoRecebeHistoricoDeVeiculoDiferente() {
        registrar(dia.atTime(9, 0), "ENTREGUE", "100", true);
        Veiculo outro = new Veiculo(); outro.setPlaca("OUT1234"); outro.setFabricante("Honda"); outro.setModelo("Civic");
        outro.setCor("Azul"); outro.setAnoModeloCombustivel("2026 Flex"); outro.setIdProprietario(cliente.getId()); em.persist(outro); em.flush();
        var r = service.consultar(outro.getId(), null, null, "TODOS");
        assertTrue(r.registros().isEmpty()); assertEquals(0, r.resumo().valorFinalizados().signum());
    }
    @Test void rejeitaFiltrosInvalidos() {
        assertThrows(IllegalArgumentException.class, () -> service.consultar(veiculo.getId(), dia.plusDays(1), dia, "TODOS"));
        assertThrows(IllegalArgumentException.class, () -> service.consultar(veiculo.getId(), null, null, "DESCONHECIDO"));
        assertThrows(IllegalArgumentException.class, () -> service.consultar(-1L, null, null, "TODOS"));
    }
}
