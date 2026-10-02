-- Aplicar no banco clinicar antes de iniciar o backend atualizado.
-- Não apaga nem altera tabelas existentes. Reexecução preserva a configuração.
CREATE TABLE IF NOT EXISTS configuracao_alerta_manutencao (
 id BIGINT NOT NULL PRIMARY KEY,
 versao BIGINT NULL,
 ativo BIT(1) NOT NULL DEFAULT FALSE,
 antecedencia_dias INT NOT NULL DEFAULT 15,
 intervalo_dias INT NOT NULL DEFAULT 7,
 maximo_envios INT NOT NULL DEFAULT 3,
 dias_apos_vencimento INT NOT NULL DEFAULT 30,
 hora_inicio INT NOT NULL DEFAULT 9,
 hora_fim INT NOT NULL DEFAULT 18,
 fuso_horario VARCHAR(60) NOT NULL DEFAULT 'America/Sao_Paulo',
 CONSTRAINT chk_alerta_antecedencia CHECK (antecedencia_dias BETWEEN 0 AND 365),
 CONSTRAINT chk_alerta_intervalo CHECK (intervalo_dias BETWEEN 1 AND 365),
 CONSTRAINT chk_alerta_maximo CHECK (maximo_envios BETWEEN 1 AND 100),
 CONSTRAINT chk_alerta_apos CHECK (dias_apos_vencimento BETWEEN 0 AND 365),
 CONSTRAINT chk_alerta_horario CHECK (hora_inicio BETWEEN 0 AND 23 AND hora_fim > hora_inicio AND hora_fim <= 24)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
INSERT IGNORE INTO configuracao_alerta_manutencao (id, versao) VALUES (1, 0);
CREATE TABLE IF NOT EXISTS envio_alerta_manutencao (
 id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
 previsao_id BIGINT NOT NULL,
 proprietario_id BIGINT NOT NULL,
 destinatario VARCHAR(254) NOT NULL,
 status VARCHAR(30) NOT NULL,
 criado_em TIMESTAMP(6) NOT NULL,
 finalizado_em TIMESTAMP(6) NULL,
 detalhe VARCHAR(300) NULL,
 INDEX idx_envio_previsao (previsao_id, criado_em)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
-- IDs do histórico são snapshots; permanecem disponíveis mesmo se o cadastro for removido.
