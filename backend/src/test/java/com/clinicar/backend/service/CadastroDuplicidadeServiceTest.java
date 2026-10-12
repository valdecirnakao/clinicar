package com.clinicar.backend.service;
import com.clinicar.backend.dto.*;
import com.clinicar.backend.mapper.PecaMapper;
import com.clinicar.backend.model.Peca;
import com.clinicar.backend.repository.*;
import org.junit.jupiter.api.Test;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
class CadastroDuplicidadeServiceTest {
    @Test void rejeitaEdicaoDuplicadaMasPermiteManterProprioCadastro() {
        var repo = mock(PecaRepository.class); var service = new PecaService(repo, new PecaMapper());
        var request = new PecaRequest(); request.setNome("Filtro"); request.setFabricante("Marca"); request.setTipo("Filtro"); request.setUnidade("Unidade");
        var atual = new Peca(); atual.setId(8L);
        var existente = new Peca(); new PecaMapper().preencherEntidade(existente,request); existente.setId(7L);
        when(repo.findById(8L)).thenReturn(java.util.Optional.of(atual));
        when(repo.findByNomeIgnoreCaseAndFabricanteIgnoreCase("Filtro","Marca")).thenReturn(List.of(existente, atual));
        assertThrows(IllegalArgumentException.class, () -> service.atualizar(8L, request)); verify(repo,never()).save(any());
        when(repo.findByNomeIgnoreCaseAndFabricanteIgnoreCase("Filtro","Marca")).thenReturn(List.of(atual));
        assertDoesNotThrow(() -> service.atualizar(8L, request));
    }
    @Test void rejeitaOleoComMesmaIdentidadeMesmoComApiDiferente() {
        var repo = mock(PecaRepository.class); var service = new PecaService(repo, new PecaMapper());
        var request = new PecaRequest(); request.setNome("Óleo"); request.setFabricante("Marca"); request.setTipo("Óleo de motor"); request.setUnidade("Litro");
        request.setModelo("Linha"); request.setOrigemOleo("SINTETICO"); request.setViscosidadeSae("5W30"); request.setClassificacaoApi("SP");
        var existente = new Peca(); new PecaMapper().preencherEntidade(existente,request); existente.setId(7L); existente.setClassificacaoApi("SN");
        when(repo.findByNomeIgnoreCaseAndFabricanteIgnoreCase("Óleo","Marca")).thenReturn(List.of(existente));
        assertThrows(IllegalArgumentException.class, () -> service.criar(request));
        request.setViscosidadeSae("10W40"); assertDoesNotThrow(() -> service.criar(request));
    }
    @Test void rejeitaPecaIdenticaMasPermiteOutroFabricante() {
        var repo = mock(PecaRepository.class); var service = new PecaService(repo, new PecaMapper());
        var request = new PecaRequest(); request.setNome("Filtro"); request.setFabricante("Marca"); request.setTipo("Filtro"); request.setUnidade("Unidade"); request.setEspecificacao("ABC");
        var existente = new Peca(); new PecaMapper().preencherEntidade(existente,request); existente.setId(7L);
        when(repo.findByNomeIgnoreCaseAndFabricanteIgnoreCase("Filtro","Marca")).thenReturn(List.of(existente));
        assertThrows(IllegalArgumentException.class, () -> service.criar(request)); verify(repo,never()).save(any());
        request.setFabricante("Outra marca"); assertDoesNotThrow(() -> service.criar(request)); verify(repo).save(any());
    }
    @Test void rejeitaVinculoFornecedorPecaAntesDePersistir() {
        var repo = mock(FornecimentoPecasRepository.class);
        var service = new FornecimentoPecasService(repo,mock(FornecedorRepository.class),mock(PecaRepository.class));
        var request = new FornecimentoPecasRequest(); request.setIdFornecedor(7L); request.setIdPeca(12L);
        when(repo.existsByFornecedor_IdAndPeca_IdAndIdNot(7L,12L,-1L)).thenReturn(true);
        assertThrows(IllegalArgumentException.class, () -> service.criar(request)); verify(repo,never()).save(any());
    }
}
