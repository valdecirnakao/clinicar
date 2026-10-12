-- Preserva os fornecedores existentes como ativos. Aplicar antes de iniciar o backend atualizado.
SET @ddl_fornecedor = IF(EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='fornecedor' AND column_name='ativo'), 'DO 0', 'ALTER TABLE fornecedor ADD COLUMN ativo BIT(1) NOT NULL DEFAULT b''1''');
PREPARE ddl_fornecedor FROM @ddl_fornecedor;
EXECUTE ddl_fornecedor;
DEALLOCATE PREPARE ddl_fornecedor;
