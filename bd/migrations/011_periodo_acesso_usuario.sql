ALTER TABLE solicitacao_acesso_usuario
  ADD COLUMN inicio_periodo DATE NULL,
  ADD COLUMN fim_periodo DATE NULL,
  ADD COLUMN situacao_periodo VARCHAR(30) NULL,
  ADD COLUMN inativado_em TIMESTAMP(6) NULL,
  ADD COLUMN reativado_em TIMESTAMP(6) NULL,
  ADD COLUMN interrompido_em TIMESTAMP(6) NULL,
  ADD INDEX idx_solicitacao_periodo (situacao_periodo, inicio_periodo, fim_periodo);
