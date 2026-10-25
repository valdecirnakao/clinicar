package com.clinicar.backend.service;

import java.util.Locale;
import java.util.Set;

/** Categorias aptas para cada vínculo; inclui valores legados já gravados. */
public final class CategoriasFornecedor {
    private CategoriasFornecedor() {}

    public static final Set<String> PECAS = Set.of(
            "peças automotivas", "óleos e lubrificantes", "fluidos automotivos",
            "peças e lubrificantes", "equipamentos e ferramentas", "materiais de consumo",
            "peças e serviços", "peça ou insumo");
    public static final Set<String> SERVICOS = Set.of(
            "serviços automotivos", "peças e serviços", "serviço");

    public static boolean aceita(String itemFornecido, String tipo) {
        if (itemFornecido == null) return false;
        String categoria = itemFornecido.trim().toLowerCase(Locale.ROOT);
        return switch (tipo) {
            case "PECAS" -> PECAS.contains(categoria);
            case "SERVICOS" -> SERVICOS.contains(categoria);
            default -> false;
        };
    }
}
