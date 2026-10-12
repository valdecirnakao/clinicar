-- Nova tabela por destinatário. A tabela legada fica preservada para recuperação.
-- A cópia ocorre somente na primeira execução, sem ativar usuários criados depois.
SET @migrar_alertas_usuario = NOT EXISTS (
 SELECT 1 FROM information_schema.tables
 WHERE table_schema = DATABASE() AND table_name = 'configuracao_alerta_manutencao_usuario');
CREATE TABLE IF NOT EXISTS configuracao_alerta_manutencao_usuario LIKE configuracao_alerta_manutencao;
INSERT IGNORE INTO configuracao_alerta_manutencao_usuario
 (id, versao, ativo, antecedencia_dias, intervalo_dias, maximo_envios,
 dias_apos_vencimento, hora_inicio, hora_fim, fuso_horario)
SELECT u.id, 0, c.ativo, c.antecedencia_dias, c.intervalo_dias, c.maximo_envios,
 c.dias_apos_vencimento, c.hora_inicio, c.hora_fim, c.fuso_horario
FROM usuario u CROSS JOIN configuracao_alerta_manutencao c WHERE c.id = 1 AND @migrar_alertas_usuario;
-- id corresponde ao usuário; os envios existentes e suas contagens são preservados.
