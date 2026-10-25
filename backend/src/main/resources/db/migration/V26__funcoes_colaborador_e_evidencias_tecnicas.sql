CREATE TABLE permissao_colaborador (
    usuario_id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
    pode_mecanica BOOLEAN NOT NULL DEFAULT TRUE,
    pode_estoque BOOLEAN NOT NULL DEFAULT TRUE,
    atualizado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_permissao_colaborador_usuario FOREIGN KEY (usuario_id) REFERENCES usuario(id) ON DELETE CASCADE
);

INSERT INTO permissao_colaborador (usuario_id, pode_mecanica, pode_estoque)
SELECT id, TRUE, TRUE FROM usuario WHERE UPPER(tipo_do_acesso) = 'COLABORADOR';

CREATE TABLE atendimento_checklist (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    atendimento_id BIGINT UNSIGNED NOT NULL,
    autor_id BIGINT UNSIGNED NOT NULL,
    item VARCHAR(120) NOT NULL,
    situacao VARCHAR(20) NOT NULL,
    observacao VARCHAR(500) NULL,
    registrado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_checklist_atendimento FOREIGN KEY (atendimento_id) REFERENCES atendimento(id) ON DELETE RESTRICT,
    CONSTRAINT fk_checklist_autor FOREIGN KEY (autor_id) REFERENCES usuario(id) ON DELETE RESTRICT,
    CONSTRAINT uk_checklist_atendimento_item UNIQUE (atendimento_id, item)
);

CREATE TABLE atendimento_foto (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    atendimento_id BIGINT UNSIGNED NOT NULL,
    autor_id BIGINT UNSIGNED NOT NULL,
    nome_arquivo VARCHAR(180) NOT NULL,
    tipo_mime VARCHAR(30) NOT NULL,
    tamanho_bytes INT NOT NULL,
    conteudo MEDIUMBLOB NOT NULL,
    registrado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_foto_atendimento FOREIGN KEY (atendimento_id) REFERENCES atendimento(id) ON DELETE RESTRICT,
    CONSTRAINT fk_foto_autor FOREIGN KEY (autor_id) REFERENCES usuario(id) ON DELETE RESTRICT,
    INDEX idx_foto_atendimento (atendimento_id, registrado_em)
);
