ALTER TABLE usuario ADD COLUMN avisos_servico_whatsapp BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE atendimento ADD COLUMN pronto_retirada_em DATETIME(6) NULL;
