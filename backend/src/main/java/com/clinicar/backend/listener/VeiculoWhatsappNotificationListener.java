package com.clinicar.backend.listener;

import com.clinicar.backend.event.VeiculoAtualizadoEvent;
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

    @PostConstruct
    public void init() {
        log.info("VeiculoWhatsappNotificationListener carregado pelo Spring.");
    }

    @TransactionalEventListener(
            phase = TransactionPhase.AFTER_COMMIT,
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
            log.error(
                    "Veículo ID {} foi atualizado, mas houve falha ao enviar WhatsApp.",
                    event.veiculoId(),
                    e
            );
        }
    }
}