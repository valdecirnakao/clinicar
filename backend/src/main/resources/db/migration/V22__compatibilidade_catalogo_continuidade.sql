-- Bases criadas por versões anteriores podem usar CHAR ou VARCHAR para o hash.
-- O tamanho e o índice de unicidade são preservados; nenhum cadastro é removido.
ALTER TABLE peca MODIFY COLUMN chave_catalogo VARCHAR(64) NULL;

-- Um administrador pode manter mais de um cadastro interrompido da mesma entidade.
ALTER TABLE cadastro_continuidade ADD COLUMN chave_contexto CHAR(64) NULL;
UPDATE cadastro_continuidade SET chave_contexto=SHA2(contexto,256);
ALTER TABLE cadastro_continuidade MODIFY COLUMN chave_contexto CHAR(64) NOT NULL;
ALTER TABLE cadastro_continuidade DROP INDEX uk_continuidade_usuario_tipo,
 ADD UNIQUE KEY uk_continuidade_usuario_contexto (usuario_id,tipo,chave_contexto);
