package com.clinicar.backend.listener;

import com.clinicar.backend.event.UsuarioAtivadoEvent;
import com.clinicar.backend.event.UsuarioAtualizadoEvent;
import com.clinicar.backend.event.UsuarioInativadoEvent;
import com.clinicar.backend.event.UsuarioMfaResetadoEvent;
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
public class UsuarioWhatsappNotificationListener {

    private final WhatsAppService whatsAppService;

    @PostConstruct
    public void init() {
        log.info("UsuarioWhatsappNotificationListener carregado pelo Spring.");
    }

    @TransactionalEventListener(
            phase = TransactionPhase.AFTER_COMMIT,
            fallbackExecution = true
    )
    public void aoAtualizarUsuario(UsuarioAtualizadoEvent event) {
        log.info(
                "Listener recebeu UsuarioAtualizadoEvent. usuarioId={}, nome={}, telefone={}",
                event.usuarioId(),
                event.nome(),
                event.telefone()
        );

        tentarEnviar(
                () -> whatsAppService.enviarAlertaAtualizacaoUsuario(
                        event.telefone(),
                        event.nome()
                ),
                "alerta_atualiza_usuario",
                event.usuarioId()
        );
    }

    @TransactionalEventListener(
            phase = TransactionPhase.AFTER_COMMIT,
            fallbackExecution = true
    )
    public void aoInativarUsuario(UsuarioInativadoEvent event) {
        log.info(
                "Listener recebeu UsuarioInativadoEvent. usuarioId={}, nome={}, telefone={}",
                event.usuarioId(),
                event.nome(),
                event.telefone()
        );

        tentarEnviar(
                () -> whatsAppService.enviarAlertaInativacaoUsuario(
                        event.telefone(),
                        event.nome()
                ),
                "alerta_inativa_usuario",
                event.usuarioId()
        );
    }

    @TransactionalEventListener(
            phase = TransactionPhase.AFTER_COMMIT,
            fallbackExecution = true
    )
    public void aoAtivarUsuario(UsuarioAtivadoEvent event) {
        log.info(
                "Listener recebeu UsuarioAtivadoEvent. usuarioId={}, nome={}, telefone={}",
                event.usuarioId(),
                event.nome(),
                event.telefone()
        );

        tentarEnviar(
                () -> whatsAppService.enviarAlertaAtivacaoUsuario(
                        event.telefone(),
                        event.nome()
                ),
                "alerta_ativa_usuario",
                event.usuarioId()
        );
    }

    @TransactionalEventListener(
            phase = TransactionPhase.AFTER_COMMIT,
            fallbackExecution = true
    )
    public void aoResetarMfa(UsuarioMfaResetadoEvent event) {
        log.info(
                "Listener recebeu UsuarioMfaResetadoEvent. usuarioId={}, nome={}, telefone={}",
                event.usuarioId(),
                event.nome(),
                event.telefone()
        );

        tentarEnviar(
                () -> whatsAppService.enviarAlertaRedefinicao2fa(
                        event.telefone(),
                        event.nome()
                ),
                "alerta_redefine_2fa",
                event.usuarioId()
        );
    }

    private void tentarEnviar(
            Runnable envio,
            String template,
            Long usuarioId
    ) {
        try {
            log.info(
                    "Iniciando envio do template WhatsApp '{}' para usuário ID {}.",
                    template,
                    usuarioId
            );

            envio.run();

            log.info(
                    "Envio do template WhatsApp '{}' concluído para usuário ID {}.",
                    template,
                    usuarioId
            );

        } catch (Exception e) {
            log.error(
                    "Usuário ID {} foi processado, mas houve falha ao enviar o template WhatsApp '{}'.",
                    usuarioId,
                    template,
                    e
            );
        }
    }
}