-- =============================================================================
-- CliniCar - TCC
-- Arquivo: TG/bd/init.sql
-- Banco: MySQL 8.x
-- Finalidade: inicialização automática do banco no Docker
-- =============================================================================
--
-- Observações:
-- 1. Este script foi organizado para uma instalação NOVA do banco.
-- 2. Ele é idempotente no nível de criação (CREATE ... IF NOT EXISTS).
-- 3. Não há DROP TABLE nem dados de usuário/senhas pré-carregados.
-- 4. Credenciais e tokens do WhatsApp NÃO devem ser gravados aqui.
-- 5. CREATE IF NOT EXISTS não migra tabelas de volumes existentes.
--    Alterações de tamanho abaixo aplicam-se somente à instalação limpa.
--    Campos legados são preservados, sem conversão automática de dados.
--    BIGINT UNSIGNED é propagado nas FKs exigidas pelos columnDefinition JPA.
-- 6. O nome do banco abaixo deve coincidir com MYSQL_DATABASE e com a URL JDBC.
-- =============================================================================

SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

CREATE DATABASE IF NOT EXISTS clinicar
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_0900_ai_ci;

USE clinicar;

-- =============================================================================
-- 1. USUÁRIOS E AUTENTICAÇÃO
-- =============================================================================

CREATE TABLE IF NOT EXISTS usuario (
    id                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    nome                VARCHAR(255) NULL,
    nome_social         VARCHAR(255) NULL,
    email               VARCHAR(255) NOT NULL,
    senha               VARCHAR(255) NULL,
    cpf                 VARCHAR(255) NULL,
    nascimento          DATE NULL,
    telefone            VARCHAR(255) NULL,
    cep                 VARCHAR(255) NULL,
    logradouro          VARCHAR(255) NULL,
    numero_endereco     VARCHAR(255) NULL,
    complemento_endereco VARCHAR(255) NULL,
    bairro              VARCHAR(255) NULL,
    cidade              VARCHAR(255) NULL,
    estado              VARCHAR(255) NULL,
    tipo_do_acesso      VARCHAR(255) NULL,
    status              VARCHAR(255) NULL DEFAULT 'ATIVO',
    mfa_ativo           BIT(1) NOT NULL DEFAULT FALSE,
    mfa_secret          VARCHAR(1000) NULL,
    mfa_tipo            VARCHAR(30) NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_usuario_email UNIQUE (email),
    CONSTRAINT uk_usuario_cpf UNIQUE (cpf),
    INDEX idx_usuario_nome (nome),
    INDEX idx_usuario_tipo_acesso (tipo_do_acesso),
    INDEX idx_usuario_status (status)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS configuracao_sistema (
    id BIGINT NOT NULL,
    estado_setup ENUM('NAO_INICIADO','AGUARDANDO_ATIVACAO','CONCLUIDO') NOT NULL DEFAULT 'NAO_INICIADO',
    administrador_inicial_id BIGINT UNSIGNED NULL,
    setup_iniciado_em DATETIME(6) NULL,
    setup_concluido_em DATETIME(6) NULL,
    atualizado_em DATETIME(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),

    PRIMARY KEY (id),

    CONSTRAINT fk_configuracao_sistema_administrador
        FOREIGN KEY (administrador_inicial_id)
        REFERENCES usuario(id)
        ON DELETE SET NULL
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO configuracao_sistema (
    id,
    estado_setup
) VALUES (
    1,
    'NAO_INICIADO'
)
ON DUPLICATE KEY UPDATE id = id;

CREATE TABLE IF NOT EXISTS token_ativacao_usuario (
    id BIGINT NOT NULL AUTO_INCREMENT,

    usuario_id BIGINT UNSIGNED NOT NULL,

    token_hash VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,

    tipo VARCHAR(40) NOT NULL,

    criado_em DATETIME(6) NOT NULL,
    expira_em DATETIME(6) NOT NULL,

    usado_em DATETIME(6) NULL,

    revogado BIT(1) NOT NULL DEFAULT FALSE,

    PRIMARY KEY (id),

    UNIQUE KEY uk_token_ativacao_usuario_hash (token_hash),

    KEY idx_token_ativacao_usuario_usuario (usuario_id),
    KEY idx_token_ativacao_usuario_expira (expira_em),
    KEY idx_token_ativacao_usuario_tipo (tipo),

    CONSTRAINT fk_token_ativacao_usuario_usuario
        FOREIGN KEY (usuario_id)
        REFERENCES usuario(id)
        ON DELETE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS mfa_challenge (
    id BIGINT NOT NULL AUTO_INCREMENT,

    usuario_id BIGINT UNSIGNED NOT NULL,

    token_hash VARCHAR(255) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    tipo VARCHAR(20) NOT NULL,

    secret_temporario VARCHAR(1000) NULL,

    tentativas INT NOT NULL DEFAULT 0,

    usado BIT(1) NOT NULL DEFAULT FALSE,

    criado_em DATETIME(6) NOT NULL,
    expira_em DATETIME(6) NOT NULL,

    PRIMARY KEY (id),

    UNIQUE KEY uk_mfa_challenge_token_hash (token_hash),

    KEY idx_mfa_challenge_usuario_usado (usuario_id, usado),

    CONSTRAINT fk_mfa_challenge_usuario
        FOREIGN KEY (usuario_id)
        REFERENCES usuario(id)
        ON DELETE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS auth_session (
    id              BIGINT NOT NULL AUTO_INCREMENT,
    usuario_id      BIGINT UNSIGNED NOT NULL,
    token_hash      VARCHAR(255) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    criado_em       DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    expira_em       DATETIME(6) NOT NULL,
    ultimo_uso_em   DATETIME(6) NULL,
    revogado        BIT(1) NOT NULL DEFAULT FALSE,

    PRIMARY KEY (id),
    CONSTRAINT uk_auth_session_token_hash UNIQUE (token_hash),
    CONSTRAINT fk_auth_session_usuario
        FOREIGN KEY (usuario_id) REFERENCES usuario(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    INDEX idx_auth_session_usuario (usuario_id),
    INDEX idx_auth_session_expira (expira_em),
    INDEX idx_auth_session_revogado (revogado)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS password_reset_token (
    id                          BIGINT NOT NULL AUTO_INCREMENT,
    token_hash                  VARCHAR(255) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    usuario_id                  BIGINT UNSIGNED NOT NULL,
    expira_em                   DATETIME(6) NOT NULL,
    usado                       BIT(1) NOT NULL DEFAULT FALSE,
    criado_em                   DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_password_reset_usuario FOREIGN KEY (usuario_id) REFERENCES usuario(id) ON DELETE RESTRICT,
    UNIQUE KEY uk_password_reset_token_hash (token_hash),
    INDEX idx_password_reset_usuario_usado (usuario_id, usado)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;

-- =============================================================================
-- 2. FORNECEDORES
-- =============================================================================

CREATE TABLE IF NOT EXISTS fornecedor (
    id                   BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    cnpj                 VARCHAR(255) NULL,
    razao_social         VARCHAR(255) NULL,
    nome_fantasia        VARCHAR(255) NULL,
    item_fornecido       VARCHAR(255) NULL,
    telefone             VARCHAR(255) NULL,
    email                VARCHAR(255) NULL,
    fundacao             DATE NULL,

    cep                  VARCHAR(255) NULL,
    logradouro           VARCHAR(255) NULL,
    numero_endereco      VARCHAR(255) NULL,
    complemento_endereco VARCHAR(255) NULL,
    bairro               VARCHAR(255) NULL,
    cidade               VARCHAR(255) NULL,
    estado               VARCHAR(255) NULL,

    PRIMARY KEY (id),
    CONSTRAINT uk_fornecedor_cnpj UNIQUE (cnpj),
    INDEX idx_fornecedor_razao_social (razao_social),
    INDEX idx_fornecedor_nome_fantasia (nome_fantasia)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;

-- =============================================================================
-- 3. VEÍCULOS
-- =============================================================================

CREATE TABLE IF NOT EXISTS veiculo (
    id                      BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    placa                   VARCHAR(10) NOT NULL,
    fabricante              VARCHAR(255) NOT NULL,
    modelo                  VARCHAR(255) NOT NULL,
    cor                     VARCHAR(255) NOT NULL,
    ano_modelo_combustivel  VARCHAR(255) NOT NULL,
    id_proprietario         BIGINT UNSIGNED NOT NULL,

    PRIMARY KEY (id),
    CONSTRAINT uk_veiculo_placa UNIQUE (placa),
    CONSTRAINT fk_veiculo_proprietario
        FOREIGN KEY (id_proprietario) REFERENCES usuario(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    INDEX idx_veiculo_proprietario (id_proprietario),
    INDEX idx_veiculo_fabricante_modelo (fabricante, modelo)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;

-- =============================================================================
-- 4. CATÁLOGO DE PEÇAS
-- =============================================================================

CREATE TABLE IF NOT EXISTS peca (
    id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    nome            VARCHAR(200) NOT NULL,
    tipo            VARCHAR(100) NULL,
    especificacao   VARCHAR(200) NULL,
    fabricante      VARCHAR(200) NULL,
    modelo          VARCHAR(200) NULL,
    norma           VARCHAR(100) NULL,
    unidade         VARCHAR(50) NULL,

    descricao                       VARCHAR(500) NULL,

    origem_oleo                     VARCHAR(30) NULL,

    observacoes                     VARCHAR(500) NULL,

    criado_em                       DATETIME(6) NULL,

    atualizado_em                   DATETIME(6) NULL,

    PRIMARY KEY (id),
    INDEX idx_peca_nome (nome),
    INDEX idx_peca_tipo (tipo),
    INDEX idx_peca_fabricante (fabricante)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;

-- =============================================================================
-- 5. CATÁLOGO DE SERVIÇOS
-- =============================================================================

CREATE TABLE IF NOT EXISTS servico (
    id                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    nome                VARCHAR(120) NOT NULL,
    descricao           VARCHAR(500) NULL,
    categoria           VARCHAR(100) NOT NULL,

    tipo_do_prestador   VARCHAR(100) NOT NULL,
    id_fornecedor       BIGINT UNSIGNED NULL,

    duracao_estimada    DECIMAL(6,2) NOT NULL,
    unidade_duracao     VARCHAR(30) NOT NULL,

    valor_base          DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    unidade_cobranca    VARCHAR(50) NOT NULL,

    garantia_dias       INT NOT NULL DEFAULT 0,
    necessita_pecas     BIT(1) NOT NULL DEFAULT FALSE,
    observacoes         VARCHAR(500) NULL,
    ativo               BIT(1) NOT NULL DEFAULT TRUE,

    criado_em           DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    atualizado_em       DATETIME(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),

    PRIMARY KEY (id),
    CONSTRAINT fk_servico_fornecedor
        FOREIGN KEY (id_fornecedor) REFERENCES fornecedor(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,
    INDEX idx_servico_nome (nome),
    INDEX idx_servico_categoria (categoria),
    INDEX idx_servico_fornecedor (id_fornecedor),
    INDEX idx_servico_ativo (ativo)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;

-- =============================================================================
-- 6. FORNECIMENTO DE PEÇAS
-- =============================================================================

CREATE TABLE IF NOT EXISTS fornecimento_pecas (
    -- Colunas legadas preservadas: criado_em, atualizado_em.
    id                    BIGINT NOT NULL AUTO_INCREMENT,
    id_fornecedor         BIGINT UNSIGNED NOT NULL,
    id_peca               BIGINT UNSIGNED NOT NULL,

    valor_custo           DECIMAL(38,2) NULL DEFAULT 0.00,
    prazo_entrega_dias    INT NULL,
    quantidade_minima     INT NULL,
    ativo                 BIT(1) NULL DEFAULT TRUE,

    data_cadastro         DATE NULL,
    criado_em             DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    atualizado_em         DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
                          ON UPDATE CURRENT_TIMESTAMP(6),

    PRIMARY KEY (id),
    CONSTRAINT uk_fornecimento_peca UNIQUE (id_fornecedor, id_peca),
    CONSTRAINT fk_fornecimento_peca_fornecedor
        FOREIGN KEY (id_fornecedor) REFERENCES fornecedor(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT fk_fornecimento_peca_peca
        FOREIGN KEY (id_peca) REFERENCES peca(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    INDEX idx_fornecimento_peca_fornecedor (id_fornecedor),
    INDEX idx_fornecimento_peca_peca (id_peca),
    INDEX idx_fornecimento_peca_ativo (ativo)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;

-- =============================================================================
-- 7. FORNECIMENTO DE SERVIÇOS
-- =============================================================================

CREATE TABLE IF NOT EXISTS fornecimento_servicos (
    id                    BIGINT NOT NULL AUTO_INCREMENT,
    id_fornecedor         BIGINT UNSIGNED NOT NULL,
    id_servico            BIGINT UNSIGNED NOT NULL,

    valor_custo           DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    unidade_cobranca      VARCHAR(50) NOT NULL,

    prazo_execucao        DECIMAL(6,2) NOT NULL,
    unidade_prazo         VARCHAR(30) NOT NULL,
    quantidade_minima     INT NOT NULL DEFAULT 1,

    disponibilidade       VARCHAR(50) NOT NULL DEFAULT 'SOB_DEMANDA',
    contrato_referencia   VARCHAR(120) NULL,
    data_inicio_vigencia  DATE NULL,
    data_fim_vigencia     DATE NULL,
    ativo                 BIT(1) NOT NULL DEFAULT TRUE,
    observacoes           VARCHAR(500) NULL,

    criado_em             DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    atualizado_em         DATETIME(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),

    PRIMARY KEY (id),
    CONSTRAINT uk_fornecimento_servico UNIQUE (id_fornecedor, id_servico),
    CONSTRAINT fk_fornecimento_servico_fornecedor
        FOREIGN KEY (id_fornecedor) REFERENCES fornecedor(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT fk_fornecimento_servico_servico
        FOREIGN KEY (id_servico) REFERENCES servico(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    INDEX idx_fornecimento_servico_fornecedor (id_fornecedor),
    INDEX idx_fornecimento_servico_servico (id_servico),
    INDEX idx_fornecimento_servico_ativo (ativo)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;

-- =============================================================================
-- 8. LOCAIS DE ESTOQUE
-- =============================================================================

CREATE TABLE IF NOT EXISTS local_estoque (
    id              BIGINT NOT NULL AUTO_INCREMENT,
    nome            VARCHAR(120) NOT NULL,
    descricao       VARCHAR(300) NULL,
    ativo           BIT(1) NOT NULL DEFAULT TRUE,
    criado_em       DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    atualizado_em   DATETIME(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),

    PRIMARY KEY (id),
    CONSTRAINT uk_local_estoque_nome UNIQUE (nome),
    INDEX idx_local_estoque_ativo (ativo)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;

-- =============================================================================
-- 9. CONTROLE DE ESTOQUE POR PEÇA / LOCAL
-- =============================================================================

CREATE TABLE IF NOT EXISTS estoque_peca (
    id                              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    id_peca                         BIGINT UNSIGNED NOT NULL,
    id_local_estoque                BIGINT NOT NULL,

    quantidade_atual                DECIMAL(12,3) NOT NULL DEFAULT 0,
    quantidade_reservada            DECIMAL(10,2) NOT NULL DEFAULT 0,

    estoque_minimo                  DECIMAL(12,3) NOT NULL DEFAULT 0,
    estoque_critico                 DECIMAL(12,3) NOT NULL DEFAULT 0,
    estoque_maximo                  DECIMAL(12,3) NULL,

    ponto_reposicao                 DECIMAL(12,3) NULL,
    quantidade_reposicao_sugerida   DECIMAL(12,3) NULL,

    custo_medio                     DECIMAL(10,2) NULL DEFAULT 0.00,
    localizacao_fisica              VARCHAR(120) NULL,
    status_estoque                  VARCHAR(30) NOT NULL DEFAULT 'NORMAL',
    ativo                           BIT(1) NOT NULL DEFAULT TRUE,

    criado_em                       DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    atualizado_em                   DATETIME(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),

    PRIMARY KEY (id),
    CONSTRAINT uk_estoque_peca_local UNIQUE (id_peca, id_local_estoque),
    CONSTRAINT fk_estoque_peca_peca
        FOREIGN KEY (id_peca) REFERENCES peca(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT fk_estoque_peca_local
        FOREIGN KEY (id_local_estoque) REFERENCES local_estoque(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    INDEX idx_estoque_peca_status (status_estoque),
    INDEX idx_estoque_peca_ativo (ativo),
    INDEX idx_estoque_peca_local (id_local_estoque)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;

-- =============================================================================
-- 10. MOVIMENTAÇÕES DE ESTOQUE
-- =============================================================================

CREATE TABLE IF NOT EXISTS movimentacao_estoque_peca (
    id                    BIGINT NOT NULL AUTO_INCREMENT,
    id_estoque_peca       BIGINT UNSIGNED NOT NULL,
    id_peca               BIGINT UNSIGNED NOT NULL,

    tipo_movimento        VARCHAR(40) NOT NULL,
    quantidade            DECIMAL(12,3) NOT NULL,
    saldo_anterior        DECIMAL(12,3) NOT NULL,
    saldo_posterior       DECIMAL(12,3) NOT NULL,

    valor_unitario        DECIMAL(10,2) NULL,
    valor_total           DECIMAL(10,2) NULL,

    origem                VARCHAR(80) NULL,
    documento_referencia  VARCHAR(120) NULL,
    motivo                VARCHAR(200) NULL,
    observacoes           VARCHAR(500) NULL,

    id_usuario            BIGINT UNSIGNED NULL,
    criado_em             DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),

    PRIMARY KEY (id),
    CONSTRAINT fk_mov_estoque_estoque
        FOREIGN KEY (id_estoque_peca) REFERENCES estoque_peca(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT fk_mov_estoque_peca
        FOREIGN KEY (id_peca) REFERENCES peca(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT fk_mov_estoque_usuario
        FOREIGN KEY (id_usuario) REFERENCES usuario(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,
    INDEX idx_mov_estoque_estoque (id_estoque_peca),
    INDEX idx_mov_estoque_peca (id_peca),
    INDEX idx_mov_estoque_tipo (tipo_movimento),
    INDEX idx_mov_estoque_criado (criado_em),
    INDEX idx_mov_estoque_documento (documento_referencia)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;

-- =============================================================================
-- 11. CONFIGURAÇÃO DE ALERTAS DE ESTOQUE
-- =============================================================================

CREATE TABLE IF NOT EXISTS configuracao_alerta_estoque (
    -- Colunas legadas preservadas: nome_administrador.
    id                      BIGINT NOT NULL AUTO_INCREMENT,
    nome_administrador      VARCHAR(150) NULL,
    telefone_administrador  VARCHAR(30) NOT NULL,
    ativo                   BIT(1) NOT NULL DEFAULT TRUE,
    criado_em               DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    atualizado_em           DATETIME(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),

    template_whatsapp               VARCHAR(120) NOT NULL DEFAULT 'alerta_estoque_peca',

    idioma_template                 VARCHAR(20) NOT NULL DEFAULT 'pt_BR',

    reenviar_alerta_apos_horas      INT NOT NULL DEFAULT 24,

    PRIMARY KEY (id),
    INDEX idx_config_alerta_estoque_ativo (ativo)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;

-- =============================================================================
-- 12. ALERTAS DE ESTOQUE
-- =============================================================================

CREATE TABLE IF NOT EXISTS alerta_estoque_peca (
    id                      BIGINT NOT NULL AUTO_INCREMENT,
    id_estoque_peca         BIGINT UNSIGNED NOT NULL,
    id_peca                 BIGINT UNSIGNED NOT NULL,

    nivel_alerta            VARCHAR(30) NOT NULL,
    status_alerta           VARCHAR(30) NOT NULL DEFAULT 'ABERTO',

    quantidade_atual        DECIMAL(12,3) NOT NULL DEFAULT 0.000,
    estoque_minimo          DECIMAL(12,3) NOT NULL DEFAULT 0.000,
    estoque_critico         DECIMAL(12,3) NOT NULL DEFAULT 0.000,

    mensagem                VARCHAR(1000) NULL,

    whatsapp_enviado        BIT(1) NOT NULL DEFAULT FALSE,
    whatsapp_enviado_em     DATETIME(6) NULL,
    whatsapp_destinatario   VARCHAR(30) NULL,
    whatsapp_message_id     VARCHAR(255) NULL,
    tentativas_envio        INT NOT NULL DEFAULT 0,
    ultimo_erro             VARCHAR(1000) NULL,

    criado_em               DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    atualizado_em           DATETIME(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),

    PRIMARY KEY (id),
    CONSTRAINT fk_alerta_estoque
        FOREIGN KEY (id_estoque_peca) REFERENCES estoque_peca(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    CONSTRAINT fk_alerta_estoque_peca
        FOREIGN KEY (id_peca) REFERENCES peca(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    INDEX idx_alerta_estoque_status (status_alerta),
    INDEX idx_alerta_estoque_nivel (nivel_alerta),
    INDEX idx_alerta_estoque_criado (criado_em),
    INDEX idx_alerta_estoque_estoque_status (id_estoque_peca, status_alerta)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;

-- =============================================================================
-- 13. AGENDAMENTOS
-- =============================================================================

CREATE TABLE IF NOT EXISTS agendamento (
    id                          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    codigo_agendamento          VARCHAR(40) NOT NULL,

    id_cliente                  BIGINT UNSIGNED NOT NULL,
    id_veiculo                  BIGINT UNSIGNED NOT NULL,
    id_servico                  BIGINT UNSIGNED NOT NULL,
    id_fornecedor               BIGINT UNSIGNED NULL,
    id_responsavel              BIGINT UNSIGNED NULL,

    status_agendamento          VARCHAR(30) NOT NULL DEFAULT 'AGENDADO',
    canal_origem                VARCHAR(30) NOT NULL DEFAULT 'SISTEMA',
    prioridade                  VARCHAR(20) NOT NULL DEFAULT 'NORMAL',
    tipo_atendimento            VARCHAR(40) NOT NULL DEFAULT 'PRESENCIAL',

    data_hora_inicio            DATETIME(6) NOT NULL,
    data_hora_fim               DATETIME(6) NOT NULL,
    duracao_estimada_minutos    INT NOT NULL,

    quilometragem_atual         INT NULL,
    queixa_cliente              VARCHAR(1000) NULL,
    diagnostico_previo          VARCHAR(1000) NULL,
    observacoes                 VARCHAR(1000) NULL,

    valor_estimado              DECIMAL(10,2) NULL,
    valor_final                 DECIMAL(10,2) NULL,

    requer_confirmacao          BIT(1) NOT NULL DEFAULT TRUE,
    confirmado                  BIT(1) NOT NULL DEFAULT FALSE,
    confirmado_em               DATETIME(6) NULL,

    lembrete_enviado            BIT(1) NOT NULL DEFAULT FALSE,
    lembrete_enviado_em         DATETIME(6) NULL,

    motivo_cancelamento         VARCHAR(500) NULL,
    cancelado_em                DATETIME(6) NULL,

    criado_em                   DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    atualizado_em               DATETIME(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),

    PRIMARY KEY (id),
    CONSTRAINT uk_agendamento_codigo UNIQUE (codigo_agendamento),
    CONSTRAINT fk_agendamento_cliente
        FOREIGN KEY (id_cliente) REFERENCES usuario(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT fk_agendamento_veiculo
        FOREIGN KEY (id_veiculo) REFERENCES veiculo(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT fk_agendamento_servico
        FOREIGN KEY (id_servico) REFERENCES servico(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT fk_agendamento_fornecedor
        FOREIGN KEY (id_fornecedor) REFERENCES fornecedor(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,
    CONSTRAINT fk_agendamento_responsavel
        FOREIGN KEY (id_responsavel) REFERENCES usuario(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,

    INDEX idx_agendamento_cliente (id_cliente),
    INDEX idx_agendamento_veiculo (id_veiculo),
    INDEX idx_agendamento_servico (id_servico),
    INDEX idx_agendamento_responsavel (id_responsavel),
    INDEX idx_agendamento_fornecedor (id_fornecedor),
    INDEX idx_agendamento_status (status_agendamento),
    INDEX idx_agendamento_inicio (data_hora_inicio),
    INDEX idx_agendamento_status_inicio (status_agendamento, data_hora_inicio)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;

-- =============================================================================
-- 14. PEÇAS PREVISTAS NO AGENDAMENTO
-- =============================================================================

CREATE TABLE IF NOT EXISTS agendamento_peca_prevista (
    id                  BIGINT NOT NULL AUTO_INCREMENT,
    id_agendamento      BIGINT UNSIGNED NOT NULL,
    id_peca             BIGINT UNSIGNED NOT NULL,
    id_estoque_peca     BIGINT UNSIGNED NULL,
    id_fornecedor       BIGINT UNSIGNED NULL,

    quantidade          DECIMAL(10,2) NOT NULL DEFAULT 1.000,
    valor_unitario      DECIMAL(10,2) NOT NULL DEFAULT 0,
    valor_total         DECIMAL(10,2) NOT NULL DEFAULT 0,
    unidade_medida      VARCHAR(50) NULL,
    observacoes         VARCHAR(500) NULL,

    criado_em           DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    atualizado_em       DATETIME(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),

    status_reserva                  VARCHAR(30) NOT NULL DEFAULT 'PREVISTA',

    reservado                       BIT(1) NOT NULL DEFAULT FALSE,

    reservado_em                    DATETIME(6) NULL,

    liberado_em                     DATETIME(6) NULL,

    PRIMARY KEY (id),
    CONSTRAINT fk_agendamento_peca_agendamento
        FOREIGN KEY (id_agendamento) REFERENCES agendamento(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    CONSTRAINT fk_agendamento_peca_peca
        FOREIGN KEY (id_peca) REFERENCES peca(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT fk_agendamento_peca_estoque
        FOREIGN KEY (id_estoque_peca) REFERENCES estoque_peca(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,
    CONSTRAINT fk_agendamento_peca_fornecedor
        FOREIGN KEY (id_fornecedor) REFERENCES fornecedor(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,

    INDEX idx_agendamento_peca_agendamento (id_agendamento),
    INDEX idx_agendamento_peca_peca (id_peca),
    INDEX idx_agendamento_peca_estoque (id_estoque_peca)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;

-- =============================================================================
-- 15. ATENDIMENTO / ORDEM DE SERVIÇO
-- =============================================================================

CREATE TABLE IF NOT EXISTS atendimento (
    id                      BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    codigo_atendimento      VARCHAR(40) NOT NULL,

    id_agendamento          BIGINT UNSIGNED NOT NULL,
    id_cliente              BIGINT UNSIGNED NOT NULL,
    id_veiculo              BIGINT UNSIGNED NOT NULL,
    id_servico              BIGINT UNSIGNED NOT NULL,
    id_fornecedor           BIGINT UNSIGNED NULL,
    id_responsavel          BIGINT UNSIGNED NULL,

    tipo_execucao           VARCHAR(30) NOT NULL DEFAULT 'INTERNO',
    status_atendimento      VARCHAR(40) NOT NULL DEFAULT 'ABERTO',

    data_entrada            DATETIME(6) NULL,
    inicio_real             DATETIME(6) NULL,
    fim_real                DATETIME(6) NULL,
    prazo_estimado_entrega  DATETIME(6) NULL,
    data_entrega            DATETIME(6) NULL,

    quilometragem_entrada   INT NULL,
    quilometragem_saida     INT NULL,

    relato_cliente          VARCHAR(1000) NULL,
    diagnostico_tecnico     VARCHAR(2000) NULL,
    servico_executado       VARCHAR(2000) NULL,
    observacoes_internas    VARCHAR(1000) NULL,
    recomendacoes_cliente   VARCHAR(1000) NULL,

    necessita_retorno       BIT(1) NOT NULL DEFAULT FALSE,
    data_retorno_sugerida   DATETIME(6) NULL,
    garantia_dias           INT NOT NULL DEFAULT 0,

    valor_mao_obra          DECIMAL(10,2) NOT NULL DEFAULT 0,
    valor_pecas             DECIMAL(10,2) NOT NULL DEFAULT 0,
    valor_terceiros         DECIMAL(10,2) NOT NULL DEFAULT 0,
    desconto                DECIMAL(10,2) NOT NULL DEFAULT 0,
    valor_total             DECIMAL(10,2) NOT NULL DEFAULT 0,

    aprovado                BIT(1) NOT NULL DEFAULT FALSE,
    aprovado_em             DATETIME(6) NULL,
    finalizado_em           DATETIME(6) NULL,
    cancelado_em            DATETIME(6) NULL,
    motivo_cancelamento     VARCHAR(500) NULL,

    estoque_baixado         BIT(1) NOT NULL DEFAULT FALSE,
    estoque_baixado_em      DATETIME(6) NULL,

    os_pdf_gerada_em        DATETIME(6) NULL,
    os_enviada_email        BIT(1) NOT NULL DEFAULT FALSE,
    os_enviada_email_em     DATETIME(6) NULL,
    os_email_destino        VARCHAR(255) NULL,
    os_ultimo_erro          VARCHAR(1000) NULL,

    criado_em               DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    atualizado_em           DATETIME(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),

    PRIMARY KEY (id),
    CONSTRAINT uk_atendimento_codigo UNIQUE (codigo_atendimento),
    CONSTRAINT uk_atendimento_agendamento UNIQUE (id_agendamento),

    CONSTRAINT fk_atendimento_agendamento
        FOREIGN KEY (id_agendamento) REFERENCES agendamento(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT fk_atendimento_cliente
        FOREIGN KEY (id_cliente) REFERENCES usuario(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT fk_atendimento_veiculo
        FOREIGN KEY (id_veiculo) REFERENCES veiculo(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT fk_atendimento_servico
        FOREIGN KEY (id_servico) REFERENCES servico(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT fk_atendimento_fornecedor
        FOREIGN KEY (id_fornecedor) REFERENCES fornecedor(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,
    CONSTRAINT fk_atendimento_responsavel
        FOREIGN KEY (id_responsavel) REFERENCES usuario(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,

    INDEX idx_atendimento_cliente (id_cliente),
    INDEX idx_atendimento_veiculo (id_veiculo),
    INDEX idx_atendimento_servico (id_servico),
    INDEX idx_atendimento_fornecedor (id_fornecedor),
    INDEX idx_atendimento_responsavel (id_responsavel),
    INDEX idx_atendimento_status (status_atendimento),
    INDEX idx_atendimento_criado (criado_em)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;

-- =============================================================================
-- 16. PEÇAS UTILIZADAS NO ATENDIMENTO
-- =============================================================================

CREATE TABLE IF NOT EXISTS atendimento_peca_utilizada (
    id                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    id_atendimento      BIGINT UNSIGNED NOT NULL,
    id_peca             BIGINT UNSIGNED NOT NULL,
    id_estoque_peca     BIGINT UNSIGNED NULL,
    id_fornecedor       BIGINT UNSIGNED NULL,

    quantidade          DECIMAL(10,2) NOT NULL DEFAULT 1,
    unidade_medida      VARCHAR(50) NULL,
    valor_unitario      DECIMAL(10,2) NOT NULL DEFAULT 0,
    valor_total         DECIMAL(10,2) NOT NULL DEFAULT 0,
    observacoes         VARCHAR(500) NULL,

    criado_em           DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    atualizado_em       DATETIME(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),

    PRIMARY KEY (id),
    CONSTRAINT fk_atendimento_peca_atendimento
        FOREIGN KEY (id_atendimento) REFERENCES atendimento(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    CONSTRAINT fk_atendimento_peca_peca
        FOREIGN KEY (id_peca) REFERENCES peca(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT fk_atendimento_peca_estoque
        FOREIGN KEY (id_estoque_peca) REFERENCES estoque_peca(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,
    CONSTRAINT fk_atendimento_peca_fornecedor
        FOREIGN KEY (id_fornecedor) REFERENCES fornecedor(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,

    INDEX idx_atendimento_peca_atendimento (id_atendimento),
    INDEX idx_atendimento_peca_peca (id_peca),
    INDEX idx_atendimento_peca_estoque (id_estoque_peca)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;

-- =============================================================================
-- 17. SERVIÇOS EXECUTADOS NO ATENDIMENTO
-- =============================================================================

CREATE TABLE IF NOT EXISTS atendimento_servico_executado (
    id                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    id_atendimento      BIGINT UNSIGNED NOT NULL,
    id_servico          BIGINT UNSIGNED NOT NULL,
    id_responsavel      BIGINT UNSIGNED NULL,
    id_fornecedor       BIGINT UNSIGNED NULL,

    tipo_execucao       VARCHAR(30) NOT NULL DEFAULT 'INTERNO',
    quantidade          DECIMAL(10,2) NOT NULL DEFAULT 1,
    unidade_cobranca    VARCHAR(50) NULL,

    tempo_execucao      DECIMAL(10,2) NULL,
    unidade_tempo       VARCHAR(30) NULL,

    valor_mao_obra      DECIMAL(10,2) NOT NULL DEFAULT 0,
    valor_terceiro      DECIMAL(10,2) NOT NULL DEFAULT 0,
    desconto            DECIMAL(10,2) NOT NULL DEFAULT 0,
    valor_total         DECIMAL(10,2) NOT NULL DEFAULT 0,

    status_item         VARCHAR(30) NOT NULL DEFAULT 'EXECUTADO',
    observacoes         VARCHAR(500) NULL,

    criado_em           DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    atualizado_em       DATETIME(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),

    PRIMARY KEY (id),
    CONSTRAINT fk_atendimento_servico_atendimento
        FOREIGN KEY (id_atendimento) REFERENCES atendimento(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    CONSTRAINT fk_atendimento_servico_servico
        FOREIGN KEY (id_servico) REFERENCES servico(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT fk_atendimento_servico_responsavel
        FOREIGN KEY (id_responsavel) REFERENCES usuario(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,
    CONSTRAINT fk_atendimento_servico_fornecedor
        FOREIGN KEY (id_fornecedor) REFERENCES fornecedor(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,

    INDEX idx_atendimento_servico_atendimento (id_atendimento),
    INDEX idx_atendimento_servico_servico (id_servico),
    INDEX idx_atendimento_servico_status (status_item)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;

-- =============================================================================
-- 18. REGRAS DE MANUTENÇÃO PREVENTIVA
-- Módulo de manutenção preventiva adicionado ao TCC.
-- `origem_oleo` permite diferenciar, entre outros, MINERAL e SINTETICO.
-- =============================================================================

CREATE TABLE IF NOT EXISTS regra_manutencao_preventiva (
    -- Colunas legadas preservadas: intervalo_quilometragem, intervalo_meses, tolerancia_km, tolerancia_dias.
    id                      BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    grupo_manutencao        VARCHAR(80) NOT NULL,
    descricao               VARCHAR(200) NOT NULL,

    id_servico              BIGINT UNSIGNED NULL,
    id_peca                 BIGINT UNSIGNED NULL,

    origem_oleo             VARCHAR(30) NULL,

    intervalo_quilometragem BIGINT NULL,
    intervalo_meses         INT NULL,

    tolerancia_km           BIGINT NULL,
    tolerancia_dias         INT NULL,

    ativo                   BIT(1) NOT NULL DEFAULT TRUE,
    observacoes             VARCHAR(500) NULL,

    criado_em               DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    atualizado_em           DATETIME(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),

    intervalo_km                    INT NULL,

    intervalo_dias                  INT NULL,

    prioridade                      INT NOT NULL DEFAULT 100,

    PRIMARY KEY (id),
    CONSTRAINT fk_regra_manutencao_servico
        FOREIGN KEY (id_servico) REFERENCES servico(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,
    CONSTRAINT fk_regra_manutencao_peca
        FOREIGN KEY (id_peca) REFERENCES peca(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,

    INDEX idx_regra_manutencao_grupo (grupo_manutencao),
    INDEX idx_regra_manutencao_servico (id_servico),
    INDEX idx_regra_manutencao_peca (id_peca),
    INDEX idx_regra_manutencao_ativo (ativo),
    INDEX idx_regra_manutencao_origem_oleo (origem_oleo)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;

-- =============================================================================
-- 19. HISTÓRICO DE QUILOMETRAGEM DO VEÍCULO
-- Base para cálculo de média de uso em km/dia.
-- =============================================================================

CREATE TABLE IF NOT EXISTS historico_quilometragem_veiculo (
    id                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    id_veiculo          BIGINT UNSIGNED NOT NULL,
    id_atendimento      BIGINT UNSIGNED NULL,

    quilometragem       INT NOT NULL,
    data_registro       DATE NOT NULL,
    origem              VARCHAR(50) NOT NULL DEFAULT 'ATENDIMENTO',

    valido_para_calculo BIT(1) NOT NULL DEFAULT TRUE,
    observacoes         VARCHAR(500) NULL,

    criado_em           DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),

    PRIMARY KEY (id),
    CONSTRAINT fk_hist_quilometragem_veiculo
        FOREIGN KEY (id_veiculo) REFERENCES veiculo(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    CONSTRAINT fk_hist_quilometragem_atendimento
        FOREIGN KEY (id_atendimento) REFERENCES atendimento(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,

    INDEX idx_hist_quilometragem_veiculo_data
        (id_veiculo, data_registro),
    INDEX idx_hist_quilometragem_validade
        (id_veiculo, valido_para_calculo, data_registro),
    INDEX idx_hist_quilometragem_atendimento
        (id_atendimento)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;

-- =============================================================================
-- 20. PREVISÕES DE MANUTENÇÃO DO VEÍCULO
-- Geradas a partir da regra + histórico/média de uso e atendimento concluído.
-- =============================================================================

CREATE TABLE IF NOT EXISTS previsao_manutencao_veiculo (
    -- Colunas legadas preservadas: id_atendimento, quilometragem_base, data_base, proxima_quilometragem, proxima_data, criterio_previsao, confianca.
    id                          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,

    id_veiculo                  BIGINT UNSIGNED NOT NULL,
    id_regra_manutencao         BIGINT UNSIGNED NOT NULL,
    id_atendimento              BIGINT UNSIGNED NULL,
    id_servico                  BIGINT UNSIGNED NULL,
    id_peca                     BIGINT UNSIGNED NULL,

    grupo_manutencao            VARCHAR(80) NOT NULL,
    descricao                   VARCHAR(200) NOT NULL,
    origem_oleo                 VARCHAR(30) NULL,

    quilometragem_base          BIGINT NULL,
    data_base                   DATE NULL,

    proxima_quilometragem       BIGINT NULL,
    proxima_data                DATE NULL,

    media_km_dia                DECIMAL(10,2) NULL,
    criterio_previsao           VARCHAR(80) NULL,
    confianca                   VARCHAR(30) NULL,

    status_previsao             VARCHAR(30) NOT NULL DEFAULT 'PENDENTE',
    observacoes                 VARCHAR(1000) NULL,

    criado_em                   DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    atualizado_em               DATETIME(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),

    id_cliente                      BIGINT UNSIGNED NOT NULL,

    id_atendimento_origem           BIGINT UNSIGNED NULL,

    km_referencia                   INT NOT NULL,

    km_limite                       INT NULL,

    data_referencia                 DATE NOT NULL,

    data_limite_tempo               DATE NULL,

    data_estimada_km                DATE NULL,

    data_recomendada                DATE NOT NULL,

    criterio_utilizado              VARCHAR(50) NOT NULL,

    quantidade_registros_calculo    INT NOT NULL DEFAULT 0,

    nivel_confianca                 VARCHAR(30) NOT NULL,

    PRIMARY KEY (id),

    CONSTRAINT fk_previsao_manutencao_veiculo
        FOREIGN KEY (id_veiculo) REFERENCES veiculo(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    CONSTRAINT fk_previsao_manutencao_regra
        FOREIGN KEY (id_regra_manutencao) REFERENCES regra_manutencao_preventiva(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT fk_previsao_manutencao_atendimento
        FOREIGN KEY (id_atendimento) REFERENCES atendimento(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,
    CONSTRAINT fk_previsao_manutencao_servico
        FOREIGN KEY (id_servico) REFERENCES servico(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,
    CONSTRAINT fk_previsao_manutencao_peca
        FOREIGN KEY (id_peca) REFERENCES peca(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,

    INDEX idx_previsao_manutencao_veiculo (id_veiculo),
    INDEX idx_previsao_manutencao_regra (id_regra_manutencao),
    INDEX idx_previsao_manutencao_status (status_previsao),
    INDEX idx_previsao_manutencao_data (proxima_data),
    INDEX idx_previsao_manutencao_km (proxima_quilometragem),
    CONSTRAINT fk_previsao_veiculo_id_cliente FOREIGN KEY (id_cliente) REFERENCES usuario(id) ON DELETE RESTRICT,
    CONSTRAINT fk_previsao_veiculo_id_atendimento_origem FOREIGN KEY (id_atendimento_origem) REFERENCES atendimento(id) ON DELETE SET NULL,
    INDEX idx_previsao_veiculo_status (id_veiculo, status_previsao),
    INDEX idx_previsao_cliente (id_cliente),
    INDEX idx_previsao_grupo (grupo_manutencao),
    INDEX idx_previsao_data_recomendada (data_recomendada)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;

-- =============================================================================
-- FIM DA CRIAÇÃO
-- =============================================================================


-- Verificação rápida opcional:
-- SHOW TABLES;
--
-- Em um container MySQL oficial, monte este arquivo em:
-- /docker-entrypoint-initdb.d/01-init.sql
--
-- Exemplo no docker-compose.yml:
--
-- services:
--   db:
--     image: mysql:8.0
--     environment:
--       MYSQL_DATABASE: clinicar
--       MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD}
--       MYSQL_USER: ${MYSQL_USER}
--       MYSQL_PASSWORD: ${MYSQL_PASSWORD}
--     volumes:
--       - mysql_data:/var/lib/mysql
--       - ./bd/init.sql:/docker-entrypoint-initdb.d/01-init.sql:ro
--
-- Importante:
-- scripts de /docker-entrypoint-initdb.d são executados somente quando
-- /var/lib/mysql é inicializado pela primeira vez.
-- =============================================================================
