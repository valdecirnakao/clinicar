ALTER TABLE agendamento
    ADD COLUMN sugestao_materiais_cliente VARCHAR(1000) NULL;

ALTER TABLE servico
    ADD COLUMN materiais_referencia VARCHAR(1000) NULL;
