-- O retorno pode chegar antes da confirmação HTTP que fornece o identificador da mensagem.
CREATE TABLE notificacao_callback (
    provider_id VARCHAR(180) NOT NULL PRIMARY KEY,
    estado VARCHAR(30) NOT NULL,
    recebido_em TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    INDEX idx_notificacao_callback_recebido (recebido_em)
);
