-- Registro de consultas, detalhes e exportações. Sem FK para preservar a identidade histórica.
CREATE TABLE IF NOT EXISTS auditoria_consulta (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  usuario_id BIGINT NOT NULL,
  usuario_nome VARCHAR(255) NOT NULL,
  operacao VARCHAR(30) NOT NULL,
  descricao VARCHAR(1000) NOT NULL,
  realizado_em TIMESTAMP(6) NOT NULL,
  INDEX idx_auditoria_consulta_data (realizado_em),
  INDEX idx_auditoria_consulta_usuario (usuario_id, realizado_em)
);
