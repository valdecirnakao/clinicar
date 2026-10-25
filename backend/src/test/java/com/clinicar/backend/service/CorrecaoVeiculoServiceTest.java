package com.clinicar.backend.service;

import com.clinicar.backend.model.SolicitacaoCorrecaoVeiculo;
import com.clinicar.backend.model.Veiculo;
import com.clinicar.backend.repository.AgendamentoRepository;
import com.clinicar.backend.repository.AtendimentoRepository;
import com.clinicar.backend.repository.SolicitacaoCorrecaoVeiculoRepository;
import com.clinicar.backend.repository.VeiculoRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CorrecaoVeiculoServiceTest {
    @Mock VeiculoRepository veiculos;
    @Mock SolicitacaoCorrecaoVeiculoRepository solicitacoes;
    @Mock VeiculoService veiculoService;
    @Mock AgendamentoRepository agendamentos;
    @Mock AtendimentoRepository atendimentos;
    @InjectMocks CorrecaoVeiculoService service;

    private Veiculo veiculo() {
        var v = new Veiculo(); v.setId(10L); v.setIdProprietario(3L);
        v.setPlaca("ABC1234"); v.setFabricante("Ford"); v.setModelo("Ka");
        v.setAnoModeloCombustivel("2020 Flex"); v.setCor("Azul");
        return v;
    }

    private CorrecaoVeiculoService.DadosSolicitados dados() {
        return new CorrecaoVeiculoService.DadosSolicitados("ABC1D34", "Ford", "Ka", "2020 Flex",
                "A placa cadastrada está incorreta.");
    }

    private SolicitacaoCorrecaoVeiculo pendente() {
        var p = new SolicitacaoCorrecaoVeiculo(); p.setId(20L); p.setVeiculoId(10L);
        p.setClienteId(3L); p.setPendenciaVeiculoId(10L); p.setStatus("PENDENTE");
        p.setPlacaAnterior("ABC1234"); p.setFabricanteAnterior("Ford");
        p.setModeloAnterior("Ka"); p.setAnoModeloCombustivelAnterior("2020 Flex");
        p.setPlacaSolicitada("ABC1D34"); p.setFabricanteSolicitado("Ford");
        p.setModeloSolicitado("Ka"); p.setAnoModeloCombustivelSolicitado("2020 Flex");
        return p;
    }

    @Test void somenteProprietarioSolicita() {
        when(veiculos.buscarParaExclusao(10L)).thenReturn(Optional.of(veiculo()));
        var erro = assertThrows(ResponseStatusException.class, () -> service.solicitar(9L, 10L, dados()));
        assertEquals(403, erro.getStatusCode().value());
        verify(solicitacoes, never()).saveAndFlush(any());
    }

    @Test void semHistoricoEditarDiretamente() {
        when(veiculos.buscarParaExclusao(10L)).thenReturn(Optional.of(veiculo()));
        var erro = assertThrows(ResponseStatusException.class, () -> service.solicitar(3L, 10L, dados()));
        assertEquals(409, erro.getStatusCode().value());
    }

    @Test void impedeDuasSolicitacoesPendentes() {
        when(veiculos.buscarParaExclusao(10L)).thenReturn(Optional.of(veiculo()));
        when(veiculoService.possuiHistorico(10L)).thenReturn(true);
        when(solicitacoes.findByPendenciaVeiculoId(10L)).thenReturn(Optional.of(pendente()));
        var erro = assertThrows(ResponseStatusException.class, () -> service.solicitar(3L, 10L, dados()));
        assertEquals(409, erro.getStatusCode().value());
    }

    @Test void aprovacaoRejeitaAlteracaoPosteriorDoCadastro() {
        var atual = veiculo(); atual.setPlaca("ZZZ9999");
        when(solicitacoes.buscarParaDecisao(20L)).thenReturn(Optional.of(pendente()));
        when(veiculos.buscarParaExclusao(10L)).thenReturn(Optional.of(atual));
        var erro = assertThrows(ResponseStatusException.class, () -> service.decidir(20L, 1L,
                new CorrecaoVeiculoService.Decisao("APROVAR", "Conferido no documento.")));
        assertEquals(409, erro.getStatusCode().value());
        verify(veiculoService, never()).atualizar(any(), any());
    }

    @Test void aprovacaoPreservaHistoricoEAtualizaCadastro() {
        var p = pendente();
        when(solicitacoes.buscarParaDecisao(20L)).thenReturn(Optional.of(p));
        when(veiculos.buscarParaExclusao(10L)).thenReturn(Optional.of(veiculo()));
        when(agendamentos.findByVeiculo_IdOrderByDataHoraInicioDesc(10L)).thenReturn(List.of());
        when(atendimentos.findByVeiculo_IdOrderByCriadoEmDesc(10L)).thenReturn(List.of());
        when(solicitacoes.saveAndFlush(p)).thenReturn(p);
        service.decidir(20L, 1L, new CorrecaoVeiculoService.Decisao("APROVAR", "Conferido no documento."));
        verify(veiculoService).atualizar(eq(10L), argThat(v -> "ABC1D34".equals(v.getPlaca())
                && "Azul".equals(v.getCor()) && Long.valueOf(3).equals(v.getIdProprietario())));
        assertEquals("APROVADA", p.getStatus());
        assertNull(p.getPendenciaVeiculoId());
        assertEquals(1L, p.getAdministradorId());
    }

    @Test void recusaNaoAlteraVeiculo() {
        var p = pendente();
        when(solicitacoes.buscarParaDecisao(20L)).thenReturn(Optional.of(p));
        when(solicitacoes.saveAndFlush(p)).thenReturn(p);
        service.decidir(20L, 1L, new CorrecaoVeiculoService.Decisao("RECUSAR", "Documento não comprova."));
        assertEquals("RECUSADA", p.getStatus());
        verifyNoInteractions(veiculoService, veiculos);
    }
}
