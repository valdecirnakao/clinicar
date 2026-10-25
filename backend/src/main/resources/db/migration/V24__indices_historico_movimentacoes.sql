-- As páginas usam a data e o ID como desempate; os saldos mantêm todos os vínculos.
CREATE INDEX idx_movimento_estoque_data_id ON movimentacao_estoque_peca (id_estoque_peca, criado_em, id);
CREATE INDEX idx_movimento_atendimento_data_id ON movimentacao_estoque_peca (id_atendimento, criado_em, id);
CREATE INDEX idx_movimento_documento_data_id ON movimentacao_estoque_peca (documento_referencia, criado_em, id);
