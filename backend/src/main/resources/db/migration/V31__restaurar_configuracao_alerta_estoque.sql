-- O banco preparado para testes pode ter perdido o registro singleton após a limpeza de dados.
-- Preserva integralmente qualquer configuração já existente.
INSERT IGNORE INTO configuracao_alerta_estoque
    (id, ativo, telefone_administrador, template_whatsapp, idioma_template,
     reenviar_alerta_apos_horas, criado_em, versao)
VALUES
    (1, FALSE, '', 'alerta_estoque_peca', 'pt_BR', 24, NOW(), 0);
