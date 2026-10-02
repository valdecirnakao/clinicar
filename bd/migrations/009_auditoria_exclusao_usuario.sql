-- Registro independente do usuário removido, sem exclusão em cascata.
CREATE TABLE IF NOT EXISTS auditoria_exclusao_usuario (
 id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
 usuario_id BIGINT NOT NULL,
 usuario_nome VARCHAR(255) NOT NULL,
 administrador_id BIGINT NOT NULL,
 administrador_nome VARCHAR(255) NOT NULL,
 justificativa VARCHAR(1000) NOT NULL,
 realizado_em TIMESTAMP(6) NOT NULL,
 INDEX idx_exclusao_usuario_data (usuario_id, realizado_em),
 INDEX idx_exclusao_admin_data (administrador_id, realizado_em)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
