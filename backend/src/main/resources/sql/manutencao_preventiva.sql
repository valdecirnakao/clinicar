-- Script auxiliar para a evolução do módulo de manutenção preventiva.
-- Se spring.jpa.hibernate.ddl-auto=update estiver ativo, o Hibernate pode criar/alterar
-- as tabelas automaticamente. Este script serve para conferência ou execução manual.

ALTER TABLE peca
    ADD COLUMN IF NOT EXISTS descricao VARCHAR(500) NULL,
    ADD COLUMN IF NOT EXISTS origem_oleo VARCHAR(30) NULL,
    ADD COLUMN IF NOT EXISTS observacoes VARCHAR(500) NULL,
    ADD COLUMN IF NOT EXISTS criado_em DATETIME NULL,
    ADD COLUMN IF NOT EXISTS atualizado_em DATETIME NULL;

CREATE TABLE IF NOT EXISTS regra_manutencao_preventiva (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    grupo_manutencao VARCHAR(80) NOT NULL,
    descricao VARCHAR(200) NOT NULL,
    id_servico BIGINT UNSIGNED NULL,
    id_peca BIGINT UNSIGNED NULL,
    origem_oleo VARCHAR(30) NULL,
    intervalo_km INT NULL,
    intervalo_dias INT NULL,
    prioridade INT NOT NULL DEFAULT 100,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    observacoes VARCHAR(500) NULL,
    criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em DATETIME NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT fk_regra_manutencao_servico FOREIGN KEY (id_servico) REFERENCES servico(id),
    CONSTRAINT fk_regra_manutencao_peca FOREIGN KEY (id_peca) REFERENCES peca(id)
);

CREATE INDEX idx_regra_manutencao_grupo ON regra_manutencao_preventiva (grupo_manutencao);
CREATE INDEX idx_regra_manutencao_origem_oleo ON regra_manutencao_preventiva (origem_oleo);
CREATE INDEX idx_regra_manutencao_ativo ON regra_manutencao_preventiva (ativo);

CREATE TABLE IF NOT EXISTS historico_quilometragem_veiculo (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    id_veiculo BIGINT UNSIGNED NOT NULL,
    id_atendimento BIGINT UNSIGNED NULL,
    data_registro DATE NOT NULL,
    quilometragem INT NOT NULL,
    origem VARCHAR(50) NOT NULL DEFAULT 'ATENDIMENTO',
    valido_para_calculo BOOLEAN NOT NULL DEFAULT TRUE,
    observacoes VARCHAR(500) NULL,
    criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT fk_historico_km_veiculo FOREIGN KEY (id_veiculo) REFERENCES veiculo(id),
    CONSTRAINT fk_historico_km_atendimento FOREIGN KEY (id_atendimento) REFERENCES atendimento(id)
);

CREATE INDEX idx_historico_km_veiculo_data ON historico_quilometragem_veiculo (id_veiculo, data_registro);
CREATE INDEX idx_historico_km_atendimento ON historico_quilometragem_veiculo (id_atendimento);

CREATE TABLE IF NOT EXISTS previsao_manutencao_veiculo (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    id_veiculo BIGINT UNSIGNED NOT NULL,
    id_cliente BIGINT UNSIGNED NOT NULL,
    id_atendimento_origem BIGINT UNSIGNED NULL,
    id_regra_manutencao BIGINT UNSIGNED NOT NULL,
    id_servico BIGINT UNSIGNED NULL,
    id_peca BIGINT UNSIGNED NULL,
    grupo_manutencao VARCHAR(80) NOT NULL,
    descricao VARCHAR(200) NOT NULL,
    origem_oleo VARCHAR(30) NULL,
    km_referencia INT NOT NULL,
    km_limite INT NULL,
    data_referencia DATE NOT NULL,
    data_limite_tempo DATE NULL,
    data_estimada_km DATE NULL,
    data_recomendada DATE NOT NULL,
    criterio_utilizado VARCHAR(50) NOT NULL,
    media_km_dia DECIMAL(10,2) NULL,
    quantidade_registros_calculo INT NOT NULL DEFAULT 0,
    nivel_confianca VARCHAR(30) NOT NULL,
    status_previsao VARCHAR(30) NOT NULL DEFAULT 'PENDENTE',
    observacoes VARCHAR(1000) NULL,
    criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em DATETIME NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT fk_previsao_veiculo FOREIGN KEY (id_veiculo) REFERENCES veiculo(id),
    CONSTRAINT fk_previsao_cliente FOREIGN KEY (id_cliente) REFERENCES usuario(id),
    CONSTRAINT fk_previsao_atendimento FOREIGN KEY (id_atendimento_origem) REFERENCES atendimento(id),
    CONSTRAINT fk_previsao_regra FOREIGN KEY (id_regra_manutencao) REFERENCES regra_manutencao_preventiva(id),
    CONSTRAINT fk_previsao_servico FOREIGN KEY (id_servico) REFERENCES servico(id),
    CONSTRAINT fk_previsao_peca FOREIGN KEY (id_peca) REFERENCES peca(id)
);

CREATE INDEX idx_previsao_veiculo_status ON previsao_manutencao_veiculo (id_veiculo, status_previsao);
CREATE INDEX idx_previsao_cliente ON previsao_manutencao_veiculo (id_cliente);
CREATE INDEX idx_previsao_grupo ON previsao_manutencao_veiculo (grupo_manutencao);
CREATE INDEX idx_previsao_data_recomendada ON previsao_manutencao_veiculo (data_recomendada);

INSERT INTO regra_manutencao_preventiva
(grupo_manutencao, descricao, origem_oleo, intervalo_km, intervalo_dias, prioridade, ativo, observacoes)
VALUES
('TROCA_OLEO', 'Troca de óleo mineral', 'MINERAL', 5000, 180, 10, TRUE, 'Regra inicial configurável para óleo mineral.'),
('TROCA_OLEO', 'Troca de óleo sintético', 'SINTETICO', 10000, 365, 10, TRUE, 'Regra inicial configurável para óleo sintético.');
