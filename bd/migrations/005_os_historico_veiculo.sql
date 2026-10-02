-- Executar uma única vez antes de iniciar a nova versão, caso ddl-auto=update não tenha criado as colunas.
-- Não preenche dados históricos com o cadastro atual: isso inventaria o histórico.
ALTER TABLE atendimento
    ADD COLUMN veiculo_preservado_em DATETIME(6) NULL,
    ADD COLUMN veiculo_placa_historica VARCHAR(255) NULL,
    ADD COLUMN veiculo_fabricante_historico VARCHAR(255) NULL,
    ADD COLUMN veiculo_modelo_historico VARCHAR(255) NULL,
    ADD COLUMN veiculo_cor_historica VARCHAR(255) NULL,
    ADD COLUMN veiculo_ano_modelo_combustivel_historico VARCHAR(255) NULL,
    ADD COLUMN os_pdf_original LONGBLOB NULL;
