-- Migração idempotente. Não exclui nem altera dados existentes.
-- Conferir duplicidades antes da aplicação. Conflitos de dados interrompem o ALTER.

SET @ddl_cadastro = IF(EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='peca' AND column_name='chave_catalogo'), 'DO 0', 'ALTER TABLE peca ADD COLUMN chave_catalogo VARCHAR(64) NULL');
PREPARE ddl_cadastro FROM @ddl_cadastro;
EXECUTE ddl_cadastro;
DEALLOCATE PREPARE ddl_cadastro;

SET @ddl_cadastro = IF(EXISTS(SELECT 1 FROM information_schema.statistics WHERE table_schema=DATABASE() AND table_name='peca' AND index_name='uk_peca_chave_catalogo'), 'DO 0', 'ALTER TABLE peca ADD CONSTRAINT uk_peca_chave_catalogo UNIQUE (chave_catalogo)');
PREPARE ddl_cadastro FROM @ddl_cadastro;
EXECUTE ddl_cadastro;
DEALLOCATE PREPARE ddl_cadastro;

SET @ddl_cadastro = IF(EXISTS(SELECT 1 FROM information_schema.statistics WHERE table_schema=DATABASE() AND table_name='servico' AND index_name='uk_servico_nome_categoria'), 'DO 0', 'ALTER TABLE servico ADD CONSTRAINT uk_servico_nome_categoria UNIQUE (nome,categoria)');
PREPARE ddl_cadastro FROM @ddl_cadastro;
EXECUTE ddl_cadastro;
DEALLOCATE PREPARE ddl_cadastro;

SET @ddl_cadastro = IF(EXISTS(SELECT 1 FROM information_schema.statistics WHERE table_schema=DATABASE() AND table_name='fornecimento_pecas' AND index_name='uk_fornecedor_peca'), 'DO 0', 'ALTER TABLE fornecimento_pecas ADD CONSTRAINT uk_fornecedor_peca UNIQUE (id_fornecedor,id_peca)');
PREPARE ddl_cadastro FROM @ddl_cadastro;
EXECUTE ddl_cadastro;
DEALLOCATE PREPARE ddl_cadastro;

SET @ddl_cadastro = IF(EXISTS(SELECT 1 FROM information_schema.statistics WHERE table_schema=DATABASE() AND table_name='regra_manutencao_preventiva' AND index_name='uk_regra_grupo_descricao'), 'DO 0', 'ALTER TABLE regra_manutencao_preventiva ADD CONSTRAINT uk_regra_grupo_descricao UNIQUE (grupo_manutencao,descricao)');
PREPARE ddl_cadastro FROM @ddl_cadastro;
EXECUTE ddl_cadastro;
DEALLOCATE PREPARE ddl_cadastro;

SET @ddl_cadastro = IF(EXISTS(SELECT 1 FROM information_schema.statistics WHERE table_schema=DATABASE() AND table_name='fornecedor' AND index_name='uk_fornecedor_email'), 'DO 0', 'ALTER TABLE fornecedor ADD CONSTRAINT uk_fornecedor_email UNIQUE (email)');
PREPARE ddl_cadastro FROM @ddl_cadastro;
EXECUTE ddl_cadastro;
DEALLOCATE PREPARE ddl_cadastro;

-- A chave de peças é calculada pelo backend antes de persistir/atualizar.
-- Registros legados são também conferidos por nome/fabricante + identidade completa.
