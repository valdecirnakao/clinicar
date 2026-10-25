package com.clinicar.backend.service;

import com.clinicar.backend.dto.MovimentacaoEstoquePecaRequest;
import com.clinicar.backend.model.EstoquePeca;
import com.clinicar.backend.model.MovimentacaoEstoquePeca;
import com.clinicar.backend.repository.*;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import java.math.BigDecimal;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class OrigemMovimentacaoEstoqueTest {
    private final EstoquePecaRepository estoque = mock(EstoquePecaRepository.class);
    private final MovimentacaoEstoquePecaRepository movimentos = mock(MovimentacaoEstoquePecaRepository.class);
    private final FornecedorRepository fornecedores = mock(FornecedorRepository.class);
    private final EstoquePecaService service = new EstoquePecaService(estoque, mock(PecaRepository.class),
            mock(LocalEstoqueRepository.class), movimentos, mock(AlertaEstoquePecaService.class), fornecedores);

    private MovimentacaoEstoquePecaRequest request(String origem) {
        var request = new MovimentacaoEstoquePecaRequest();
        request.setOrigem(origem); request.setQuantidade("5"); request.setValorUnitario("30");
        request.setMotivo("Justificativa do teste"); request.setIdFornecedor(3L);
        return request;
    }

    private void prepararEstoque() {
        var fornecedor = new com.clinicar.backend.model.Fornecedor(); fornecedor.setId(3L); fornecedor.setRazaoSocial("Fornecedor de teste"); fornecedor.setAtivo(true);
        when(fornecedores.findById(3L)).thenReturn(Optional.of(fornecedor));
        var registro = new EstoquePeca(); registro.setId(1L); registro.setQuantidadeAtual(new BigDecimal("10"));
        registro.setCustoMedio(new BigDecimal("40"));
        when(estoque.buscarComLockPorId(1L)).thenReturn(Optional.of(registro));
        when(estoque.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
    }

    @Test void rejeitaOrigemAusenteIncompativelOuAutomaticaAntesDeAlterarSaldo() {
        for (String origem : new String[]{null, "", "CONSUMO_INTERNO", "ATENDIMENTO", "MANUAL"}) {
            assertThrows(IllegalArgumentException.class, () -> service.registrarEntrada(1L, request(origem)));
        }
        assertThrows(IllegalArgumentException.class, () -> service.registrarSaida(1L, request("COMPRA")));
        var ajuste = request("COMPRA"); ajuste.setTipoMovimento("AJUSTE_ENTRADA");
        assertThrows(IllegalArgumentException.class, () -> service.registrarAjuste(1L, ajuste));
        verifyNoInteractions(estoque, movimentos);
    }

    @Test void outraOrigemExigeMotivoEGravaJustificativa() {
        var request = request("OUTRA"); request.setMotivo("   ");
        assertThrows(IllegalArgumentException.class, () -> service.registrarEntrada(1L, request));
        verifyNoInteractions(estoque, movimentos);
        prepararEstoque(); request.setMotivo(" Recebimento de amostra para testes ");
        service.registrarEntrada(1L, request);
        var captor = ArgumentCaptor.forClass(MovimentacaoEstoquePeca.class);
        verify(movimentos).save(captor.capture());
        assertEquals("OUTRA", captor.getValue().getOrigem());
        assertEquals("Recebimento de amostra para testes", captor.getValue().getMotivo());
    }

    @Test void compraMantemCalculoDoCustoMedioEGravaOrigemNormalizada() {
        prepararEstoque(); var salvo = service.registrarEntrada(1L, request(" compra "));
        assertEquals(0, new BigDecimal("15").compareTo(salvo.getQuantidadeAtual()));
        assertEquals(new BigDecimal("36.67"), salvo.getCustoMedio());
        var captor = ArgumentCaptor.forClass(MovimentacaoEstoquePeca.class);
        verify(movimentos).save(captor.capture()); assertEquals("COMPRA", captor.getValue().getOrigem());
    }

    @Test void inventarioAceitoNosDoisSentidosSemAlterarCustoMedio() {
        prepararEstoque(); var request = request("INVENTARIO");
        request.setTipoMovimento("AJUSTE_ENTRADA"); service.registrarAjuste(1L, request);
        request.setTipoMovimento("AJUSTE_SAIDA"); var salvo = service.registrarAjuste(1L, request);
        assertEquals(0, new BigDecimal("10").compareTo(salvo.getQuantidadeAtual()));
        assertEquals(new BigDecimal("40"), salvo.getCustoMedio());
        verify(movimentos, times(2)).save(any());
    }

    @Test void compraExigeCustoPositivoAntesDeSalvar() {
        prepararEstoque();
        for (String custo : new String[]{null, "", "0", "-5"}) {
            var request = request("COMPRA"); request.setValorUnitario(custo);
            assertThrows(IllegalArgumentException.class, () -> service.registrarEntrada(1L, request));
        }
        verify(estoque, never()).save(any()); verifyNoInteractions(movimentos);
    }

    @Test void bonificacaoUsaZeroMesmoSeClienteEnviarOutroCusto() {
        prepararEstoque(); var salvo = service.registrarEntrada(1L, request("BONIFICACAO"));
        assertEquals(new BigDecimal("26.67"), salvo.getCustoMedio());
        var captor = ArgumentCaptor.forClass(MovimentacaoEstoquePeca.class);
        verify(movimentos).save(captor.capture()); assertEquals(0, captor.getValue().getValorUnitario().signum());
    }

    @Test void saidaUsaCustoDoEstoqueSemAceitarValorEnviadoPeloCliente() {
        prepararEstoque(); service.registrarSaida(1L, request("CONSUMO_INTERNO"));
        var captor = ArgumentCaptor.forClass(MovimentacaoEstoquePeca.class);
        verify(movimentos).save(captor.capture()); assertEquals(new BigDecimal("40"), captor.getValue().getValorUnitario());
    }

    @Test void ajusteSemCustoExistenteExigeCustoInicialEJustificativaSeZero() {
        prepararEstoque(); var registro = estoque.buscarComLockPorId(1L).orElseThrow(); registro.setCustoMedio(null);
        var request = request("INVENTARIO"); request.setTipoMovimento("AJUSTE_ENTRADA"); request.setValorUnitario("");
        assertThrows(IllegalArgumentException.class, () -> service.registrarAjuste(1L, request));
        request.setMotivo(""); request.setValorUnitario("0"); assertThrows(IllegalArgumentException.class, () -> service.registrarAjuste(1L, request));
        request.setMotivo("Peças recebidas gratuitamente na implantação");
        assertEquals(0, service.registrarAjuste(1L, request).getCustoMedio().signum());
    }

    @Test void devolucaoRecuperaCustoOriginalERejeitaQuantidadeJaDevolvida() {
        prepararEstoque(); var saida = new MovimentacaoEstoquePeca(); saida.setId(8L);
        saida.setEstoquePeca(estoque.buscarComLockPorId(1L).orElseThrow()); saida.setTipoMovimento("SAIDA");
        saida.setOrigem("CONSUMO_INTERNO"); saida.setQuantidade(new BigDecimal("3")); saida.setValorUnitario(new BigDecimal("20"));
        when(movimentos.findById(8L)).thenReturn(Optional.of(saida));
        var anterior = new MovimentacaoEstoquePeca(); anterior.setTipoMovimento("ENTRADA"); anterior.setQuantidade(BigDecimal.ONE);
        when(movimentos.findByIdMovimentacaoOrigem(8L)).thenReturn(java.util.List.of(anterior));
        var request = request("DEVOLUCAO_NAO_UTILIZADA"); request.setIdMovimentacaoOrigem(8L); request.setQuantidade("3");
        assertThrows(IllegalArgumentException.class, () -> service.registrarEntrada(1L, request));
        verify(estoque, never()).save(any());
        request.setQuantidade("2"); var salvo = service.registrarEntrada(1L, request);
        assertEquals(new BigDecimal("36.67"), salvo.getCustoMedio());
        var captor = ArgumentCaptor.forClass(MovimentacaoEstoquePeca.class);
        verify(movimentos).save(captor.capture()); assertEquals(8L, captor.getValue().getIdMovimentacaoOrigem());
        assertEquals(new BigDecimal("20"), captor.getValue().getValorUnitario());
        saida.setOrigem("ATENDIMENTO");
        assertThrows(IllegalArgumentException.class, () -> service.registrarEntrada(1L, request));
    }
    @Test void devolucaoExigeSaidaOriginal() {
        prepararEstoque();
        assertThrows(IllegalArgumentException.class, () -> service.registrarEntrada(1L, request("DEVOLUCAO_NAO_UTILIZADA")));
        verify(estoque, never()).save(any()); verifyNoInteractions(movimentos);
    }

    @Test void devolucaoAtendimentoUsaCustoDaSaidaPreservaCobrancaERegistraAutoriaDaSessao() {
        prepararEstoque();
        var atendimento = new com.clinicar.backend.model.Atendimento(); atendimento.setId(7L);
        atendimento.setCodigoAtendimento("ATD-TESTE"); atendimento.setStatusAtendimento("CONCLUIDO"); atendimento.setEstoqueBaixado(true);
        var saida = new MovimentacaoEstoquePeca(); saida.setId(8L); saida.setIdAtendimento(7L);
        saida.setEstoquePeca(estoque.buscarComLockPorId(1L).orElseThrow()); saida.setTipoMovimento("SAIDA");
        saida.setOrigem("ATENDIMENTO"); saida.setQuantidade(new BigDecimal("3"));
        saida.setValorUnitario(new BigDecimal("80")); saida.setCustoUnitarioEstoque(new BigDecimal("20"));
        when(movimentos.findById(8L)).thenReturn(Optional.of(saida));
        var request = request("DEVOLUCAO_NAO_UTILIZADA"); request.setIdMovimentacaoOrigem(8L); request.setQuantidade("2");
        request.setTratamentoCobranca("RESTITUICAO_PENDENTE"); request.setValorRestituicao("50"); request.setIdUsuario(999L);
        var usuario = new com.clinicar.backend.dto.UsuarioResponse(); usuario.setId(9L); usuario.setNome("Administrador responsável");
        var http = new org.springframework.mock.web.MockHttpServletRequest(); http.setAttribute("usuarioLogado", usuario);
        org.springframework.web.context.request.RequestContextHolder.setRequestAttributes(new org.springframework.web.context.request.ServletRequestAttributes(http));
        try {
            var salvo = service.registrarDevolucaoAtendimento(1L, request, atendimento);
            assertEquals(new BigDecimal("36.67"), salvo.getCustoMedio());
            var captor = ArgumentCaptor.forClass(MovimentacaoEstoquePeca.class); verify(movimentos).save(captor.capture());
            var devolucao = captor.getValue(); assertEquals(9L, devolucao.getIdUsuario());
            assertEquals("Administrador responsável", devolucao.getNomeUsuario()); assertEquals(7L, devolucao.getIdAtendimento());
            assertEquals(8L, devolucao.getIdMovimentacaoOrigem()); assertEquals("ATD-TESTE", devolucao.getDocumentoReferencia());
            assertEquals(new BigDecimal("50.00"), devolucao.getValorRestituicao()); assertEquals(new BigDecimal("20"), devolucao.getValorUnitario());
            assertEquals(new BigDecimal("80"), saida.getValorUnitario());
            request.setValorRestituicao("161"); assertThrows(IllegalArgumentException.class, () -> service.registrarDevolucaoAtendimento(1L, request, atendimento));
            request.setValorRestituicao("50"); saida.setIdAtendimento(99L);
            assertThrows(IllegalArgumentException.class, () -> service.registrarDevolucaoAtendimento(1L, request, atendimento));
            saida.setIdAtendimento(7L); atendimento.setEstoqueBaixado(false);
            assertThrows(IllegalArgumentException.class, () -> service.registrarDevolucaoAtendimento(1L, request, atendimento));
            verify(movimentos, times(1)).save(any());
        } finally { org.springframework.web.context.request.RequestContextHolder.resetRequestAttributes(); }
    }
    @Test void correcaoExigeOriginalERejeitaOutroEstoqueAtendimentoECorrecaoEmCadeia() {
        prepararEstoque(); var request = request("CORRECAO_LANCAMENTO"); request.setTipoMovimento("AJUSTE_ENTRADA");
        assertThrows(IllegalArgumentException.class, () -> service.registrarAjuste(1L, request));
        var original = new MovimentacaoEstoquePeca(); original.setId(8L); original.setTipoMovimento("SAIDA");
        original.setQuantidade(new BigDecimal("5")); original.setEstoquePeca(new EstoquePeca()); original.getEstoquePeca().setId(99L);
        when(movimentos.findById(8L)).thenReturn(Optional.of(original)); request.setIdMovimentacaoOrigem(8L);
        assertThrows(IllegalArgumentException.class, () -> service.registrarAjuste(1L, request));
        original.getEstoquePeca().setId(1L); original.setOrigem("ATENDIMENTO");
        assertThrows(IllegalArgumentException.class, () -> service.registrarAjuste(1L, request));
        original.setOrigem("CONSUMO_INTERNO"); original.setTipoMovimento("AJUSTE_SAIDA");
        assertThrows(IllegalArgumentException.class, () -> service.registrarAjuste(1L, request));
        verify(estoque, never()).save(any());
    }

    @Test void saldoInicialDeveSerCorrigidoPorAjusteDeInventarioEmVezDeAlterarSeuLancamento() {
        prepararEstoque();
        var original = new MovimentacaoEstoquePeca();
        original.setId(8L);
        original.setTipoMovimento("ENTRADA");
        original.setOrigem("INVENTARIO_INICIAL");
        original.setQuantidade(new BigDecimal("10"));
        original.setEstoquePeca(estoque.buscarComLockPorId(1L).orElseThrow());
        when(movimentos.findById(8L)).thenReturn(Optional.of(original));
        var pedido = request("CORRECAO_LANCAMENTO");
        pedido.setIdMovimentacaoOrigem(8L);
        assertThrows(IllegalArgumentException.class, () -> service.registrarAjuste(1L, pedido));
        verify(movimentos, never()).save(any());
    }

    @Test void correcaoConsideraHistoricoPreservaOriginalEPermiteAumentarQuantidadeRegistrada() {
        prepararEstoque(); var original = new MovimentacaoEstoquePeca(); original.setId(8L); original.setTipoMovimento("ENTRADA");
        original.setQuantidade(new BigDecimal("5")); original.setEstoquePeca(estoque.buscarComLockPorId(1L).orElseThrow());
        when(movimentos.findById(8L)).thenReturn(Optional.of(original));
        var anterior = new MovimentacaoEstoquePeca(); anterior.setTipoMovimento("AJUSTE_SAIDA"); anterior.setQuantidade(new BigDecimal("3"));
        when(movimentos.findByIdMovimentacaoOrigem(8L)).thenReturn(java.util.List.of(anterior));
        var request = request("CORRECAO_LANCAMENTO"); request.setTipoMovimento("AJUSTE_SAIDA"); request.setIdMovimentacaoOrigem(8L); request.setQuantidade("3");
        assertThrows(IllegalArgumentException.class, () -> service.registrarAjuste(1L, request));
        request.setQuantidade("2"); var salvo = service.registrarAjuste(1L, request);
        assertEquals(0, new BigDecimal("8").compareTo(salvo.getQuantidadeAtual())); assertEquals(new BigDecimal("40"), salvo.getCustoMedio());
        var captor = ArgumentCaptor.forClass(MovimentacaoEstoquePeca.class); verify(movimentos).save(captor.capture());
        assertEquals(8L, captor.getValue().getIdMovimentacaoOrigem()); assertEquals("CORRECAO_LANCAMENTO", captor.getValue().getOrigem());
        assertEquals(new BigDecimal("5"), original.getQuantidade());
        request.setTipoMovimento("AJUSTE_ENTRADA"); request.setQuantidade("9"); service.registrarAjuste(1L, request);
        verify(movimentos, times(2)).save(any());
    }

    @Test void correcaoDeSaidaConsideraDevolucaoAnteriorENaoConsomeReservas() {
        prepararEstoque(); var registro = estoque.buscarComLockPorId(1L).orElseThrow();
        var original = new MovimentacaoEstoquePeca(); original.setId(8L); original.setTipoMovimento("SAIDA");
        original.setQuantidade(new BigDecimal("5")); original.setEstoquePeca(registro);
        when(movimentos.findById(8L)).thenReturn(Optional.of(original));
        var devolucao = new MovimentacaoEstoquePeca(); devolucao.setTipoMovimento("ENTRADA"); devolucao.setQuantidade(new BigDecimal("4"));
        when(movimentos.findByIdMovimentacaoOrigem(8L)).thenReturn(java.util.List.of(devolucao));
        var request = request("CORRECAO_LANCAMENTO"); request.setTipoMovimento("AJUSTE_ENTRADA"); request.setIdMovimentacaoOrigem(8L); request.setQuantidade("2");
        assertThrows(IllegalArgumentException.class, () -> service.registrarAjuste(1L, request));
        registro.setQuantidadeReservada(new BigDecimal("9")); request.setTipoMovimento("AJUSTE_SAIDA");
        assertThrows(IllegalArgumentException.class, () -> service.registrarAjuste(1L, request));
        verify(estoque, never()).save(any());
    }
    private MovimentacaoEstoquePeca movimento(Long id, String tipo, String origem, String quantidade) {
        var m = new MovimentacaoEstoquePeca(); m.setId(id); m.setTipoMovimento(tipo); m.setOrigem(origem);
        m.setQuantidade(new BigDecimal(quantidade)); m.setEstoquePeca(estoque.buscarComLockPorId(1L).orElseThrow());
        when(movimentos.findById(id)).thenReturn(Optional.of(m)); return m;
    }

    @Test void compraExigeFornecedorAtivoEExistente() {
        prepararEstoque(); var r = request("COMPRA"); r.setIdFornecedor(null);
        assertThrows(IllegalArgumentException.class, () -> service.registrarEntrada(1L, r));
        r.setIdFornecedor(99L); assertThrows(IllegalArgumentException.class, () -> service.registrarEntrada(1L, r));
        r.setIdFornecedor(3L); fornecedores.findById(3L).orElseThrow().setAtivo(false);
        assertThrows(IllegalArgumentException.class, () -> service.registrarEntrada(1L, r));
        verify(estoque, never()).save(any()); verify(movimentos, never()).save(any());
    }

    @Test void devolucaoExigeRecebimentoDoMesmoEstoqueMotivoEFornecedorCorreto() {
        prepararEstoque(); var r = request("DEVOLUCAO_FORNECEDOR");
        assertThrows(IllegalArgumentException.class, () -> service.registrarSaida(1L, r));
        var recebimento = movimento(8L, "ENTRADA", "COMPRA", "10"); recebimento.setIdFornecedor(3L);
        r.setIdMovimentacaoOrigem(8L); r.setIdFornecedor(99L);
        assertThrows(IllegalArgumentException.class, () -> service.registrarSaida(1L, r));
        r.setIdFornecedor(3L); r.setMotivo(" "); assertThrows(IllegalArgumentException.class, () -> service.registrarSaida(1L, r));
        r.setMotivo("Produto incorreto"); var outro = new EstoquePeca(); outro.setId(2L); recebimento.setEstoquePeca(outro);
        assertThrows(IllegalArgumentException.class, () -> service.registrarSaida(1L, r));
        recebimento.setEstoquePeca(estoque.buscarComLockPorId(1L).orElseThrow()); recebimento.setOrigem("OUTRA");
        assertThrows(IllegalArgumentException.class, () -> service.registrarSaida(1L, r));
        verify(estoque, never()).save(any()); verify(movimentos, never()).save(any());
    }

    @Test void limitaDevolucaoConsiderandoRecebimentoCorrigidoEDevolucaoCorrigida() {
        prepararEstoque(); var recebimento = movimento(8L, "ENTRADA", "COMPRA", "10"); recebimento.setIdFornecedor(3L);
        var reducao = movimento(9L, "AJUSTE_SAIDA", "CORRECAO_LANCAMENTO", "2"); reducao.setIdMovimentacaoOrigem(8L);
        var devolucao = movimento(10L, "SAIDA", "DEVOLUCAO_FORNECEDOR", "4"); devolucao.setIdMovimentacaoOrigem(8L); devolucao.setIdFornecedor(3L);
        var correcao = movimento(11L, "AJUSTE_ENTRADA", "CORRECAO_LANCAMENTO", "1"); correcao.setIdMovimentacaoOrigem(10L);
        when(movimentos.findByIdMovimentacaoOrigem(8L)).thenReturn(java.util.List.of(reducao, devolucao));
        when(movimentos.findByIdMovimentacaoOrigem(10L)).thenReturn(java.util.List.of(correcao));
        var r = request("DEVOLUCAO_FORNECEDOR"); r.setIdMovimentacaoOrigem(8L); r.setIdFornecedor(null); r.setQuantidade("6");
        assertThrows(IllegalArgumentException.class, () -> service.registrarSaida(1L, r));
        r.setQuantidade("5"); service.registrarSaida(1L, r);
        var captor = ArgumentCaptor.forClass(MovimentacaoEstoquePeca.class); verify(movimentos).save(captor.capture());
        assertEquals(8L, captor.getValue().getIdMovimentacaoOrigem()); assertEquals(3L, captor.getValue().getIdFornecedor());
        assertEquals("Fornecedor de teste", captor.getValue().getNomeFornecedor());
        assertEquals(new BigDecimal("40"), estoque.buscarComLockPorId(1L).orElseThrow().getCustoMedio());
        assertEquals(new BigDecimal("10"), recebimento.getQuantidade());
    }

    @Test void recebimentoAntigoExigeIdentificacaoEPermiteDevolverParaFornecedorInativo() {
        prepararEstoque(); var recebimento = movimento(8L, "ENTRADA", "MANUAL", "10");
        var r = request("DEVOLUCAO_FORNECEDOR"); r.setIdMovimentacaoOrigem(8L); r.setIdFornecedor(null);
        assertThrows(IllegalArgumentException.class, () -> service.registrarSaida(1L, r));
        fornecedores.findById(3L).orElseThrow().setAtivo(false); r.setIdFornecedor(3L);
        service.registrarSaida(1L, r); assertNull(recebimento.getIdFornecedor());
        var captor = ArgumentCaptor.forClass(MovimentacaoEstoquePeca.class); verify(movimentos).save(captor.capture());
        assertEquals(3L, captor.getValue().getIdFornecedor());
    }

    @Test void correcaoDaDevolucaoNaoPodeSuperarRecebimentoEReducaoDaCompraRespeitaDevolucoes() {
        prepararEstoque(); var recebimento = movimento(8L, "ENTRADA", "COMPRA", "10"); recebimento.setIdFornecedor(3L);
        var devolucao = movimento(10L, "SAIDA", "DEVOLUCAO_FORNECEDOR", "4"); devolucao.setIdMovimentacaoOrigem(8L); devolucao.setIdFornecedor(3L);
        when(movimentos.findByIdMovimentacaoOrigem(8L)).thenReturn(java.util.List.of(devolucao));
        var r = request("CORRECAO_LANCAMENTO"); r.setTipoMovimento("AJUSTE_SAIDA"); r.setIdMovimentacaoOrigem(10L); r.setQuantidade("7");
        assertThrows(IllegalArgumentException.class, () -> service.registrarAjuste(1L, r));
        r.setIdMovimentacaoOrigem(8L); assertThrows(IllegalArgumentException.class, () -> service.registrarAjuste(1L, r));
        r.setIdMovimentacaoOrigem(10L); r.setQuantidade("6"); service.registrarAjuste(1L, r);
        var captor = ArgumentCaptor.forClass(MovimentacaoEstoquePeca.class); verify(movimentos).save(captor.capture());
        assertEquals(10L, captor.getValue().getIdMovimentacaoOrigem()); assertEquals(3L, captor.getValue().getIdFornecedor());
    }
}
