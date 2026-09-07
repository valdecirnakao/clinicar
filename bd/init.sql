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
-- 5. O nome do banco abaixo deve coincidir com MYSQL_DATABASE e com a URL JDBC.
-- =============================================================================

SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

CREATE DATABASE IF NOT EXISTS clinicar
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_0900_ai_ci;

USE clinicar;

-- =============================================================================
-- 1. USUÁRIOS E AUTENTICAÇÃO
-- =============================================================================

CREATE TABLE IF NOT EXISTS usuario (
    id                  BIGINT NOT NULL AUTO_INCREMENT,
    nome                VARCHAR(150) NOT NULL,
    nome_social         VARCHAR(150) NULL,
    email               VARCHAR(180) NOT NULL,
    senha               VARCHAR(255) NOT NULL,
    cpf                 VARCHAR(20) NOT NULL,
    nascimento          DATE NULL,
    telefone            VARCHAR(30) NULL,

    cep                 VARCHAR(12) NULL,
    logradouro          VARCHAR(180) NULL,
    numero_endereco     VARCHAR(30) NULL,
    complemento_endereco VARCHAR(150) NULL,
    bairro              VARCHAR(120) NULL,
    cidade              VARCHAR(120) NULL,
    estado              VARCHAR(2) NULL,

    tipo_do_acesso      VARCHAR(40) NOT NULL,
    status              VARCHAR(30) NOT NULL DEFAULT 'ATIVO',

    mfa_ativo           BOOLEAN NOT NULL DEFAULT FALSE,
    mfa_secret          VARCHAR(255) NULL,
    mfa_tipo            VARCHAR(40) NULL,

    PRIMARY KEY (id),
    CONSTRAINT uk_usuario_email UNIQUE (email),
    CONSTRAINT uk_usuario_cpf UNIQUE (cpf),
    INDEX idx_usuario_nome (nome),
    INDEX idx_usuario_tipo_acesso (tipo_do_acesso),
    INDEX idx_usuario_status (status)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS auth_session (
    id              BIGINT NOT NULL AUTO_INCREMENT,
    usuario_id      BIGINT NOT NULL,
    token_hash      VARCHAR(255) NOT NULL,
    criado_em       DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    expira_em       DATETIME(6) NOT NULL,
    ultimo_uso_em   DATETIME(6) NULL,
    revogado        BOOLEAN NOT NULL DEFAULT FALSE,

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

-- =============================================================================
-- 2. FORNECEDORES
-- =============================================================================

CREATE TABLE IF NOT EXISTS fornecedor (
    id                   BIGINT NOT NULL AUTO_INCREMENT,
    cnpj                 VARCHAR(25) NOT NULL,
    razao_social         VARCHAR(180) NOT NULL,
    nome_fantasia        VARCHAR(180) NULL,
    item_fornecido       VARCHAR(255) NULL,
    telefone             VARCHAR(30) NULL,
    email                VARCHAR(180) NULL,
    fundacao             DATE NULL,

    cep                  VARCHAR(12) NULL,
    logradouro           VARCHAR(180) NULL,
    numero_endereco      VARCHAR(30) NULL,
    complemento_endereco VARCHAR(150) NULL,
    bairro               VARCHAR(120) NULL,
    cidade               VARCHAR(120) NULL,
    estado               VARCHAR(2) NULL,

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
    id                      BIGINT NOT NULL AUTO_INCREMENT,
    placa                   VARCHAR(12) NOT NULL,
    fabricante              VARCHAR(120) NOT NULL,
    modelo                  VARCHAR(180) NOT NULL,
    cor                     VARCHAR(80) NULL,
    ano_modelo_combustivel  VARCHAR(120) NOT NULL,
    id_proprietario         BIGINT NULL,

    PRIMARY KEY (id),
    CONSTRAINT uk_veiculo_placa UNIQUE (placa),
    CONSTRAINT fk_veiculo_proprietario
        FOREIGN KEY (id_proprietario) REFERENCES usuario(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,
    INDEX idx_veiculo_proprietario (id_proprietario),
    INDEX idx_veiculo_fabricante_modelo (fabricante, modelo)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;

-- =============================================================================
-- 4. CATÁLOGO DE PEÇAS
-- =============================================================================

CREATE TABLE IF NOT EXISTS peca (
    id              BIGINT NOT NULL AUTO_INCREMENT,
    nome            VARCHAR(180) NOT NULL,
    tipo            VARCHAR(120) NULL,
    especificacao   TEXT NULL,
    fabricante      VARCHAR(150) NOT NULL,
    modelo          VARCHAR(150) NULL,
    norma           VARCHAR(120) NULL,
    unidade         VARCHAR(50) NOT NULL,

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
    id                  BIGINT NOT NULL AUTO_INCREMENT,
    nome                VARCHAR(180) NOT NULL,
    descricao           TEXT NULL,
    categoria           VARCHAR(100) NOT NULL,

    tipo_do_prestador   VARCHAR(50) NOT NULL,
    id_fornecedor       BIGINT NULL,

    duracao_estimada    DECIMAL(10,2) NULL,
    unidade_duracao     VARCHAR(40) NULL,

    valor_base          DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    unidade_cobranca    VARCHAR(50) NULL,

    garantia_dias       INT NULL,
    necessita_pecas     BOOLEAN NOT NULL DEFAULT FALSE,
    observacoes         TEXT NULL,
    ativo               BOOLEAN NOT NULL DEFAULT TRUE,

    criado_em           DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    atualizado_em       DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
                        ON UPDATE CURRENT_TIMESTAMP(6),

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

CREATE TABLE IF NOT EXISTS fornecimento_peca (
    id                    BIGINT NOT NULL AUTO_INCREMENT,
    id_fornecedor         BIGINT NOT NULL,
    id_peca               BIGINT NOT NULL,

    valor_custo           DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    prazo_entrega_dias    INT NULL,
    quantidade_minima     DECIMAL(15,3) NULL,
    ativo                 BOOLEAN NOT NULL DEFAULT TRUE,

    data_cadastro         DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
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

CREATE TABLE IF NOT EXISTS fornecimento_servico (
    id                    BIGINT NOT NULL AUTO_INCREMENT,
    id_fornecedor         BIGINT NOT NULL,
    id_servico            BIGINT NOT NULL,

    valor_custo           DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    unidade_cobranca      VARCHAR(50) NULL,

    prazo_execucao        DECIMAL(10,2) NULL,
    unidade_prazo         VARCHAR(50) NULL,
    quantidade_minima     DECIMAL(15,3) NULL,

    disponibilidade       VARCHAR(80) NULL,
    contrato_referencia   VARCHAR(180) NULL,
    data_inicio_vigencia  DATE NULL,
    data_fim_vigencia     DATE NULL,
    ativo                 BOOLEAN NOT NULL DEFAULT TRUE,
    observacoes           TEXT NULL,

    criado_em             DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    atualizado_em         DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
                          ON UPDATE CURRENT_TIMESTAMP(6),

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
    nome            VARCHAR(150) NOT NULL,
    descricao       TEXT NULL,
    ativo           BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em       DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    atualizado_em   DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
                    ON UPDATE CURRENT_TIMESTAMP(6),

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
    id                              BIGINT NOT NULL AUTO_INCREMENT,
    id_peca                         BIGINT NOT NULL,
    id_local_estoque                BIGINT NOT NULL,

    quantidade_atual                DECIMAL(15,3) NOT NULL DEFAULT 0.000,
    quantidade_reservada            DECIMAL(15,3) NOT NULL DEFAULT 0.000,

    estoque_minimo                  DECIMAL(15,3) NOT NULL DEFAULT 0.000,
    estoque_critico                 DECIMAL(15,3) NOT NULL DEFAULT 0.000,
    estoque_maximo                  DECIMAL(15,3) NULL,

    ponto_reposicao                 DECIMAL(15,3) NULL,
    quantidade_reposicao_sugerida   DECIMAL(15,3) NULL,

    custo_medio                     DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    localizacao_fisica              VARCHAR(180) NULL,
    status_estoque                  VARCHAR(40) NOT NULL DEFAULT 'NORMAL',
    ativo                           BOOLEAN NOT NULL DEFAULT TRUE,

    criado_em                       DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    atualizado_em                   DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
                                    ON UPDATE CURRENT_TIMESTAMP(6),

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
    id_estoque_peca       BIGINT NOT NULL,
    id_peca               BIGINT NOT NULL,

    tipo_movimento        VARCHAR(50) NOT NULL,
    quantidade            DECIMAL(15,3) NOT NULL,
    saldo_anterior        DECIMAL(15,3) NOT NULL,
    saldo_posterior       DECIMAL(15,3) NOT NULL,

    valor_unitario        DECIMAL(15,2) NULL,
    valor_total           DECIMAL(15,2) NULL,

    origem                VARCHAR(100) NULL,
    documento_referencia  VARCHAR(180) NULL,
    motivo                VARCHAR(255) NULL,
    observacoes           TEXT NULL,

    id_usuario            BIGINT NULL,
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
    id                      BIGINT NOT NULL AUTO_INCREMENT,
    nome_administrador      VARCHAR(150) NULL,
    telefone_administrador  VARCHAR(30) NOT NULL,
    ativo                   BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em               DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    atualizado_em           DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
                            ON UPDATE CURRENT_TIMESTAMP(6),

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
    id_estoque_peca         BIGINT NOT NULL,
    id_peca                 BIGINT NOT NULL,

    nivel_alerta            VARCHAR(40) NOT NULL,
    status_alerta           VARCHAR(40) NOT NULL DEFAULT 'ABERTO',

    quantidade_atual        DECIMAL(15,3) NOT NULL DEFAULT 0.000,
    estoque_minimo          DECIMAL(15,3) NOT NULL DEFAULT 0.000,
    estoque_critico         DECIMAL(15,3) NOT NULL DEFAULT 0.000,

    mensagem                TEXT NULL,

    whatsapp_enviado        BOOLEAN NOT NULL DEFAULT FALSE,
    whatsapp_enviado_em     DATETIME(6) NULL,
    whatsapp_destinatario   VARCHAR(30) NULL,
    whatsapp_message_id     VARCHAR(255) NULL,
    tentativas_envio        INT NOT NULL DEFAULT 0,
    ultimo_erro             TEXT NULL,

    criado_em               DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    atualizado_em           DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
                            ON UPDATE CURRENT_TIMESTAMP(6),

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
    id                          BIGINT NOT NULL AUTO_INCREMENT,
    codigo_agendamento          VARCHAR(80) NOT NULL,

    id_cliente                  BIGINT NOT NULL,
    id_veiculo                  BIGINT NOT NULL,
    id_servico                  BIGINT NOT NULL,
    id_fornecedor               BIGINT NULL,
    id_responsavel              BIGINT NULL,

    status_agendamento          VARCHAR(50) NOT NULL DEFAULT 'AGENDADO',
    canal_origem                VARCHAR(50) NULL,
    prioridade                  VARCHAR(40) NULL,
    tipo_atendimento            VARCHAR(50) NULL,

    data_hora_inicio            DATETIME(6) NOT NULL,
    data_hora_fim               DATETIME(6) NOT NULL,
    duracao_estimada_minutos    INT NULL,

    quilometragem_atual         BIGINT NULL,
    queixa_cliente              TEXT NULL,
    diagnostico_previo          TEXT NULL,
    observacoes                 TEXT NULL,

    valor_estimado              DECIMAL(15,2) NULL,
    valor_final                 DECIMAL(15,2) NULL,

    requer_confirmacao          BOOLEAN NOT NULL DEFAULT FALSE,
    confirmado                  BOOLEAN NOT NULL DEFAULT FALSE,
    confirmado_em               DATETIME(6) NULL,

    lembrete_enviado            BOOLEAN NOT NULL DEFAULT FALSE,
    lembrete_enviado_em         DATETIME(6) NULL,

    motivo_cancelamento         TEXT NULL,
    cancelado_em                DATETIME(6) NULL,

    criado_em                   DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    atualizado_em               DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
                                ON UPDATE CURRENT_TIMESTAMP(6),

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
    id_agendamento      BIGINT NOT NULL,
    id_peca             BIGINT NOT NULL,
    id_estoque_peca     BIGINT NULL,
    id_fornecedor       BIGINT NULL,

    quantidade          DECIMAL(15,3) NOT NULL DEFAULT 1.000,
    valor_unitario      DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    valor_total         DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    unidade_medida      VARCHAR(50) NULL,
    observacoes         TEXT NULL,

    criado_em           DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    atualizado_em       DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
                        ON UPDATE CURRENT_TIMESTAMP(6),

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
    id                      BIGINT NOT NULL AUTO_INCREMENT,
    codigo_atendimento      VARCHAR(80) NOT NULL,

    id_agendamento          BIGINT NULL,
    id_cliente              BIGINT NOT NULL,
    id_veiculo              BIGINT NOT NULL,
    id_servico              BIGINT NOT NULL,
    id_fornecedor           BIGINT NULL,
    id_responsavel          BIGINT NULL,

    tipo_execucao           VARCHAR(40) NOT NULL DEFAULT 'INTERNO',
    status_atendimento      VARCHAR(50) NOT NULL DEFAULT 'ABERTO',

    data_entrada            DATETIME(6) NULL,
    inicio_real             DATETIME(6) NULL,
    fim_real                DATETIME(6) NULL,
    prazo_estimado_entrega  DATETIME(6) NULL,
    data_entrega            DATETIME(6) NULL,

    quilometragem_entrada   BIGINT NULL,
    quilometragem_saida     BIGINT NULL,

    relato_cliente          TEXT NULL,
    diagnostico_tecnico     TEXT NULL,
    servico_executado       TEXT NULL,
    observacoes_internas    TEXT NULL,
    recomendacoes_cliente   TEXT NULL,

    necessita_retorno       BOOLEAN NOT NULL DEFAULT FALSE,
    data_retorno_sugerida   DATE NULL,
    garantia_dias           INT NULL,

    valor_mao_obra          DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    valor_pecas             DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    valor_terceiros         DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    desconto                DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    valor_total             DECIMAL(15,2) NOT NULL DEFAULT 0.00,

    aprovado                BOOLEAN NOT NULL DEFAULT FALSE,
    aprovado_em             DATETIME(6) NULL,
    finalizado_em           DATETIME(6) NULL,
    cancelado_em            DATETIME(6) NULL,
    motivo_cancelamento     TEXT NULL,

    estoque_baixado         BOOLEAN NOT NULL DEFAULT FALSE,
    estoque_baixado_em      DATETIME(6) NULL,

    os_pdf_gerada_em        DATETIME(6) NULL,
    os_enviada_email        BOOLEAN NOT NULL DEFAULT FALSE,
    os_enviada_email_em     DATETIME(6) NULL,
    os_email_destino        VARCHAR(180) NULL,
    os_ultimo_erro          TEXT NULL,

    criado_em               DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    atualizado_em           DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
                            ON UPDATE CURRENT_TIMESTAMP(6),

    PRIMARY KEY (id),
    CONSTRAINT uk_atendimento_codigo UNIQUE (codigo_atendimento),
    CONSTRAINT uk_atendimento_agendamento UNIQUE (id_agendamento),

    CONSTRAINT fk_atendimento_agendamento
        FOREIGN KEY (id_agendamento) REFERENCES agendamento(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,
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
    id                  BIGINT NOT NULL AUTO_INCREMENT,
    id_atendimento      BIGINT NOT NULL,
    id_peca             BIGINT NOT NULL,
    id_estoque_peca     BIGINT NULL,
    id_fornecedor       BIGINT NULL,

    quantidade          DECIMAL(15,3) NOT NULL DEFAULT 1.000,
    unidade_medida      VARCHAR(50) NULL,
    valor_unitario      DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    valor_total         DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    observacoes         TEXT NULL,

    criado_em           DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    atualizado_em       DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
                        ON UPDATE CURRENT_TIMESTAMP(6),

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
    id                  BIGINT NOT NULL AUTO_INCREMENT,
    id_atendimento      BIGINT NOT NULL,
    id_servico          BIGINT NOT NULL,
    id_responsavel      BIGINT NULL,
    id_fornecedor       BIGINT NULL,

    tipo_execucao       VARCHAR(40) NOT NULL DEFAULT 'INTERNO',
    quantidade          DECIMAL(15,3) NOT NULL DEFAULT 1.000,
    unidade_cobranca    VARCHAR(50) NULL,

    tempo_execucao      DECIMAL(10,2) NULL,
    unidade_tempo       VARCHAR(50) NULL,

    valor_mao_obra      DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    valor_terceiro      DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    desconto            DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    valor_total         DECIMAL(15,2) NOT NULL DEFAULT 0.00,

    status_item         VARCHAR(40) NOT NULL DEFAULT 'PENDENTE',
    observacoes         TEXT NULL,

    criado_em           DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    atualizado_em       DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
                        ON UPDATE CURRENT_TIMESTAMP(6),

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
    id                      BIGINT NOT NULL AUTO_INCREMENT,
    grupo_manutencao        VARCHAR(120) NOT NULL,
    descricao               VARCHAR(255) NOT NULL,

    id_servico              BIGINT NULL,
    id_peca                 BIGINT NULL,

    origem_oleo             VARCHAR(40) NULL,

    intervalo_quilometragem BIGINT NULL,
    intervalo_meses         INT NULL,

    tolerancia_km           BIGINT NULL,
    tolerancia_dias         INT NULL,

    ativo                   BOOLEAN NOT NULL DEFAULT TRUE,
    observacoes             TEXT NULL,

    criado_em               DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    atualizado_em           DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
                            ON UPDATE CURRENT_TIMESTAMP(6),

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
    INDEX idx_regra_manutencao_ativo (ativo)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;

-- =============================================================================
-- 19. HISTÓRICO DE QUILOMETRAGEM DO VEÍCULO
-- Base para cálculo de média de uso em km/dia.
-- =============================================================================

CREATE TABLE IF NOT EXISTS historico_quilometragem_veiculo (
    id                  BIGINT NOT NULL AUTO_INCREMENT,
    id_veiculo          BIGINT NOT NULL,
    id_atendimento      BIGINT NULL,

    quilometragem       BIGINT NOT NULL,
    data_registro       DATETIME(6) NOT NULL,
    origem              VARCHAR(80) NULL,

    valido_para_calculo BOOLEAN NOT NULL DEFAULT TRUE,
    observacoes         TEXT NULL,

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
    id                          BIGINT NOT NULL AUTO_INCREMENT,

    id_veiculo                  BIGINT NOT NULL,
    id_regra_manutencao         BIGINT NOT NULL,
    id_atendimento              BIGINT NULL,
    id_servico                  BIGINT NULL,
    id_peca                     BIGINT NULL,

    grupo_manutencao            VARCHAR(120) NULL,
    descricao                   VARCHAR(255) NULL,
    origem_oleo                 VARCHAR(40) NULL,

    quilometragem_base          BIGINT NULL,
    data_base                   DATE NULL,

    proxima_quilometragem       BIGINT NULL,
    proxima_data                DATE NULL,

    media_km_dia                DECIMAL(12,3) NULL,
    criterio_previsao           VARCHAR(80) NULL,
    confianca                   VARCHAR(30) NULL,

    status_previsao             VARCHAR(40) NOT NULL DEFAULT 'PENDENTE',
    observacoes                 TEXT NULL,

    criado_em                   DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    atualizado_em               DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
                                ON UPDATE CURRENT_TIMESTAMP(6),

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
    INDEX idx_previsao_manutencao_km (proxima_quilometragem)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;

-- =============================================================================
-- FIM DA CRIAÇÃO
-- =============================================================================

SET FOREIGN_KEY_CHECKS = 1;

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
