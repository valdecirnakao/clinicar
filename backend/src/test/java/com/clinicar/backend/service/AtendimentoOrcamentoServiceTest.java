package com.clinicar.backend.service;

import com.clinicar.backend.model.*;
import com.clinicar.backend.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AtendimentoOrcamentoServiceTest {
    @Mock AtendimentoRepository atendimentos;
    @Mock AtendimentoOrcamentoRepository orcamentos;
    @Mock AtendimentoPecaUtilizadaRepository pecas;
    @Mock AtendimentoServicoExecutadoRepository servicos;
    @Mock UsuarioRepository usuarios;
    @Mock AvisosServicoWhatsappService avisosWhatsapp;
    @Mock NotificacaoOutboxService notificacoes;
    @InjectMocks AtendimentoOrcamentoService service;
    Atendimento atendimento;

    @BeforeEach void preparar() {
        atendimento = new Atendimento(); atendimento.setId(10L);
        atendimento.setCodigoAtendimento("OS-10"); atendimento.setStatusAtendimento("EM_DIAGNOSTICO");
        atendimento.setDiagnosticoTecnico("Trocar pastilhas"); atendimento.setValorMaoObra(new BigDecimal("100.00"));
        atendimento.setValorPecas(new BigDecimal("40.00")); atendimento.setValorTerceiros(BigDecimal.ZERO);
        atendimento.setDesconto(BigDecimal.ZERO); atendimento.setValorTotal(new BigDecimal("140.00"));
        var cliente = new Usuario(); cliente.setId(7L); atendimento.setCliente(cliente);
        var servico = new Servico(); servico.setId(3L); servico.setNome("Freios"); atendimento.setServico(servico);
        var veiculo = new Veiculo(); veiculo.setPlaca("ABC1234"); atendimento.setVeiculo(veiculo);
    }

    @Test void registraVersaoEExigeProprietarioParaDecisao() {
        when(pecas.findByAtendimento_Id(10L)).thenReturn(List.of());
        when(servicos.findByAtendimento_IdOrderByCriadoEmAsc(10L)).thenReturn(List.of());
        service.emitir(atendimento);
        var captor = org.mockito.ArgumentCaptor.forClass(AtendimentoOrcamento.class);
        verify(orcamentos).save(captor.capture());
        var proposta = captor.getValue(); proposta.setId(30L);
        assertEquals(1, proposta.getVersao()); assertEquals("PENDENTE", proposta.getStatus());
        assertEquals(new BigDecimal("140.00"), proposta.getValorTotal());
        when(orcamentos.findById(30L)).thenReturn(Optional.of(proposta));
        when(atendimentos.buscarParaPrevisao(10L)).thenReturn(Optional.of(atendimento));
        assertEquals(403, assertThrows(ResponseStatusException.class, () -> service.decidir(30L, 8L, true)).getStatusCode().value());
        verify(atendimentos, never()).save(any());
        atendimento.setStatusAtendimento("AGUARDANDO_APROVACAO");
        when(orcamentos.findFirstByAtendimento_IdOrderByVersaoDesc(10L)).thenReturn(Optional.of(proposta));
        service.decidir(30L, 7L, true);
        assertEquals("APROVADO", proposta.getStatus()); assertEquals("APROVADO", atendimento.getStatusAtendimento());
        assertEquals(409, assertThrows(ResponseStatusException.class, () -> service.decidir(30L, 7L, true)).getStatusCode().value());
    }

    @Test void recusaAceiteQuandoPrecoMudou() {
        when(pecas.findByAtendimento_Id(10L)).thenReturn(List.of());
        when(servicos.findByAtendimento_IdOrderByCriadoEmAsc(10L)).thenReturn(List.of());
        service.emitir(atendimento);
        var captor = org.mockito.ArgumentCaptor.forClass(AtendimentoOrcamento.class);
        verify(orcamentos).save(captor.capture());
        var proposta = captor.getValue(); proposta.setId(31L);
        atendimento.setStatusAtendimento("AGUARDANDO_APROVACAO");
        atendimento.setValorTotal(new BigDecimal("150.00"));
        when(orcamentos.findById(31L)).thenReturn(Optional.of(proposta));
        when(orcamentos.findFirstByAtendimento_IdOrderByVersaoDesc(10L)).thenReturn(Optional.of(proposta));
        when(atendimentos.buscarParaPrevisao(10L)).thenReturn(Optional.of(atendimento));
        assertEquals(409, assertThrows(ResponseStatusException.class, () -> service.decidir(31L, 7L, true)).getStatusCode().value());
        verify(atendimentos, never()).save(any());
    }

    @Test void alteracaoDuranteExecucaoInvalidaAceiteAnterior() {
        when(pecas.findByAtendimento_Id(10L)).thenReturn(List.of());
        when(servicos.findByAtendimento_IdOrderByCriadoEmAsc(10L)).thenReturn(List.of());
        service.emitir(atendimento);
        var captor = org.mockito.ArgumentCaptor.forClass(AtendimentoOrcamento.class);
        verify(orcamentos).save(captor.capture());
        var proposta = captor.getValue(); proposta.setStatus("APROVADO");
        atendimento.setStatusAtendimento("EM_EXECUCAO"); atendimento.setAprovado(true);
        atendimento.setValorTotal(new BigDecimal("150.00"));
        when(orcamentos.findFirstByAtendimento_IdOrderByVersaoDesc(10L)).thenReturn(Optional.of(proposta));
        service.invalidarSeAlterado(atendimento);
        assertEquals("SUBSTITUIDO", proposta.getStatus());
        assertEquals("EM_DIAGNOSTICO", atendimento.getStatusAtendimento());
        assertFalse(atendimento.getAprovado());
    }
}
