package com.clinicar.backend.service;

import com.clinicar.backend.model.*;
import com.clinicar.backend.repository.*;
import org.junit.jupiter.api.Test;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class AlertaEstoqueEnvioTest {
    final AlertaEstoquePecaRepository alertas = mock(AlertaEstoquePecaRepository.class);
    final ConfiguracaoAlertaEstoqueRepository configs = mock(ConfiguracaoAlertaEstoqueRepository.class);
    final WhatsappEstoqueService whatsapp = mock(WhatsappEstoqueService.class);
    final EstoquePecaRepository estoques = mock(EstoquePecaRepository.class);
    final AlertaEstoquePecaService service = new AlertaEstoquePecaService(alertas, configs, whatsapp, estoques);
    final EstoquePeca estoque = new EstoquePeca();
    AlertaEstoqueEnvioTest() {
        estoque.setId(1L); estoque.setAtivo(true); estoque.setQuantidadeAtual(new BigDecimal("8"));
        estoque.setQuantidadeReservada(BigDecimal.ZERO); estoque.setEstoqueMinimo(BigDecimal.TEN); estoque.setEstoqueCritico(new BigDecimal("3"));
        when(alertas.save(any())).thenAnswer(i -> { AlertaEstoquePeca a = i.getArgument(0); if (a.getId() == null) a.setId(7L); return a; });
        when(whatsapp.enviarAlertaEstoque(any(), any())).thenReturn("wamid.teste");
    }
    ConfiguracaoAlertaEstoque configurar() {
        var c = new ConfiguracaoAlertaEstoque(); c.setIdResponsavel(2L); c.setNomeResponsavel("Colaborador"); c.setTelefoneAdministrador("5511999999999");
        c.setIdAdministradorCritico(3L); c.setNomeAdministradorCritico("Administrador"); c.setTelefoneAdministradorCritico("5511888888888");
        when(configs.findFirstByAtivoTrueOrderByIdAsc()).thenReturn(Optional.of(c)); return c;
    }
    @Test void direcionaAtencaoAoColaboradorECriticoAoAdministrador() {
        configurar();
        service.verificarEGerarAlertaSeNecessario(estoque);
        estoque.setQuantidadeAtual(new BigDecimal("2"));
        service.verificarEGerarAlertaSeNecessario(estoque);
        var destinatarios = org.mockito.ArgumentCaptor.forClass(ConfiguracaoAlertaEstoque.class);
        verify(whatsapp, times(2)).enviarAlertaEstoque(any(), destinatarios.capture());
        assertEquals(2L, destinatarios.getAllValues().get(0).getIdResponsavel());
        assertEquals("5511999999999", destinatarios.getAllValues().get(0).getTelefoneAdministrador());
        assertEquals(3L, destinatarios.getAllValues().get(1).getIdResponsavel());
        assertEquals("5511888888888", destinatarios.getAllValues().get(1).getTelefoneAdministrador());
    }
    AlertaEstoquePeca existente(boolean enviado, LocalDateTime ultima) {
        var a = new AlertaEstoquePeca(); a.setId(7L); a.setEstoquePeca(estoque); a.setNivelAlerta("ATENCAO");
        a.setWhatsappEnviado(enviado); a.setUltimaTentativaEm(ultima); a.setTentativasEnvio(1);
        when(alertas.findFirstByEstoquePeca_IdAndNivelAlertaAndStatusAlertaOrderByCriadoEmDesc(1L, "ATENCAO", "ABERTO")).thenReturn(Optional.of(a));
        when(alertas.findByEstoquePeca_IdAndStatusAlerta(1L, "ABERTO")).thenReturn(List.of(a)); return a;
    }
    @Test void ausenciaDeConfiguracaoMantemAlertaPendenteSemInventarTentativa() {
        service.verificarEGerarAlertaSeNecessario(estoque);
        var captor = org.mockito.ArgumentCaptor.forClass(AlertaEstoquePeca.class); verify(alertas, atLeastOnce()).save(captor.capture());
        assertFalse(captor.getValue().getWhatsappEnviado()); assertEquals(0, captor.getValue().getTentativasEnvio());
        assertTrue(captor.getValue().getUltimoErro().contains("página Alertas")); verifyNoInteractions(whatsapp);
    }
    @Test void primeiroAvisoEnviaERegistraAceitacao() {
        configurar(); service.verificarEGerarAlertaSeNecessario(estoque);
        var captor = org.mockito.ArgumentCaptor.forClass(AlertaEstoquePeca.class); verify(alertas, atLeastOnce()).save(captor.capture());
        assertTrue(captor.getValue().getWhatsappEnviado()); assertNotNull(captor.getValue().getUltimaTentativaEm());
        assertEquals("wamid.teste", captor.getValue().getWhatsappMessageId());
    }
    @Test void naoRepeteAntesDoIntervaloMesmoAposReiniciarServico() {
        configurar(); existente(true, LocalDateTime.now().minusHours(2));
        service.verificarEGerarAlertaSeNecessario(estoque); verifyNoInteractions(whatsapp);
    }
    @Test void lembreteUsaSaldoAtualEIntervaloConfigurado() {
        configurar(); var a = existente(true, LocalDateTime.now().minusHours(25)); a.setQuantidadeAtual(new BigDecimal("9"));
        service.verificarEGerarAlertaSeNecessario(estoque);
        assertEquals(0, new BigDecimal("8").compareTo(a.getQuantidadeAtual())); assertEquals(2, a.getTentativasEnvio()); verify(whatsapp).enviarAlertaEstoque(eq(a), any());
    }
    @Test void falhaNaoInterrompeMovimentacaoEEsperaIntervaloParaTentarNovamente() {
        configurar(); var a = existente(false, LocalDateTime.now().minusHours(25));
        when(whatsapp.enviarAlertaEstoque(any(), any())).thenThrow(new IllegalStateException("Template não aprovado"));
        assertDoesNotThrow(() -> service.verificarEGerarAlertaSeNecessario(estoque));
        assertEquals("Template não aprovado", a.getUltimoErro()); assertFalse(a.getWhatsappEnviado());
        service.verificarEGerarAlertaSeNecessario(estoque); verify(whatsapp, times(1)).enviarAlertaEstoque(any(), any());
    }
    @Test void reenviarPendentesIgnoraIntervaloSemRepetirSucessos() {
        configurar(); var a = existente(false, LocalDateTime.now());
        service.avaliarEEnviarAlertaSeNecessario(estoque, "REENVIO", null, true);
        assertTrue(a.getWhatsappEnviado());
        service.avaliarEEnviarAlertaSeNecessario(estoque, "REENVIO", null, true);
        verify(whatsapp, times(1)).enviarAlertaEstoque(any(), any());
    }
    @Test void estoqueNormalizadoResolveSemEnviar() {
        var a = existente(false, null); estoque.setQuantidadeAtual(new BigDecimal("11"));
        service.verificarEGerarAlertaSeNecessario(estoque); assertEquals("RESOLVIDO", a.getStatusAlerta()); verifyNoInteractions(whatsapp);
    }
    @Test void agravamentoResolveNivelAnteriorEGeraAvisoNovo() {
        configurar(); var a = existente(true, LocalDateTime.now()); estoque.setQuantidadeAtual(BigDecimal.ZERO);
        service.verificarEGerarAlertaSeNecessario(estoque); assertEquals("SUPERADO", a.getStatusAlerta()); verify(whatsapp).enviarAlertaEstoque(any(), any());
    }
    @Test void reenvioManualRejeitaAlertaDesatualizadoAntesDeEnviar() {
        var a = existente(false, null); estoque.setQuantidadeAtual(new BigDecimal("11"));
        when(alertas.buscarIdEstoque(7L)).thenReturn(Optional.of(1L)); when(estoques.buscarComLockPorId(1L)).thenReturn(Optional.of(estoque));
        when(alertas.findById(7L)).thenReturn(Optional.of(a));
        assertThrows(IllegalArgumentException.class, () -> service.reenviarWhatsapp(7L)); verifyNoInteractions(whatsapp);
    }
    @Test void respostaSemMessageIdNaoIndicaEnvioBemSucedido() {
        configurar(); when(whatsapp.enviarAlertaEstoque(any(), any())).thenReturn(null);
        var a = existente(false, null); service.verificarEGerarAlertaSeNecessario(estoque);
        assertFalse(a.getWhatsappEnviado()); assertTrue(a.getUltimoErro().contains("não confirmou"));
    }
    @Test void quantidadeFracionadaNaoViraEstoqueZeradoPorArredondamento() {
        configurar(); estoque.setQuantidadeAtual(new BigDecimal("0.004")); estoque.setEstoqueMinimo(new BigDecimal("0.003")); estoque.setEstoqueCritico(new BigDecimal("0.001"));
        service.verificarEGerarAlertaSeNecessario(estoque); verifyNoInteractions(whatsapp);
        estoque.setQuantidadeAtual(new BigDecimal("0.003")); service.verificarEGerarAlertaSeNecessario(estoque);
        var captor = org.mockito.ArgumentCaptor.forClass(AlertaEstoquePeca.class); verify(alertas, atLeastOnce()).save(captor.capture());
        assertEquals("ATENCAO", captor.getValue().getNivelAlerta()); assertEquals(new BigDecimal("0.003"), captor.getValue().getQuantidadeAtual());
    }}
