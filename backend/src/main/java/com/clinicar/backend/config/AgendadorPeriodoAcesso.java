package com.clinicar.backend.config;

import com.clinicar.backend.repository.SolicitacaoAcessoUsuarioRepository;
import com.clinicar.backend.service.PeriodoAcessoUsuarioService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.*;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import java.time.LocalDate;

@Configuration @EnableScheduling @RequiredArgsConstructor @Slf4j
@ConditionalOnProperty(name="clinicar.acesso.agendador-habilitado", havingValue="true", matchIfMissing=true)
public class AgendadorPeriodoAcesso {
    private final SolicitacaoAcessoUsuarioRepository solicitacoes;
    private final PeriodoAcessoUsuarioService periodos;
    @Scheduled(fixedDelayString="${clinicar.acesso.verificacao-ms:60000}", initialDelayString="${clinicar.acesso.inicio-ms:5000}")
    public void executar() {
        try {
            for (Long id : solicitacoes.periodosParaProcessar()) {
                try { periodos.processar(id, LocalDate.now(PeriodoAcessoUsuarioService.FUSO)); }
                catch (Exception e) { log.error("Falha ao processar suspensão temporária {}", id, e); }
            }
        } catch (Exception e) { log.error("Falha ao consultar suspensões temporárias", e); }
    }
}
