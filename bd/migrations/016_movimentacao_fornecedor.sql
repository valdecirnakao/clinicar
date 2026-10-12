-- Fornecedor da compra e da devolução. Registros anteriores permanecem preservados.
SET @ddl_mov = IF(EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='movimentacao_estoque_peca' AND column_name='id_fornecedor'), 'DO 0', 'ALTER TABLE movimentacao_estoque_peca ADD COLUMN id_fornecedor BIGINT UNSIGNED NULL');
PREPARE ddl_mov FROM @ddl_mov;
EXECUTE ddl_mov;
DEALLOCATE PREPARE ddl_mov;
SET @ddl_mov = IF(EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='movimentacao_estoque_peca' AND column_name='nome_fornecedor'), 'DO 0', 'ALTER TABLE movimentacao_estoque_peca ADD COLUMN nome_fornecedor VARCHAR(255) NULL');
PREPARE ddl_mov FROM @ddl_mov;
EXECUTE ddl_mov;
DEALLOCATE PREPARE ddl_mov;
SET @ddl_mov = IF(EXISTS(SELECT 1 FROM information_schema.statistics WHERE table_schema=DATABASE() AND table_name='movimentacao_estoque_peca' AND index_name='idx_movimentacao_fornecedor'), 'DO 0', 'CREATE INDEX idx_movimentacao_fornecedor ON movimentacao_estoque_peca(id_fornecedor)');
PREPARE ddl_mov FROM @ddl_mov;
EXECUTE ddl_mov;
DEALLOCATE PREPARE ddl_mov;
SET @ddl_mov = IF(EXISTS(SELECT 1 FROM information_schema.table_constraints WHERE constraint_schema=DATABASE() AND table_name='movimentacao_estoque_peca' AND constraint_name='fk_mov_estoque_fornecedor'), 'DO 0', 'ALTER TABLE movimentacao_estoque_peca ADD CONSTRAINT fk_mov_estoque_fornecedor FOREIGN KEY (id_fornecedor) REFERENCES fornecedor(id) ON DELETE RESTRICT');
PREPARE ddl_mov FROM @ddl_mov;
EXECUTE ddl_mov;
DEALLOCATE PREPARE ddl_mov;