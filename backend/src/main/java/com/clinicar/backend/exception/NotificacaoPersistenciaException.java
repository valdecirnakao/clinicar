package com.clinicar.backend.exception;

/** Impede confirmar o cadastro quando sua notificação obrigatória não foi preservada. */
public class NotificacaoPersistenciaException extends RuntimeException {
    public NotificacaoPersistenciaException(String mensagem, Throwable causa) {
        super(mensagem, causa);
    }
}
