ALTER TABLE configuracao_alerta_estoque
    ADD COLUMN id_administrador_critico BIGINT UNSIGNED NULL,
    ADD COLUMN nome_administrador_critico VARCHAR(255) NULL,
    ADD COLUMN telefone_administrador_critico VARCHAR(30) NULL;

ALTER TABLE configuracao_alerta_estoque
    ADD CONSTRAINT fk_config_alerta_estoque_admin_critico
        FOREIGN KEY (id_administrador_critico) REFERENCES usuario(id) ON DELETE RESTRICT;

-- Preserva o destinatário antigo quando ele já era administrador e, caso contrário,
-- usa o primeiro administrador ativo disponível para os alertas críticos.
UPDATE configuracao_alerta_estoque c
LEFT JOIN usuario legado ON legado.id = c.id_responsavel
LEFT JOIN usuario admin_ativo ON admin_ativo.id = (
    SELECT MIN(u.id) FROM usuario u
    WHERE UPPER(u.tipo_do_acesso) = 'ADMINISTRADOR' AND UPPER(u.status) = 'ATIVO'
)
SET c.id_administrador_critico = CASE
        WHEN UPPER(legado.tipo_do_acesso) = 'ADMINISTRADOR' THEN legado.id
        ELSE admin_ativo.id
    END,
    c.nome_administrador_critico = CASE
        WHEN UPPER(legado.tipo_do_acesso) = 'ADMINISTRADOR' THEN legado.nome
        ELSE admin_ativo.nome
    END,
    c.telefone_administrador_critico = CASE
        WHEN UPPER(legado.tipo_do_acesso) = 'ADMINISTRADOR' THEN REGEXP_REPLACE(COALESCE(legado.telefone, ''), '[^0-9]', '')
        ELSE REGEXP_REPLACE(COALESCE(admin_ativo.telefone, ''), '[^0-9]', '')
    END;
