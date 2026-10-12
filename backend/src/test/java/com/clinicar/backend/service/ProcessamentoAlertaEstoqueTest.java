package com.clinicar.backend.service;

import com.clinicar.backend.model.*;
import com.clinicar.backend.repository.*;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.SimpleTransactionStatus;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class ProcessamentoAlertaEstoqueTest {
    final EstoquePecaRepository estoques = mock(EstoquePecaRepository.class);
    final ConfiguracaoAlertaEstoqueRepository configs = mock(ConfiguracaoAlertaEstoqueRepository.class);
    final AlertaEstoquePecaRepository alertas = mock(AlertaEstoquePecaRepository.class);
    final AlertaEstoquePecaService envio = mock(AlertaEstoquePecaService.class);
    final PlatformTransactionManager manager = mock(PlatformTransactionManager.class);
    final ProcessamentoAlertaEstoqueService service = new ProcessamentoAlertaEstoqueService(estoques, configs, alertas, envio, manager);
    @Test void rotinaNaoEnviaSemConfiguracaoEMostraOrientacaoNoReenvioManual() {
        assertEquals(0, service.processar(false).estoquesVerificados());
        assertThrows(IllegalArgumentException.class, () -> service.processar(true)); verifyNoInteractions(estoques, envio);
    }
    @Test void reenvioEmLoteNaoRepeteAvisosAceitosENaoEnviaEstoqueInativo() {
        when(configs.findFirstByAtivoTrueOrderByIdAsc()).thenReturn(Optional.of(new ConfiguracaoAlertaEstoque()));
        when(manager.getTransaction(any())).thenReturn(new SimpleTransactionStatus());
        var ativo = new EstoquePeca(); ativo.setId(1L); ativo.setAtivo(true);
        var inativo = new EstoquePeca(); inativo.setId(2L); inativo.setAtivo(false);
        when(estoques.findAll(any(Pageable.class))).thenReturn(new PageImpl<>(List.of(ativo, inativo)));
        when(estoques.buscarComLockPorId(1L)).thenReturn(Optional.of(ativo)); when(estoques.buscarComLockPorId(2L)).thenReturn(Optional.of(inativo));
        var aceito = new AlertaEstoquePeca(); aceito.setWhatsappEnviado(true);
        when(alertas.findByEstoquePeca_IdAndStatusAlerta(1L, "ABERTO")).thenReturn(List.of(aceito));
        assertEquals(0, service.processar(true).enviosAceitos()); verifyNoInteractions(envio);
    }
    @Test void rotinaAutomaticaAvaliaEstoqueSobBloqueio() {
        when(configs.findFirstByAtivoTrueOrderByIdAsc()).thenReturn(Optional.of(new ConfiguracaoAlertaEstoque()));
        when(manager.getTransaction(any())).thenReturn(new SimpleTransactionStatus());
        var estoque = new EstoquePeca(); estoque.setId(1L); estoque.setAtivo(true);
        when(estoques.findAll(any(Pageable.class))).thenReturn(new PageImpl<>(List.of(estoque)));
        when(estoques.buscarComLockPorId(1L)).thenReturn(Optional.of(estoque));
        assertEquals(1, service.processar(false).estoquesVerificados());
        var ordem = inOrder(estoques, envio); ordem.verify(estoques).findAll(any(Pageable.class)); ordem.verify(estoques).buscarComLockPorId(1L);
        ordem.verify(envio).avaliarEEnviarAlertaSeNecessario(estoque, "ACOMPANHAMENTO_ESTOQUE", null, false);
    }
}
