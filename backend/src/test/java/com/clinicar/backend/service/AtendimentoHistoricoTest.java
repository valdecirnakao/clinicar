package com.clinicar.backend.service;

import com.clinicar.backend.model.Atendimento;
import com.clinicar.backend.model.Veiculo;
import com.clinicar.backend.repository.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AtendimentoHistoricoTest {
    @Mock AtendimentoRepository repository;
    @Mock AgendamentoRepository agendamentos;
    @Mock UsuarioRepository usuarios;
    @Mock FornecedorRepository fornecedores;
    @Mock OrdemServicoEnvioService envio;
    @Mock AtendimentoEstoqueService estoque;
    @Mock AgendamentoPecaPrevistaRepository pecasPrevistas;
    @Mock AtendimentoPecaUtilizadaRepository pecasUtilizadas;
    @Mock ReservaEstoqueAgendamentoService reservas;
    @Mock AtendimentoTotaisService totais;
    @Mock AtendimentoServicoExecutadoService servicos;
    @Mock PrevisaoManutencaoService previsoes;
    @InjectMocks AtendimentoService service;

    @Test
    void conclusaoPreservaVeiculoAntesDaEntregaEEmissao() {
        Veiculo veiculo = new Veiculo();
        veiculo.setPlaca("ABC1234");
        veiculo.setModelo("Corolla");
        Atendimento atendimento = new Atendimento();
        atendimento.setId(1L);
        atendimento.setStatusAtendimento("EM_EXECUCAO");
        atendimento.setVeiculo(veiculo);
        atendimento.setQuilometragemEntrada(100);
        atendimento.setQuilometragemSaida(105);
        when(repository.findById(1L)).thenReturn(Optional.of(atendimento));
        when(repository.save(atendimento)).thenReturn(atendimento);
        when(totais.recalcularTotais(1L)).thenReturn(atendimento);
        service.concluir(1L);
        assertNotNull(atendimento.getVeiculoPreservadoEm());
        assertEquals("CONCLUIDO", atendimento.getStatusAtendimento());
        veiculo.setPlaca("XYZ9999");
        veiculo.setModelo("Yaris");
        when(repository.buscarParaEmissaoOs(1L)).thenReturn(Optional.of(atendimento));
        when(envio.enviarOrdemServicoPorEmail(atendimento)).thenReturn(atendimento);
        service.entregar(1L);
        assertEquals("ABC1234", atendimento.placaVeiculoDoAtendimento());
        assertEquals("Corolla", atendimento.modeloVeiculoDoAtendimento());
        verify(envio).enviarOrdemServicoPorEmail(atendimento);
    }

    @Test
    void reenvioBloqueiaAtendimentoAberto() {
        Atendimento atendimento = new Atendimento();
        atendimento.setStatusAtendimento("ABERTO");
        when(repository.buscarParaEmissaoOs(1L)).thenReturn(Optional.of(atendimento));
        assertThrows(IllegalArgumentException.class, () -> service.reenviarOrdemServicoEmail(1L));
        verifyNoInteractions(envio);
    }

    @Test
    void conclusaoSemKmOuComKmInvalidoNaoExecutaBaixaNemSalva() {
        Atendimento atendimento = new Atendimento();
        atendimento.setStatusAtendimento("EM_EXECUCAO");
        atendimento.setQuilometragemEntrada(100);
        when(repository.findById(1L)).thenReturn(Optional.of(atendimento));
        assertTrue(assertThrows(IllegalArgumentException.class, () -> service.concluir(1L)).getMessage().contains("Informe"));
        assertThrows(IllegalArgumentException.class, () -> service.concluir(1L, -1));
        assertThrows(IllegalArgumentException.class, () -> service.concluir(1L, 99));
        assertEquals("EM_EXECUCAO", atendimento.getStatusAtendimento());
        assertNull(atendimento.getQuilometragemSaida());
        verify(repository, never()).save(any());
        verifyNoInteractions(estoque, servicos, previsoes, envio, reservas);
    }

    @Test
    void conclusaoGravaKmInformadoEPermiteEntradaESaidaZero() {
        Atendimento atendimento = new Atendimento();
        atendimento.setVeiculo(new Veiculo());
        atendimento.setId(1L);
        atendimento.setStatusAtendimento("EM_EXECUCAO");
        atendimento.setQuilometragemEntrada(0);
        when(repository.findById(1L)).thenReturn(Optional.of(atendimento));
        when(repository.save(atendimento)).thenReturn(atendimento);
        when(totais.recalcularTotais(1L)).thenReturn(atendimento);
        service.concluir(1L, 0);
        assertEquals(0, atendimento.getQuilometragemSaida());
        assertEquals("CONCLUIDO", atendimento.getStatusAtendimento());
        verify(estoque).baixarPecasDoAtendimento(atendimento);
    }

    @Test
    void repetirConclusaoNaoAlteraKmNemExecutaNovaBaixa() {
        Atendimento atendimento = new Atendimento();
        atendimento.setStatusAtendimento("CONCLUIDO");
        atendimento.setQuilometragemSaida(105);
        when(repository.findById(1L)).thenReturn(Optional.of(atendimento));
        service.concluir(1L, 200);
        assertEquals(105, atendimento.getQuilometragemSaida());
        verifyNoInteractions(estoque, servicos, previsoes);
    }
}
