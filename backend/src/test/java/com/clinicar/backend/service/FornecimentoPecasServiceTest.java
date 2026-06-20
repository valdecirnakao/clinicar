package com.clinicar.backend.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.clinicar.backend.dto.FornecimentoPecasRequest;
import com.clinicar.backend.model.Fornecedor;
import com.clinicar.backend.model.FornecimentoPecas;
import com.clinicar.backend.model.Peca;
import com.clinicar.backend.repository.FornecedorRepository;
import com.clinicar.backend.repository.FornecimentoPecasRepository;
import com.clinicar.backend.repository.PecaRepository;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class FornecimentoPecasServiceTest {

    @Mock
    private FornecimentoPecasRepository repo;

    @Mock
    private FornecedorRepository fornecedorRepository;

    @Mock
    private PecaRepository pecaRepository;

    @InjectMocks
    private FornecimentoPecasService service;

    @Test
    void criarMontaRelacionamentosEConverteValores() {
        Fornecedor fornecedor = new Fornecedor();
        fornecedor.setId(1L);
        Peca peca = new Peca();
        peca.setId(2L);

        FornecimentoPecasRequest req = new FornecimentoPecasRequest();
        req.setIdFornecedor(1L);
        req.setIdPeca(2L);
        req.setValorCusto("R$ 1.234,56");
        req.setPrazoEntregaDias("15 dias");
        req.setQuantidadeMinima("3 unidades");
        req.setAtivo("sim");
        req.setDataCadastro("31/12/2024");

        when(fornecedorRepository.findById(1L)).thenReturn(Optional.of(fornecedor));
        when(pecaRepository.findById(2L)).thenReturn(Optional.of(peca));
        when(repo.save(any(FornecimentoPecas.class))).thenAnswer(invocation -> invocation.getArgument(0));

        FornecimentoPecas salvo = service.criar(req);

        ArgumentCaptor<FornecimentoPecas> captor = ArgumentCaptor.forClass(FornecimentoPecas.class);
        verify(repo).save(captor.capture());

        FornecimentoPecas entity = captor.getValue();
        assertEquals(fornecedor, entity.getFornecedor());
        assertEquals(peca, entity.getPeca());
        assertEquals(new BigDecimal("1234.56"), entity.getValorCusto());
        assertEquals(15, entity.getPrazoEntregaDias());
        assertEquals(3, entity.getQuantidadeMinima());
        assertTrue(entity.getAtivo());
        assertEquals(LocalDate.of(2024, 12, 31), entity.getDataCadastro());
        assertEquals(entity, salvo);
    }

    @Test
    void criarLancaQuandoFornecedorNaoExiste() {
        FornecimentoPecasRequest req = new FornecimentoPecasRequest();
        req.setIdFornecedor(1L);
        req.setIdPeca(2L);

        when(fornecedorRepository.findById(1L)).thenReturn(Optional.empty());

        assertThrows(NoSuchElementException.class, () -> service.criar(req));
    }

    @Test
    void criarLancaQuandoPecaNaoExiste() {
        FornecimentoPecasRequest req = new FornecimentoPecasRequest();
        req.setIdFornecedor(1L);
        req.setIdPeca(2L);

        when(fornecedorRepository.findById(1L)).thenReturn(Optional.of(new Fornecedor()));
        when(pecaRepository.findById(2L)).thenReturn(Optional.empty());

        assertThrows(NoSuchElementException.class, () -> service.criar(req));
    }

    @Test
    void atualizarSubstituiValoresDoRegistroExistente() {
        FornecimentoPecas existente = new FornecimentoPecas();
        existente.setId(99L);

        Fornecedor fornecedor = new Fornecedor();
        fornecedor.setId(1L);
        Peca peca = new Peca();
        peca.setId(2L);

        FornecimentoPecasRequest req = new FornecimentoPecasRequest();
        req.setIdFornecedor(1L);
        req.setIdPeca(2L);
        req.setValorCusto("10,50");
        req.setPrazoEntregaDias("7");
        req.setQuantidadeMinima("2");
        req.setAtivo("false");
        req.setDataCadastro("2025-01-02");

        when(repo.findById(99L)).thenReturn(Optional.of(existente));
        when(fornecedorRepository.findById(1L)).thenReturn(Optional.of(fornecedor));
        when(pecaRepository.findById(2L)).thenReturn(Optional.of(peca));
        when(repo.save(any(FornecimentoPecas.class))).thenAnswer(invocation -> invocation.getArgument(0));

        FornecimentoPecas salvo = service.atualizar(99L, req);

        assertEquals(fornecedor, salvo.getFornecedor());
        assertEquals(peca, salvo.getPeca());
        assertEquals(new BigDecimal("10.50"), salvo.getValorCusto());
        assertEquals(7, salvo.getPrazoEntregaDias());
        assertEquals(2, salvo.getQuantidadeMinima());
        assertFalse(salvo.getAtivo());
        assertEquals(LocalDate.of(2025, 1, 2), salvo.getDataCadastro());
    }

    @Test
    void listarBuscarERemoverDelegamParaRepositorio() {
        FornecimentoPecas entity = new FornecimentoPecas();
        entity.setId(1L);

        when(repo.findAll()).thenReturn(List.of(entity));
        when(repo.findById(1L)).thenReturn(Optional.of(entity));
        when(repo.existsById(1L)).thenReturn(true);

        assertEquals(1, service.listarTodos().size());
        assertEquals(entity, service.buscarPorId(1L));
        assertTrue(service.remover(1L));

        verify(repo).deleteById(1L);
    }

    @Test
    void removerRetornaFalsoQuandoRegistroNaoExiste() {
        when(repo.existsById(2L)).thenReturn(false);

        assertFalse(service.remover(2L));
    }
}