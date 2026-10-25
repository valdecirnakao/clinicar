CREATE INDEX idx_atendimento_cliente_criado_id
    ON atendimento (id_cliente, criado_em, id);
