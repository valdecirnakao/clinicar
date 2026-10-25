package com.clinicar.backend.service;

import com.clinicar.backend.model.Veiculo;
import com.clinicar.backend.repository.HistoricoVeicularRepository;
import com.clinicar.backend.repository.VeiculoRepository;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Pageable;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class HistoricoVeicularValorEstimadoTest {
    @Test void agendamentoPendenteIncluiPecasSemEntrarNoTotalFinalizado() {
        var veiculos = mock(VeiculoRepository.class);
        var historico = mock(HistoricoVeicularRepository.class);
        var veiculo = new Veiculo();
        veiculo.setId(1L);
        when(veiculos.findById(1L)).thenReturn(Optional.of(veiculo));
        var linha = mock(HistoricoVeicularRepository.Linha.class);
        when(linha.getId()).thenReturn(9L);
        when(linha.getStatus()).thenReturn("AGENDADO");
        when(linha.getData()).thenReturn(LocalDateTime.of(2030, 1, 1, 10, 0));
        when(linha.getValor()).thenReturn(new BigDecimal("35.00"));
        when(linha.getValorServicoBase()).thenReturn(new BigDecimal("80.00"));
        when(historico.atendimentos(eq(1L), isNull(), isNull(), any(Pageable.class))).thenReturn(List.of());
        when(historico.agendamentos(eq(1L), isNull(), isNull(), any(Pageable.class))).thenReturn(List.of(linha));
        var pecas = mock(HistoricoVeicularRepository.TotalPecasAgendamento.class);
        when(pecas.getAgendamentoId()).thenReturn(9L);
        when(pecas.getTotal()).thenReturn(new BigDecimal("35.00"));
        when(historico.totaisPecasAgendamento(List.of(9L))).thenReturn(List.of(pecas));

        var resposta = new HistoricoVeicularService(veiculos, historico).consultar(1L, null, null, "TODOS");

        assertEquals(1, resposta.resumo().agendamentos());
        assertEquals(0, resposta.resumo().finalizados());
        assertEquals(0, resposta.resumo().valorFinalizados().compareTo(BigDecimal.ZERO));
        assertEquals("AGENDADO", resposta.registros().getFirst().status());
        assertEquals(0, resposta.registros().getFirst().valor().compareTo(new BigDecimal("115.00")));
    }

    @Test void valorJaCompletoNaoSomaPecasDuasVezes() {
        var veiculos = mock(VeiculoRepository.class);
        var historico = mock(HistoricoVeicularRepository.class);
        var veiculo = new Veiculo();
        veiculo.setId(1L);
        when(veiculos.findById(1L)).thenReturn(Optional.of(veiculo));
        var linha = mock(HistoricoVeicularRepository.Linha.class);
        when(linha.getId()).thenReturn(9L);
        when(linha.getStatus()).thenReturn("AGENDADO");
        when(linha.getValor()).thenReturn(new BigDecimal("115.00"));
        when(linha.getValorServicoBase()).thenReturn(new BigDecimal("80.00"));
        when(historico.atendimentos(eq(1L), isNull(), isNull(), any(Pageable.class))).thenReturn(List.of());
        when(historico.agendamentos(eq(1L), isNull(), isNull(), any(Pageable.class))).thenReturn(List.of(linha));
        var pecas = mock(HistoricoVeicularRepository.TotalPecasAgendamento.class);
        when(pecas.getAgendamentoId()).thenReturn(9L);
        when(pecas.getTotal()).thenReturn(new BigDecimal("35.00"));
        when(historico.totaisPecasAgendamento(List.of(9L))).thenReturn(List.of(pecas));

        var resposta = new HistoricoVeicularService(veiculos, historico).consultar(1L, null, null, "TODOS");
        assertEquals(0, resposta.registros().getFirst().valor().compareTo(new BigDecimal("115.00")));
    }
}
