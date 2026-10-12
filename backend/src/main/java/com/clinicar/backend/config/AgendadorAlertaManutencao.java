package com.clinicar.backend.config;

import com.clinicar.backend.service.AlertaManutencaoService;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.*;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import lombok.extern.slf4j.Slf4j;

@Configuration @EnableScheduling @Slf4j
@ConditionalOnProperty(name = "clinicar.manutencao.agendador-habilitado", havingValue = "true", matchIfMissing = true)
public class AgendadorAlertaManutencao {
    private final AlertaManutencaoService service;
    public AgendadorAlertaManutencao(AlertaManutencaoService service) { this.service = service; }
    @Scheduled(fixedDelayString = "${clinicar.manutencao.verificacao-ms:60000}", initialDelayString = "60000")
    public void executar() {
        try { service.processar(); }
        catch (Exception e) { log.error("Falha no processamento de alertas de manutenção: {}", e.getClass().getSimpleName()); }
    }
}
