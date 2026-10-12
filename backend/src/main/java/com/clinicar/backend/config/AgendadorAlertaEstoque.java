package com.clinicar.backend.config;

import com.clinicar.backend.service.ProcessamentoAlertaEstoqueService;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.*;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;

@Configuration
@EnableScheduling
@ConditionalOnProperty(name = "clinicar.estoque.agendador-habilitado", havingValue = "true", matchIfMissing = true)
@lombok.extern.slf4j.Slf4j
public class AgendadorAlertaEstoque {
    private final ProcessamentoAlertaEstoqueService service;
    public AgendadorAlertaEstoque(ProcessamentoAlertaEstoqueService service) { this.service = service; }
    @Scheduled(fixedDelayString = "${clinicar.estoque.verificacao-ms:60000}", initialDelayString = "60000")
    public void executar() {
        try { service.processar(false); }
        catch (RuntimeException e) { log.error("Falha no processamento de alertas de estoque: {}", e.getClass().getSimpleName()); }
    }
}
