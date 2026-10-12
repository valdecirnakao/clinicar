package com.clinicar.backend.listener;

import com.clinicar.backend.event.VeiculoAtualizadoEvent;
import com.clinicar.backend.event.VeiculoExcluidoEvent;
import com.clinicar.backend.service.WhatsAppService;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Slf4j
@Component
@RequiredArgsConstructor
public class VeiculoWhatsappNotificationListener {

    private final WhatsAppService whatsAppService;

    @TransactionalEventListener(phase = TransactionPhase.BEFORE_COMMIT)
    public void aoExcluirVeiculo(VeiculoExcluidoEvent event) {
        log.info("Exclusão confirmada. veiculoId={}, administradorId={}, veiculo={}",
                event.veiculoId(), event.administradorId(), event.veiculo());
        if (event.telefone() == null || event.telefone().isBlank()) {
            event.resultado().notificacaoNaoEnviada("A notificação não foi enviada porque o proprietário não possui telefone disponível.");
            log.warn("Notificação de exclusão não enviada: telefone indisponível. veiculoId={}", event.veiculoId());
            return;
        }
        try {
            whatsAppService.enviarAlertaExclusaoVeiculo(event.telefone(), event.nome(), event.veiculo());
            if (whatsAppService.usaFila()) event.resultado().notificacaoAgendada();
            else event.resultado().notificacaoAceita();
            log.info("Notificação de exclusão encaminhada à Meta. veiculoId={}", event.veiculoId());
        } catch (Exception e) {
            if (e instanceof com.clinicar.backend.exception.NotificacaoPersistenciaException persistencia) throw persistencia;
            if (e instanceof org.springframework.dao.DataAccessException databaseError) throw databaseError;
            event.resultado().notificacaoNaoEnviada("Não foi possível enviar a notificação de exclusão por WhatsApp. A exclusão do veículo foi concluída.");
            log.error("Falha no WhatsApp após exclusão confirmada. veiculoId={}", event.veiculoId(), e);
        }
    }

    @PostConstruct
    public void init() {
        log.info("VeiculoWhatsappNotificationListener carregado pelo Spring.");
    }

    @TransactionalEventListener(
            phase = TransactionPhase.BEFORE_COMMIT,
            fallbackExecution = true
    )
    public void aoAtualizarVeiculo(VeiculoAtualizadoEvent event) {
        log.info(
                "Listener recebeu VeiculoAtualizadoEvent. veiculoId={}, nome={}, telefone={}, veiculo={}",
                event.veiculoId(),
                event.nome(),
                event.telefone(),
                event.veiculo()
        );

        try {
            log.info(
                    "Iniciando envio do alerta de atualização de veículo para veículo ID {}.",
                    event.veiculoId()
            );

            whatsAppService.enviarAlertaAtualizacaoVeiculo(
                    event.telefone(),
                    event.nome(),
                    event.veiculo()
            );

            log.info(
                    "Alerta de atualização de veículo enviado com sucesso para veículo ID {}.",
                    event.veiculoId()
            );

        } catch (Exception e) {
            if (e instanceof com.clinicar.backend.exception.NotificacaoPersistenciaException persistencia) throw persistencia;
            if (e instanceof org.springframework.dao.DataAccessException databaseError) throw databaseError;
            log.error(
                    "Veículo ID {} foi atualizado, mas houve falha ao enviar WhatsApp.",
                    event.veiculoId(),
                    e
            );
        }
    }
}
