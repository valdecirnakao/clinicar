ALTER TABLE agendamento
    ADD COLUMN tipo_execucao VARCHAR(20) NOT NULL DEFAULT 'INTERNA';

UPDATE agendamento
SET tipo_execucao = 'EXTERNA'
WHERE id_fornecedor IS NOT NULL;
