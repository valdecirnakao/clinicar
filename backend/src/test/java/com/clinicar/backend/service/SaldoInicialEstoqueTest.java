package com.clinicar.backend.service;

import com.clinicar.backend.dto.EstoquePecaRequest;
import com.clinicar.backend.dto.UsuarioResponse;
import com.clinicar.backend.model.EstoquePeca;
import com.clinicar.backend.model.LocalEstoque;
import com.clinicar.backend.model.MovimentacaoEstoquePeca;
import com.clinicar.backend.model.Peca;
import com.clinicar.backend.repository.EstoquePecaRepository;
import com.clinicar.backend.repository.FornecedorRepository;
import com.clinicar.backend.repository.LocalEstoqueRepository;
import com.clinicar.backend.repository.MovimentacaoEstoquePecaRepository;
import com.clinicar.backend.repository.PecaRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.math.BigDecimal;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class SaldoInicialEstoqueTest {
    private final EstoquePecaRepository estoques = mock(EstoquePecaRepository.class);
    private final PecaRepository pecas = mock(PecaRepository.class);
    private final LocalEstoqueRepository locais = mock(LocalEstoqueRepository.class);
    private final MovimentacaoEstoquePecaRepository movimentos = mock(MovimentacaoEstoquePecaRepository.class);
    private final AlertaEstoquePecaService alertas = mock(AlertaEstoquePecaService.class);
    private final EstoquePecaService service = new EstoquePecaService(estoques, pecas, locais, movimentos,
            alertas, mock(FornecedorRepository.class));

    @AfterEach void limparSessao() {
        RequestContextHolder.resetRequestAttributes();
    }

    private EstoquePecaRequest pedido(String quantidade, String custo) {
        var pedido = new EstoquePecaRequest();
        pedido.setIdPeca(10L);
        pedido.setIdLocalEstoque(20L);
        pedido.setQuantidadeAtual(quantidade);
        pedido.setQuantidadeReservada("0");
        pedido.setEstoqueMinimo("5");
        pedido.setEstoqueCritico("2");
        pedido.setCustoMedio(custo);
        return pedido;
    }

    private void prepararCadastro() {
        var peca = new Peca(); peca.setId(10L);
        var local = new LocalEstoque(); local.setId(20L);
        when(pecas.findById(10L)).thenReturn(Optional.of(peca));
        when(locais.findById(20L)).thenReturn(Optional.of(local));
        when(estoques.findByPeca_IdAndLocalEstoque_Id(10L, 20L)).thenReturn(Optional.empty());
        when(estoques.save(any())).thenAnswer(chamada -> {
            EstoquePeca estoque = chamada.getArgument(0);
            estoque.setId(30L);
            return estoque;
        });
    }

    @Test void quantidadeInicialPositivaGeraUmaEntradaComAutorESaldos() {
        prepararCadastro();
        var usuario = new UsuarioResponse(); usuario.setId(7L); usuario.setNome("Ana Administradora");
        var requisicao = new MockHttpServletRequest();
        requisicao.setAttribute("usuarioLogado", usuario);
        RequestContextHolder.setRequestAttributes(new ServletRequestAttributes(requisicao));

        EstoquePeca salvo = service.criar(pedido("10", "30"));

        var captor = ArgumentCaptor.forClass(MovimentacaoEstoquePeca.class);
        verify(movimentos, times(1)).save(captor.capture());
        var movimento = captor.getValue();
        assertSame(salvo, movimento.getEstoquePeca());
        assertEquals("ENTRADA", movimento.getTipoMovimento());
        assertEquals("INVENTARIO_INICIAL", movimento.getOrigem());
        assertEquals(0, movimento.getQuantidade().compareTo(new BigDecimal("10")));
        assertEquals(0, movimento.getSaldoAnterior().compareTo(BigDecimal.ZERO));
        assertEquals(0, movimento.getSaldoPosterior().compareTo(new BigDecimal("10")));
        assertEquals(0, movimento.getValorUnitario().compareTo(new BigDecimal("30")));
        assertEquals(0, movimento.getValorTotal().compareTo(new BigDecimal("300")));
        assertEquals(7L, movimento.getIdUsuario());
        assertEquals("Ana Administradora", movimento.getNomeUsuario());
        verify(estoques, times(1)).save(any());
    }

    @Test void quantidadeInicialZeroNaoGeraMovimentacao() {
        prepararCadastro();
        service.criar(pedido("0", null));
        verify(movimentos, never()).save(any());
    }

    @Test void quantidadeInicialPositivaSemCustoNaoCriaControle() {
        prepararCadastro();
        assertThrows(IllegalArgumentException.class, () -> service.criar(pedido("10", null)));
        verify(estoques, never()).save(any());
        verify(movimentos, never()).save(any());
    }

    @Test void edicaoDaConfiguracaoNaoPodeAlterarSaldoSemMovimentacao() {
        var existente = new EstoquePeca();
        existente.setId(30L);
        existente.setQuantidadeAtual(new BigDecimal("10"));
        existente.setQuantidadeReservada(BigDecimal.ZERO);
        when(estoques.buscarComLockPorId(30L)).thenReturn(Optional.of(existente));

        var pedido = pedido("9", "30");
        var erro = assertThrows(org.springframework.web.server.ResponseStatusException.class,
                () -> service.atualizar(30L, pedido, false));
        assertEquals(403, erro.getStatusCode().value());
        verify(estoques, never()).save(any());
    }
}
