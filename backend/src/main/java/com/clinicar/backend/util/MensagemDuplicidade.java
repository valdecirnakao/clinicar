package com.clinicar.backend.util;

public final class MensagemDuplicidade {
    private MensagemDuplicidade() {}
    public static String obter(Throwable erro) {
        StringBuilder detalhe = new StringBuilder();
        for (Throwable causa = erro; causa != null; causa = causa.getCause()) detalhe.append(' ').append(causa.getMessage());
        String texto = detalhe.toString().toLowerCase(java.util.Locale.ROOT);
        if (!(texto.contains("duplicate") || texto.contains("unique") || texto.contains("unicidade"))) return null;
        if (texto.contains("uk_servico_nome_categoria")) return "Já existe um serviço cadastrado com este nome nesta categoria.";
        if (texto.contains("uk_peca_chave_catalogo")) return "Já existe uma peça com esta identificação e especificações.";
        if (texto.contains("uk_fornecedor_peca")) return "Já existe um fornecimento cadastrado para este fornecedor e peça.";
        if (texto.contains("uk_fornecedor_servico") || texto.contains("uk_fornecimento_servico")) return "Já existe um fornecimento cadastrado para este fornecedor e serviço.";
        if (texto.contains("uk_estoque_peca_local")) return "Já existe um controle de estoque para esta peça neste local.";
        if (texto.contains("uk_local_estoque_nome")) return "Já existe um local de estoque com este nome.";
        if (texto.contains("uk_regra_grupo_descricao")) return "Já existe uma regra com esta descrição neste grupo de manutenção.";
        if (texto.contains("uk_fornecedor_email")) return "E-mail já cadastrado anteriormente.";
        return null;
    }
}
