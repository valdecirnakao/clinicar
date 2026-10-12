package com.clinicar.backend.listener;

import com.clinicar.backend.event.AtivacaoAdministradorSolicitadaEvent;
import com.clinicar.backend.service.EmailService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Slf4j
@Component
@RequiredArgsConstructor
public class AtivacaoAdministradorEmailListener {

    private final EmailService emailService;

    @TransactionalEventListener(phase = TransactionPhase.BEFORE_COMMIT)
    public void enviarAtivacao(AtivacaoAdministradorSolicitadaEvent evento) {
        try {
            emailService.enviarAtivacaoAdministrador(
                    evento.getEmail(), evento.getNome(), evento.getToken(), evento.getExpiraEm());
            log.info("E-mail de ativação enviado. usuarioId={}", evento.getUsuarioId());
        } catch (Exception erro) {
            if (erro instanceof com.clinicar.backend.exception.NotificacaoPersistenciaException persistencia) throw persistencia;
            if (erro instanceof org.springframework.dao.DataAccessException databaseError) throw databaseError;
            // O SMTP pode incluir conteúdo da mensagem na exceção. Não registrar causa/mensagem.
            // Falhas de transporte no modo legado permitem gerar outro link para a conta pendente.
            log.error("Falha no envio da ativação. usuarioId={}; reenvio disponível.", evento.getUsuarioId());
        }
    }
}
