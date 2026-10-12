-- Aplicar uma única vez antes de iniciar o backend atualizado.
ALTER TABLE agendamento
    ADD COLUMN veiculo_preservado_em DATETIME(6) NULL,
    ADD COLUMN veiculo_placa_historica VARCHAR(255) NULL,
    ADD COLUMN veiculo_fabricante_historico VARCHAR(255) NULL,
    ADD COLUMN veiculo_modelo_historico VARCHAR(255) NULL,
    ADD COLUMN veiculo_cor_historica VARCHAR(255) NULL,
    ADD COLUMN veiculo_ano_modelo_combustivel_historico VARCHAR(255) NULL;

-- Registros anteriores não possuem histórico recuperável. Preserva-se o cadastro
-- disponível na migração como referência inicial, com a data real da preservação.
UPDATE agendamento a
JOIN veiculo v ON v.id = a.id_veiculo
SET a.veiculo_placa_historica = v.placa,
    a.veiculo_fabricante_historico = v.fabricante,
    a.veiculo_modelo_historico = v.modelo,
    a.veiculo_cor_historica = v.cor,
    a.veiculo_ano_modelo_combustivel_historico = v.ano_modelo_combustivel,
    a.veiculo_preservado_em = CURRENT_TIMESTAMP(6)
WHERE a.veiculo_preservado_em IS NULL;
