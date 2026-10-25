CREATE TABLE atendimento_pausa (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    atendimento_id BIGINT UNSIGNED NOT NULL,
    autor_id BIGINT UNSIGNED NOT NULL,
    motivo VARCHAR(500) NOT NULL,
    pausado_em DATETIME NOT NULL,
    retomado_em DATETIME NULL,
    retomado_por_id BIGINT UNSIGNED NULL,
    CONSTRAINT fk_pausa_atendimento FOREIGN KEY (atendimento_id) REFERENCES atendimento(id) ON DELETE RESTRICT,
    CONSTRAINT fk_pausa_autor FOREIGN KEY (autor_id) REFERENCES usuario(id) ON DELETE RESTRICT,
    CONSTRAINT fk_pausa_retomada FOREIGN KEY (retomado_por_id) REFERENCES usuario(id) ON DELETE RESTRICT,
    INDEX idx_pausa_atendimento (atendimento_id, pausado_em)
);
