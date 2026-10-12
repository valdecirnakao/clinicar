-- Migration 002
-- Technical fields for engine oil.
-- Run once on an existing CliniCar database.

ALTER TABLE peca
    ADD COLUMN viscosidade_sae VARCHAR(30) NULL AFTER origem_oleo;

ALTER TABLE peca
    ADD COLUMN classificacao_api VARCHAR(50) NULL AFTER viscosidade_sae;

ALTER TABLE peca
    ADD COLUMN classificacao_acea VARCHAR(80) NULL AFTER classificacao_api;

ALTER TABLE peca
    ADD COLUMN norma_oem VARCHAR(200) NULL AFTER classificacao_acea;