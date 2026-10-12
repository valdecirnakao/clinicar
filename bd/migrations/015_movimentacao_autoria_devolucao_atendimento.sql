-- Autoria e devolução vinculada ao atendimento. Preserva registros anteriores.
SET @ddl_mov = IF(EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='movimentacao_estoque_peca' AND column_name='nome_usuario'), 'DO 0', 'ALTER TABLE movimentacao_estoque_peca ADD COLUMN nome_usuario VARCHAR(255) NULL');
PREPARE ddl_mov FROM @ddl_mov;
EXECUTE ddl_mov;
DEALLOCATE PREPARE ddl_mov;

SET @ddl_mov = IF(EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='movimentacao_estoque_peca' AND column_name='id_atendimento'), 'DO 0', 'ALTER TABLE movimentacao_estoque_peca ADD COLUMN id_atendimento BIGINT UNSIGNED NULL');
PREPARE ddl_mov FROM @ddl_mov;
EXECUTE ddl_mov;
DEALLOCATE PREPARE ddl_mov;

SET @ddl_mov = IF(EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='movimentacao_estoque_peca' AND column_name='custo_unitario_estoque'), 'DO 0', 'ALTER TABLE movimentacao_estoque_peca ADD COLUMN custo_unitario_estoque DECIMAL(10,2) NULL');
PREPARE ddl_mov FROM @ddl_mov;
EXECUTE ddl_mov;
DEALLOCATE PREPARE ddl_mov;

SET @ddl_mov = IF(EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='movimentacao_estoque_peca' AND column_name='tratamento_cobranca'), 'DO 0', 'ALTER TABLE movimentacao_estoque_peca ADD COLUMN tratamento_cobranca VARCHAR(40) NULL');
PREPARE ddl_mov FROM @ddl_mov;
EXECUTE ddl_mov;
DEALLOCATE PREPARE ddl_mov;

SET @ddl_mov = IF(EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='movimentacao_estoque_peca' AND column_name='valor_restituicao'), 'DO 0', 'ALTER TABLE movimentacao_estoque_peca ADD COLUMN valor_restituicao DECIMAL(10,2) NULL');
PREPARE ddl_mov FROM @ddl_mov;
EXECUTE ddl_mov;
DEALLOCATE PREPARE ddl_mov;

SET @ddl_mov = IF(EXISTS(SELECT 1 FROM information_schema.statistics WHERE table_schema=DATABASE() AND table_name='movimentacao_estoque_peca' AND index_name='idx_movimentacao_atendimento'), 'DO 0', 'CREATE INDEX idx_movimentacao_atendimento ON movimentacao_estoque_peca(id_atendimento)');
PREPARE ddl_mov FROM @ddl_mov;
EXECUTE ddl_mov;
DEALLOCATE PREPARE ddl_mov;

-- Atendimento é criado depois das tabelas de estoque.
SET @ddl_mov = IF(EXISTS(SELECT 1 FROM information_schema.table_constraints WHERE constraint_schema=DATABASE() AND table_name='movimentacao_estoque_peca' AND constraint_name='fk_mov_estoque_atendimento'), 'DO 0', 'ALTER TABLE movimentacao_estoque_peca ADD CONSTRAINT fk_mov_estoque_atendimento FOREIGN KEY (id_atendimento) REFERENCES atendimento(id) ON DELETE RESTRICT');
PREPARE ddl_mov FROM @ddl_mov;
EXECUTE ddl_mov;
DEALLOCATE PREPARE ddl_mov;
