CREATE TABLE notificacao_outbox (
 id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
 chave_evento VARCHAR(100) NOT NULL UNIQUE,
 canal VARCHAR(20) NOT NULL,
 destinatario VARCHAR(255) NOT NULL,
 template VARCHAR(100) NOT NULL,
 idioma VARCHAR(20) NOT NULL DEFAULT 'pt_BR',
 parametros LONGTEXT NOT NULL,
 origem VARCHAR(30) NULL,
 registro_origem_id BIGINT NULL,
 expira_em TIMESTAMP(6) NULL,
 estado VARCHAR(30) NOT NULL DEFAULT 'PENDENTE',
 tentativas INT NOT NULL DEFAULT 0,
 proxima_tentativa_em TIMESTAMP(6) NOT NULL,
 criado_em TIMESTAMP(6) NOT NULL,
 atualizado_em TIMESTAMP(6) NOT NULL,
 reservado_ate TIMESTAMP(6) NULL,
 provider_id VARCHAR(255) NULL,
 ultimo_erro VARCHAR(500) NULL,
 INDEX idx_outbox_pendentes (estado, proxima_tentativa_em),
 INDEX idx_outbox_provider (provider_id)
);

CREATE TABLE auditoria_evento (
 id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
 usuario_id BIGINT NOT NULL,
 usuario_nome VARCHAR(255) NOT NULL,
 componente VARCHAR(50) NOT NULL,
 operacao VARCHAR(30) NOT NULL,
 registro_id BIGINT NULL,
 descricao VARCHAR(1000) NOT NULL,
 realizado_em TIMESTAMP(6) NOT NULL,
 INDEX idx_auditoria_evento_data (realizado_em),
 INDEX idx_auditoria_evento_registro (componente, registro_id)
);

CREATE TABLE requisicao_idempotente (
 id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
 usuario_id BIGINT NOT NULL,
 chave VARCHAR(64) NOT NULL,
 impressao VARCHAR(64) NOT NULL,
 estado VARCHAR(20) NOT NULL,
 resposta_status INT NULL,
 resposta_tipo VARCHAR(150) NULL,
 resposta LONGTEXT NULL,
 criado_em TIMESTAMP(6) NOT NULL,
 UNIQUE KEY uk_requisicao_usuario_chave (usuario_id, chave),
 INDEX idx_requisicao_data (criado_em)
);

CREATE TABLE cadastro_continuidade (
 id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
 usuario_id BIGINT NOT NULL,
 tipo VARCHAR(30) NOT NULL,
 titulo VARCHAR(255) NOT NULL,
 rota VARCHAR(100) NOT NULL,
 contexto VARCHAR(1500) NOT NULL,
 estado VARCHAR(20) NOT NULL DEFAULT 'PENDENTE',
 atualizado_em TIMESTAMP(6) NOT NULL,
 UNIQUE KEY uk_continuidade_usuario_tipo (usuario_id, tipo),
 INDEX idx_continuidade_estado (usuario_id, estado)
);

CREATE TABLE registro_versao (
 recurso VARCHAR(60) NOT NULL,
 registro_id BIGINT NOT NULL,
 versao BIGINT NOT NULL DEFAULT 0,
 PRIMARY KEY (recurso,registro_id)
);
