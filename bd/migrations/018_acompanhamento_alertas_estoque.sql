-- Reconhecimento e encerramento excepcional auditável dos alertas.
SET @ddl_alerta = IF(EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='alerta_estoque_peca' AND column_name='reconhecido_em'), 'DO 0', 'ALTER TABLE alerta_estoque_peca ADD COLUMN reconhecido_em DATETIME NULL');
PREPARE ddl_alerta FROM @ddl_alerta;
EXECUTE ddl_alerta;
DEALLOCATE PREPARE ddl_alerta;

SET @ddl_alerta = IF(EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='alerta_estoque_peca' AND column_name='id_usuario_reconhecimento'), 'DO 0', 'ALTER TABLE alerta_estoque_peca ADD COLUMN id_usuario_reconhecimento BIGINT UNSIGNED NULL');
PREPARE ddl_alerta FROM @ddl_alerta;
EXECUTE ddl_alerta;
DEALLOCATE PREPARE ddl_alerta;

SET @ddl_alerta = IF(EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='alerta_estoque_peca' AND column_name='nome_usuario_reconhecimento'), 'DO 0', 'ALTER TABLE alerta_estoque_peca ADD COLUMN nome_usuario_reconhecimento VARCHAR(255) NULL');
PREPARE ddl_alerta FROM @ddl_alerta;
EXECUTE ddl_alerta;
DEALLOCATE PREPARE ddl_alerta;

SET @ddl_alerta = IF(EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='alerta_estoque_peca' AND column_name='encerrado_em'), 'DO 0', 'ALTER TABLE alerta_estoque_peca ADD COLUMN encerrado_em DATETIME NULL');
PREPARE ddl_alerta FROM @ddl_alerta;
EXECUTE ddl_alerta;
DEALLOCATE PREPARE ddl_alerta;

SET @ddl_alerta = IF(EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='alerta_estoque_peca' AND column_name='id_usuario_encerramento'), 'DO 0', 'ALTER TABLE alerta_estoque_peca ADD COLUMN id_usuario_encerramento BIGINT UNSIGNED NULL');
PREPARE ddl_alerta FROM @ddl_alerta;
EXECUTE ddl_alerta;
DEALLOCATE PREPARE ddl_alerta;

SET @ddl_alerta = IF(EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='alerta_estoque_peca' AND column_name='nome_usuario_encerramento'), 'DO 0', 'ALTER TABLE alerta_estoque_peca ADD COLUMN nome_usuario_encerramento VARCHAR(255) NULL');
PREPARE ddl_alerta FROM @ddl_alerta;
EXECUTE ddl_alerta;
DEALLOCATE PREPARE ddl_alerta;

SET @ddl_alerta = IF(EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='alerta_estoque_peca' AND column_name='justificativa_encerramento'), 'DO 0', 'ALTER TABLE alerta_estoque_peca ADD COLUMN justificativa_encerramento VARCHAR(1000) NULL');
PREPARE ddl_alerta FROM @ddl_alerta;
EXECUTE ddl_alerta;
DEALLOCATE PREPARE ddl_alerta;

SET @ddl_alerta = IF(EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='alerta_estoque_peca' AND column_name='excecao_ativa'), 'DO 0', 'ALTER TABLE alerta_estoque_peca ADD COLUMN excecao_ativa BOOLEAN NOT NULL DEFAULT FALSE');
PREPARE ddl_alerta FROM @ddl_alerta;
EXECUTE ddl_alerta;
DEALLOCATE PREPARE ddl_alerta;
