package com.clinicar.backend.service;
import com.clinicar.backend.model.*;
import org.junit.jupiter.api.*;
import java.time.*;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
class PoliticaAlertaManutencaoTest {
    ConfiguracaoAlertaManutencao c;
    PrevisaoManutencaoVeiculo p;
    Instant agora = Instant.parse("2026-09-27T15:00:00Z");
    @BeforeEach void preparar() {
        c = new ConfiguracaoAlertaManutencao(); c.setAtivo(true);
        p = new PrevisaoManutencaoVeiculo(); p.setStatusPrevisao("PENDENTE");
        p.setDataRecomendada(LocalDate.of(2026,10,12));
    }
    boolean elegivel(List<EnvioAlertaManutencao> e) { return PoliticaAlertaManutencao.elegivel(c,p,e,agora); }
    EnvioAlertaManutencao envio(String status, Instant data) {
        var e = new EnvioAlertaManutencao(); e.setStatus(status); e.setCriadoEm(data); return e;
    }
    @Test void primeiroEnvioNoInicioDaAntecedencia() { assertTrue(elegivel(List.of())); }
    @Test void naoEnviaAntesDaAntecedencia() { p.setDataRecomendada(p.getDataRecomendada().plusDays(1)); assertFalse(elegivel(List.of())); }
    @Test void desativadoNaoEnvia() { c.setAtivo(false); assertFalse(elegivel(List.of())); }
    @Test void respeitaHoraFinalExclusiva() { c.setHoraFim(12); assertFalse(elegivel(List.of())); }
    @Test void respeitaFusoHorario() { c.setFusoHorario("UTC"); c.setHoraInicio(15); assertTrue(elegivel(List.of())); c.setFusoHorario("America/Sao_Paulo"); assertFalse(elegivel(List.of())); }
    @Test void naoRepeteAntesDoIntervalo() { assertFalse(elegivel(List.of(envio("ENVIADO",agora.minusSeconds(6*86400))))); }
    @Test void enviaNoLimiteDoIntervalo() { assertTrue(elegivel(List.of(envio("ENVIADO",agora.minusSeconds(7*86400))))); }
    @Test void maximoImpedeNovosEnvios() { c.setMaximoEnvios(1); assertFalse(elegivel(List.of(envio("ENVIADO",agora.minusSeconds(30*86400))))); }
    @Test void resultadoIncertoBloqueiaReenvio() {
        for (String s : List.of("ERRO","EM_PROCESSAMENTO")) assertFalse(elegivel(List.of(envio(s,agora.minusSeconds(30*86400)))));
    }
    @Test void liberacaoPermiteNovaTentativa() { assertTrue(elegivel(List.of(envio("LIBERADO",agora)))); }
    @Test void naoEnviaPrevisaoEncerradaOuAgendada() {
        for (String s : List.of("CONCLUIDA","CANCELADA","AGENDADA")) { p.setStatusPrevisao(s); assertFalse(elegivel(List.of())); }
    }
    @Test void respeitaPeriodoAposVencimento() {
        p.setDataRecomendada(LocalDate.of(2026,8,28)); assertTrue(elegivel(List.of()));
        p.setDataRecomendada(LocalDate.of(2026,8,27)); assertFalse(elegivel(List.of()));
    }
}
