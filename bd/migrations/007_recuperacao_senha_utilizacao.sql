-- Aplicar uma vez no banco existente. Preserva tokens e usuários.
-- Datas de utilização anteriores não podem ser reconstruídas.
ALTER TABLE password_reset_token ADD COLUMN usado_em DATETIME(6) NULL AFTER usado;
