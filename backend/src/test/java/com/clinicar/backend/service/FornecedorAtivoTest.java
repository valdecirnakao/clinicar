package com.clinicar.backend.service;

import com.clinicar.backend.dto.FornecedorRequest;
import com.clinicar.backend.dto.FornecimentoPecasRequest;
import com.clinicar.backend.mapper.FornecedorMapper;
import com.clinicar.backend.model.Fornecedor;
import com.clinicar.backend.model.FornecimentoPecas;
import com.clinicar.backend.model.Peca;
import com.clinicar.backend.repository.*;
import org.junit.jupiter.api.Test;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class FornecedorAtivoTest {
    @Test void novoFornecedorAtivoPorPadraoEStatusPreservadoQuandoOmitido() {
        var repo = mock(FornecedorRepository.class);
        when(repo.save(any())).thenAnswer(i -> i.getArgument(0));
        var service = new FornecedorService(repo);
        var request = new FornecedorRequest(); request.setCnpj("12345678000190");
        assertTrue(service.criar(request).isAtivo());
        var existente = new Fornecedor(); existente.setId(7L); existente.setAtivo(false);
        when(repo.findById(7L)).thenReturn(Optional.of(existente));
        assertFalse(service.atualizar(7L, request).isAtivo());
        request.setAtivo(true);
        assertTrue(service.atualizar(7L, request).isAtivo());
        assertTrue(new FornecedorMapper().toResponse(existente).isAtivo());
    }
    @Test void fornecedorInativoNaoRecebeNovoVinculoMasPermiteManterHistorico() {
        var repo = mock(FornecimentoPecasRepository.class);
        var fornecedores = mock(FornecedorRepository.class);
        var pecas = mock(PecaRepository.class);
        var service = new FornecimentoPecasService(repo, fornecedores, pecas);
        var fornecedor = new Fornecedor(); fornecedor.setId(7L); fornecedor.setAtivo(false);
        var peca = new Peca(); peca.setId(12L);
        when(fornecedores.findById(7L)).thenReturn(Optional.of(fornecedor));
        when(pecas.findById(12L)).thenReturn(Optional.of(peca));
        var request = new FornecimentoPecasRequest(); request.setIdFornecedor(7L); request.setIdPeca(12L);
        assertThrows(IllegalArgumentException.class, () -> service.criar(request));
        verify(repo, never()).save(any());
        var existente = new FornecimentoPecas(); existente.setId(18L); existente.setFornecedor(fornecedor); existente.setPeca(peca);
        when(repo.findById(18L)).thenReturn(Optional.of(existente));
        assertDoesNotThrow(() -> service.atualizar(18L, request));
        var outra = new Peca(); outra.setId(13L); when(pecas.findById(13L)).thenReturn(Optional.of(outra)); request.setIdPeca(13L);
        assertThrows(IllegalArgumentException.class, () -> service.atualizar(18L, request));
        verify(repo, times(1)).save(any());
    }
}
