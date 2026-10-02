package com.clinicar.backend.service;

import com.clinicar.backend.model.*;
import java.time.*;
import java.util.List;

/** Regras puras: o relógio e o histórico são fornecidos pelo chamador. */
public final class PoliticaAlertaManutencao {
    private PoliticaAlertaManutencao() {}
    public static boolean elegivel(ConfiguracaoAlertaManutencao c, PrevisaoManutencaoVeiculo p,
                                   List<EnvioAlertaManutencao> historico, Instant agora) {
        if (!Boolean.TRUE.equals(c.getAtivo()) || p.getDataRecomendada() == null
                || !List.of("PENDENTE", "PROXIMA", "VENCIDA").contains(p.getStatusPrevisao())) return false;
        ZonedDateTime local = agora.atZone(ZoneId.of(c.getFusoHorario()));
        if (local.getHour() < c.getHoraInicio() || local.getHour() >= c.getHoraFim()) return false;
        LocalDate hoje = local.toLocalDate();
        if (hoje.isBefore(p.getDataRecomendada().minusDays(c.getAntecedenciaDias()))
                || hoje.isAfter(p.getDataRecomendada().plusDays(c.getDiasAposVencimento()))) return false;
        // Falhas/resultado desconhecido exigem conciliação, evitando reenvio cego após timeout.
        if (historico.stream().anyMatch(e -> List.of("EM_PROCESSAMENTO", "ERRO").contains(e.getStatus()))) return false;
        List<EnvioAlertaManutencao> enviados = historico.stream().filter(e -> "ENVIADO".equals(e.getStatus())).toList();
        if (enviados.size() >= c.getMaximoEnvios()) return false;
        return enviados.stream().map(EnvioAlertaManutencao::getCriadoEm).max(Instant::compareTo)
                .map(ultimo -> !agora.isBefore(ultimo.atZone(ZoneId.of(c.getFusoHorario()))
                        .plusDays(c.getIntervaloDias()).toInstant())).orElse(true);
    }
}
