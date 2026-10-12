-- Configuração administrável, controle de concorrência e intervalo de tentativas.
SET @ddl_alerta = IF(EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='configuracao_alerta_estoque' AND column_name='versao'), 'DO 0', 'ALTER TABLE configuracao_alerta_estoque ADD COLUMN versao BIGINT NULL DEFAULT 0');
PREPARE ddl_alerta FROM @ddl_alerta;
EXECUTE ddl_alerta;
DEALLOCATE PREPARE ddl_alerta;

SET @ddl_alerta = IF(EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='configuracao_alerta_estoque' AND column_name='id_responsavel'), 'DO 0', 'ALTER TABLE configuracao_alerta_estoque ADD COLUMN id_responsavel BIGINT UNSIGNED NULL');
PREPARE ddl_alerta FROM @ddl_alerta;
EXECUTE ddl_alerta;
DEALLOCATE PREPARE ddl_alerta;

SET @ddl_alerta = IF(EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='configuracao_alerta_estoque' AND column_name='nome_responsavel'), 'DO 0', 'ALTER TABLE configuracao_alerta_estoque ADD COLUMN nome_responsavel VARCHAR(255) NULL');
PREPARE ddl_alerta FROM @ddl_alerta;
EXECUTE ddl_alerta;
DEALLOCATE PREPARE ddl_alerta;

SET @ddl_alerta = IF(EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='alerta_estoque_peca' AND column_name='ultima_tentativa_em'), 'DO 0', 'ALTER TABLE alerta_estoque_peca ADD COLUMN ultima_tentativa_em DATETIME NULL');
PREPARE ddl_alerta FROM @ddl_alerta;
EXECUTE ddl_alerta;
DEALLOCATE PREPARE ddl_alerta;
INSERT INTO configuracao_alerta_estoque (id, ativo, telefone_administrador, template_whatsapp, idioma_template, reenviar_alerta_apos_horas, criado_em, versao)
SELECT 1, ativo, telefone_administrador, template_whatsapp, idioma_template, reenviar_alerta_apos_horas, NOW(), 0
FROM configuracao_alerta_estoque WHERE id <> 1 AND NOT EXISTS (SELECT 1 FROM configuracao_alerta_estoque WHERE id=1) ORDER BY ativo DESC, id ASC LIMIT 1;
INSERT IGNORE INTO configuracao_alerta_estoque (id, ativo, telefone_administrador, template_whatsapp, idioma_template, reenviar_alerta_apos_horas, criado_em, versao)
VALUES (1, FALSE, '', 'alerta_estoque_peca', 'pt_BR', 24, NOW(), 0);
UPDATE configuracao_alerta_estoque SET ativo=FALSE WHERE id<>1 AND ativo=TRUE;
SET @ddl_alerta = IF(EXISTS(SELECT 1 FROM information_schema.table_constraints WHERE constraint_schema=DATABASE() AND constraint_name='fk_config_estoque_responsavel'), 'DO 0', 'ALTER TABLE configuracao_alerta_estoque ADD CONSTRAINT fk_config_estoque_responsavel FOREIGN KEY(id_responsavel) REFERENCES usuario(id) ON DELETE RESTRICT');
PREPARE ddl_alerta FROM @ddl_alerta;
EXECUTE ddl_alerta;
DEALLOCATE PREPARE ddl_alerta;