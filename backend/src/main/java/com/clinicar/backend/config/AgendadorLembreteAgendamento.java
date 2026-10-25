package com.clinicar.backend.config;

import com.clinicar.backend.repository.AgendamentoRepository;
import com.clinicar.backend.service.AvisosServicoWhatsappService;
import java.time.LocalDateTime;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

@Component
public class AgendadorLembreteAgendamento {
    private final AgendamentoRepository agendamentos;
    private final AvisosServicoWhatsappService avisos;
    private final TransactionTemplate transacao;

    @Value("${clinicar.whatsapp.avisos-servico-habilitados:false}")
    private boolean habilitado;

    public AgendadorLembreteAgendamento(AgendamentoRepository agendamentos,
            AvisosServicoWhatsappService avisos, PlatformTransactionManager manager) {
        this.agendamentos = agendamentos;
        this.avisos = avisos;
        this.transacao = new TransactionTemplate(manager);
    }

    @Scheduled(fixedDelayString = "${clinicar.whatsapp.lembrete-intervalo-ms:300000}")
    public void processar() {
        if (!habilitado) return;
        LocalDateTime agora = LocalDateTime.now();
        for (Long id : agendamentos.buscarLembretesPendentes(agora, agora.plusHours(24), PageRequest.of(0, 100))) {
            transacao.executeWithoutResult(ignored -> agendamentos.buscarParaCancelamento(id).ifPresent(a -> {
                LocalDateTime atual = LocalDateTime.now();
                if (!"CONFIRMADO".equals(a.getStatusAgendamento()) || Boolean.TRUE.equals(a.getLembreteEnviado())
                        || a.getDataHoraInicio() == null || !a.getDataHoraInicio().isAfter(atual)
                        || a.getDataHoraInicio().isAfter(atual.plusHours(24))) return;
                if (avisos.lembrete(a)) {
                    a.setLembreteEnviado(true);
                    a.setLembreteEnviadoEm(atual);
                    agendamentos.save(a);
                }
            }));
        }
    }
}
