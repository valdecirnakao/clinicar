package com.clinicar.backend.service;

import com.clinicar.backend.dto.FornecimentoServicoRequest;
import com.clinicar.backend.model.*;
import com.clinicar.backend.repository.*;
import com.clinicar.backend.util.MensagemDuplicidade;
import org.junit.jupiter.api.Test;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class FornecimentoServicoFluxoTest {
    private final FornecimentoServicoRepository repo = mock(FornecimentoServicoRepository.class);
    private final FornecedorRepository fornecedores = mock(FornecedorRepository.class);
    private final ServicoRepository servicos = mock(ServicoRepository.class);
    private final FornecimentoServicoService service = new FornecimentoServicoService(repo, fornecedores, servicos);
    private FornecimentoServicoRequest request() {
        var r = new FornecimentoServicoRequest(); r.setIdFornecedor(7L); r.setIdServico(12L);
        r.setValorCusto("40"); r.setPrazoExecucao("2"); r.setQuantidadeMinima(1);
        r.setUnidadeCobranca("SERVICO"); r.setUnidadePrazo("DIA"); r.setDisponibilidade("SOB_DEMANDA"); return r;
    }
    @Test void servicoInativoNaoRecebeNovoVinculoMasPreservaEdicaoHistorica() {
        var f = new Fornecedor(); f.setId(7L); var s = new Servico(); s.setId(12L); s.setAtivo(false);
        when(fornecedores.findById(7L)).thenReturn(Optional.of(f)); when(servicos.findById(12L)).thenReturn(Optional.of(s));
        assertTrue(assertThrows(IllegalArgumentException.class, () -> service.criar(request())).getMessage().contains("serviço ativo"));
        var existente = new FornecimentoServico(); existente.setId(18L); existente.setFornecedor(f); existente.setServico(s);
        when(repo.findById(18L)).thenReturn(Optional.of(existente)); when(repo.save(any())).thenAnswer(i -> i.getArgument(0));
        assertEquals(18L, service.atualizar(18L, request()).getId());
        var outro = new Fornecedor(); outro.setId(8L); when(fornecedores.findById(8L)).thenReturn(Optional.of(outro));
        var r = request(); r.setIdFornecedor(8L);
        assertThrows(IllegalArgumentException.class, () -> service.atualizar(18L, r)); verify(repo, times(1)).save(any());
    }
    @Test void parDuplicadoInclusiveInativoExigeAtualizacao() {
        var existente = new FornecimentoServico(); existente.setId(18L); existente.setAtivo(false);
        when(repo.findByFornecedor_IdAndServico_Id(7L,12L)).thenReturn(Optional.of(existente));
        assertTrue(assertThrows(IllegalArgumentException.class, () -> service.criar(request())).getMessage().contains("Já existe"));
        verify(repo, never()).save(any());
    }
    @Test void restricaoDeAmbasAsVersoesDoBancoRetornaMensagemClara() {
        for (String indice : new String[]{"uk_fornecedor_servico", "uk_fornecimento_servico"})
            assertEquals("Já existe um fornecimento cadastrado para este fornecedor e serviço.", MensagemDuplicidade.obter(new RuntimeException("Duplicate entry for key " + indice)));
    }
}
