package com.clinicar.backend.service;

import com.clinicar.backend.model.Agendamento;
import com.clinicar.backend.model.Atendimento;
import com.clinicar.backend.model.AtendimentoOrcamento;
import com.clinicar.backend.model.Servico;
import com.clinicar.backend.model.Usuario;
import com.clinicar.backend.model.Veiculo;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.test.util.ReflectionTestUtils;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class AvisosServicoWhatsappServiceTest {
    private final NotificacaoOutboxService outbox = mock(NotificacaoOutboxService.class);
    private final AvisosServicoWhatsappService avisos = new AvisosServicoWhatsappService(outbox);
    private final Usuario cliente = new Usuario();
    private final Agendamento agendamento = new Agendamento();

    @BeforeEach void preparar() {
        cliente.setId(7L); cliente.setNome("Dora"); cliente.setStatus("ATIVO");
        cliente.setTelefone("+55 (11) 98765-4321"); cliente.setAvisosServicoWhatsapp(true);
        var veiculo = new Veiculo(); veiculo.setPlaca("ABC1D23");
        var servico = new Servico(); servico.setNome("Troca de filtro");
        agendamento.setId(10L); agendamento.setCliente(cliente); agendamento.setVeiculo(veiculo);
        agendamento.setServico(servico); agendamento.setCodigoAgendamento("AGD-10");
        agendamento.setDataHoraInicio(LocalDateTime.of(2026, 11, 10, 9, 30));
        agendamento.setConfirmadoEm(LocalDateTime.of(2026, 10, 25, 12, 0));
    }

    @Test void exigeHabilitacaoEConsentimento() {
        avisos.confirmado(agendamento);
        verifyNoInteractions(outbox);
        ReflectionTestUtils.setField(avisos, "habilitados", true);
        cliente.setAvisosServicoWhatsapp(false);
        avisos.confirmado(agendamento);
        verifyNoInteractions(outbox);
        cliente.setAvisosServicoWhatsapp(true);
        avisos.confirmado(agendamento);
        verify(outbox).enfileirar(startsWith("agendamento-confirmado:"), eq("5511987654321"),
                eq("clinicar_agendamento_confirmado"), eq("pt_BR"), anyMap(), eq("AGENDAMENTO"), eq(10L));
    }

    @Test void preservaQuantidadeEOrdemDosParametrosDosCincoTemplates() {
        ReflectionTestUtils.setField(avisos, "habilitados", true);
        avisos.confirmado(agendamento);
        assertParametros("clinicar_agendamento_confirmado", List.of("Dora", "ABC-1D23", "10/11/2026", "09:30", "Troca de filtro", "AGD-10"));
        clearInvocations(outbox);
        assertTrue(avisos.lembrete(agendamento));
        assertParametros("clinicar_lembrete_agendamento", List.of("Dora", "ABC-1D23", "10/11/2026", "09:30", "AGD-10"));
        clearInvocations(outbox);
        avisos.reagendado(agendamento, LocalDateTime.of(2026, 11, 9, 8, 0));
        assertParametros("clinicar_agendamento_reagendado", List.of("Dora", "ABC-1D23", "09/11/2026", "08:00", "10/11/2026", "09:30", "AGD-10"));
        clearInvocations(outbox);
        var atendimento = new Atendimento(); atendimento.setId(20L); atendimento.setCliente(cliente);
        atendimento.setVeiculo(agendamento.getVeiculo()); atendimento.setCodigoAtendimento("ATD-20");
        var orcamento = new AtendimentoOrcamento(); orcamento.setId(30L);
        orcamento.setAtendimento(atendimento); orcamento.setValorTotal(new BigDecimal("115.00"));
        avisos.orcamento(orcamento);
        assertParametros("clinicar_orcamento_aguardando_aprovacao", List.of("Dora", "ATD-20", "ABC-1D23", "R$ 115,00"));
        clearInvocations(outbox);
        avisos.prontoRetirada(atendimento);
        assertParametros("clinicar_veiculo_pronto_retirada", List.of("Dora", "ABC-1D23", "ATD-20"));
    }

    @SuppressWarnings("unchecked")
    private void assertParametros(String template, List<String> esperados) {
        var captor = ArgumentCaptor.forClass(Map.class);
        verify(outbox).enfileirar(anyString(), anyString(), eq(template), eq("pt_BR"), captor.capture(),
                anyString(), anyLong());
        Map<String, Object> body = captor.getValue();
        Map<String, Object> dadosTemplate = (Map<String, Object>) body.get("template");
        List<Map<String, Object>> componentes = (List<Map<String, Object>>) dadosTemplate.get("components");
        List<Map<String, String>> parametros = (List<Map<String, String>>) componentes.getFirst().get("parameters");
        assertEquals(esperados, parametros.stream().map(item -> item.get("text")).toList());
    }
}
