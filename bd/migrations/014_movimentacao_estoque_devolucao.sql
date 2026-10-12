-- Vínculo opcional da devolução com a saída manual original. Preserva registros existentes.
SET @ddl_devolucao = IF(EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='movimentacao_estoque_peca' AND column_name='id_movimentacao_origem'), 'DO 0', 'ALTER TABLE movimentacao_estoque_peca ADD COLUMN id_movimentacao_origem BIGINT NULL');
PREPARE ddl_devolucao FROM @ddl_devolucao;
EXECUTE ddl_devolucao;
DEALLOCATE PREPARE ddl_devolucao;

SET @ddl_devolucao = IF(EXISTS(SELECT 1 FROM information_schema.statistics WHERE table_schema=DATABASE() AND table_name='movimentacao_estoque_peca' AND index_name='idx_movimentacao_origem'), 'DO 0', 'CREATE INDEX idx_movimentacao_origem ON movimentacao_estoque_peca(id_movimentacao_origem)');
PREPARE ddl_devolucao FROM @ddl_devolucao;
EXECUTE ddl_devolucao;
DEALLOCATE PREPARE ddl_devolucao;

SET @ddl_devolucao = IF(EXISTS(SELECT 1 FROM information_schema.table_constraints WHERE constraint_schema=DATABASE() AND table_name='movimentacao_estoque_peca' AND constraint_name='fk_movimentacao_origem'), 'DO 0', 'ALTER TABLE movimentacao_estoque_peca ADD CONSTRAINT fk_movimentacao_origem FOREIGN KEY (id_movimentacao_origem) REFERENCES movimentacao_estoque_peca(id) ON DELETE RESTRICT');
PREPARE ddl_devolucao FROM @ddl_devolucao;
EXECUTE ddl_devolucao;
DEALLOCATE PREPARE ddl_devolucao;
