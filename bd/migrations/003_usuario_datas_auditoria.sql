-- Migration 003
-- Auditoria de criacao e atualizacao do cadastro de usuarios.
-- Executar uma unica vez em bancos CliniCar ja existentes.

ALTER TABLE usuario
    ADD COLUMN criado_em DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6)
        AFTER mfa_tipo;

ALTER TABLE usuario
    ADD COLUMN atualizado_em DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6)
        ON UPDATE CURRENT_TIMESTAMP(6)
        AFTER criado_em;