package com.clinicar.backend.service;

import com.clinicar.backend.dto.UsuarioResponse;
import com.clinicar.backend.mapper.AlertaEstoquePecaMapper;
import org.junit.jupiter.api.Test;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class AcompanhamentoAlertaEstoqueTest extends AlertaEstoqueEnvioTest {
    UsuarioResponse administrador() {
        var usuario = new UsuarioResponse(); usuario.setId(12L); usuario.setNome("Administrador de teste");
        usuario.setTipo_do_acesso("ADMINISTRADOR"); return usuario;
    }
    com.clinicar.backend.model.AlertaEstoquePeca aberto() {
        var alerta = existente(false, null);
        when(alertas.buscarIdEstoque(7L)).thenReturn(Optional.of(1L));
        when(estoques.buscarComLockPorId(1L)).thenReturn(Optional.of(estoque));
        when(alertas.findById(7L)).thenReturn(Optional.of(alerta)); return alerta;
    }
    @Test void reconhecerRegistraAtorSemAlterarSaldoOuEncerrarENaoSobrescrevePrimeiraCiencia() {
        var alerta = aberto(); service.reconhecer(7L, administrador());
        assertEquals("ABERTO", alerta.getStatusAlerta()); assertEquals(new BigDecimal("8"), estoque.getQuantidadeAtual());
        assertEquals(12L, alerta.getIdUsuarioReconhecimento()); assertNotNull(alerta.getReconhecidoEm());
        var data = alerta.getReconhecidoEm(); var outro = administrador(); outro.setId(13L);
        service.reconhecer(7L, outro); assertEquals(12L, alerta.getIdUsuarioReconhecimento()); assertEquals(data, alerta.getReconhecidoEm());
        verifyNoInteractions(whatsapp);
    }
    @Test void apiAntigaNaoPodeResolverUmEstoqueAindaBaixo() {
        var alerta = aberto(); assertThrows(IllegalArgumentException.class, () -> service.resolver(7L));
        assertEquals("ABERTO", alerta.getStatusAlerta()); verify(alertas, never()).save(any());
    }
    @Test void entradaInsuficienteMantemAlertaENormalizacaoResolveConsiderandoReservas() {
        var alerta = aberto(); estoque.setQuantidadeAtual(new BigDecimal("12")); estoque.setQuantidadeReservada(new BigDecimal("3"));
        assertThrows(IllegalArgumentException.class, () -> service.resolver(7L));
        estoque.setQuantidadeReservada(BigDecimal.ZERO); service.verificarEGerarAlertaSeNecessario(estoque);
        assertEquals("RESOLVIDO", alerta.getStatusAlerta()); assertNotNull(alerta.getEncerradoEm());
    }
    @Test void excecaoExigeJustificativaEAdministrador() {
        var alerta = aberto(); assertThrows(IllegalArgumentException.class, () -> service.encerrarExcepcionalmente(7L, "  ", administrador()));
        var cliente = administrador(); cliente.setTipo_do_acesso("CLIENTE");
        assertThrows(IllegalArgumentException.class, () -> service.encerrarExcepcionalmente(7L, "Peça descontinuada", cliente));
        assertThrows(IllegalArgumentException.class, () -> service.encerrarExcepcionalmente(7L, "x".repeat(1001), administrador()));
        assertEquals("ABERTO", alerta.getStatusAlerta());
    }
    @Test void excecaoPreservaAuditoriaESuspendeSomenteNivelAtualSemMovimentarEstoque() {
        var alerta = aberto(); service.encerrarExcepcionalmente(7L, " Peça descontinuada ", administrador());
        assertEquals("ENCERRADO", alerta.getStatusAlerta()); assertEquals("Peça descontinuada", alerta.getJustificativaEncerramento());
        assertEquals(12L, alerta.getIdUsuarioEncerramento()); assertEquals("Administrador de teste", alerta.getNomeUsuarioEncerramento());
        assertTrue(alerta.getExcecaoAtiva()); assertNotNull(alerta.getEncerradoEm());
        when(alertas.findByEstoquePeca_IdAndStatusAlerta(1L, "ENCERRADO")).thenReturn(List.of(alerta));
        clearInvocations(alertas); service.verificarEGerarAlertaSeNecessario(estoque);
        verify(alertas, never()).save(any()); verifyNoInteractions(whatsapp); assertEquals(new BigDecimal("8"), estoque.getQuantidadeAtual());
        var response = new AlertaEstoquePecaMapper().toResponse(alerta);
        assertEquals(12L, response.getIdUsuarioEncerramento()); assertEquals("Peça descontinuada", response.getJustificativaEncerramento());
    }
    @Test void agravamentoGeraNovoAlertaENaoApagaEncerramentoAnterior() {
        var alerta = aberto(); service.encerrarExcepcionalmente(7L, "Peça descontinuada", administrador());
        when(alertas.findByEstoquePeca_IdAndStatusAlerta(1L, "ABERTO")).thenReturn(List.of());
        when(alertas.findByEstoquePeca_IdAndStatusAlerta(1L, "ENCERRADO")).thenReturn(List.of(alerta));
        configurar(); estoque.setQuantidadeAtual(BigDecimal.ZERO); service.verificarEGerarAlertaSeNecessario(estoque);
        assertFalse(alerta.getExcecaoAtiva()); assertEquals("ENCERRADO", alerta.getStatusAlerta());
        verify(whatsapp).enviarAlertaEstoque(argThat(a -> "ZERADO".equals(a.getNivelAlerta())), any());
    }
    @Test void normalizacaoLiberaNovoCicloDeAlertaAposExcecao() {
        var alerta = aberto(); service.encerrarExcepcionalmente(7L, "Peça descontinuada", administrador());
        when(alertas.findByEstoquePeca_IdAndStatusAlerta(1L, "ABERTO")).thenReturn(List.of());
        when(alertas.findFirstByEstoquePeca_IdAndNivelAlertaAndStatusAlertaOrderByCriadoEmDesc(1L, "ATENCAO", "ABERTO")).thenReturn(Optional.empty());
        when(alertas.findByEstoquePeca_IdAndStatusAlerta(1L, "ENCERRADO")).thenReturn(List.of(alerta));
        estoque.setQuantidadeAtual(new BigDecimal("11")); service.verificarEGerarAlertaSeNecessario(estoque);
        assertFalse(alerta.getExcecaoAtiva()); configurar(); estoque.setQuantidadeAtual(new BigDecimal("8"));
        service.verificarEGerarAlertaSeNecessario(estoque); verify(whatsapp).enviarAlertaEstoque(any(), any());
    }
    @Test void naoReconheceOuReenviaUmAlertaEncerrado() {
        var alerta = aberto(); alerta.setStatusAlerta("ENCERRADO");
        assertThrows(IllegalArgumentException.class, () -> service.reconhecer(7L, administrador()));
        assertThrows(IllegalArgumentException.class, () -> service.reenviarWhatsapp(7L)); verifyNoInteractions(whatsapp);
    }
}
