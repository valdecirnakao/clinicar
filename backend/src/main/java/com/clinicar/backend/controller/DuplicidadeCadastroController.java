package com.clinicar.backend.controller;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;
import java.util.*;

/** Consulta restrita às chaves de cadastro; a comparação utiliza a collation do banco. */
@RestController
@RequestMapping("/api/cadastros/duplicidade")
public class DuplicidadeCadastroController {
    private final JdbcTemplate jdbc;
    public DuplicidadeCadastroController(JdbcTemplate jdbc) { this.jdbc = jdbc; }
    public record Resultado(boolean duplicado, Long id, String mensagem) {}

    @GetMapping("/{tipo}")
    public Resultado verificar(@PathVariable String tipo, @RequestParam Map<String, String> valores) {
        String tabela;
        String[][] campos;
        String mensagem;
        switch (tipo) {
            case "servico" -> {
                tabela = "servico"; campos = new String[][]{{"nome","nome"},{"categoria","categoria"}};
                mensagem = "Já existe um serviço cadastrado com este nome nesta categoria.";
            }
            case "peca" -> {
                tabela = "peca";
                campos = new String[][]{{"nome","nome"},{"fabricante","fabricante"},{"tipo","tipo"},{"unidade","unidade"},
                    {"modelo","modelo"},{"origemOleo","origem_oleo"},{"viscosidadeSae","viscosidade_sae"}};
                mensagem = "Já existe uma peça com esta identificação e especificações. Utilize o cadastro existente ou altere os dados que identificam o produto.";
            }
            case "fornecimento-peca" -> {
                tabela = "fornecimento_pecas"; campos = new String[][]{{"idFornecedor","id_fornecedor"},{"idPeca","id_peca"}};
                mensagem = "Já existe um fornecimento para este fornecedor e peça. Edite as condições do fornecimento existente.";
            }
            case "fornecimento-servico" -> {
                tabela = "fornecimento_servicos"; campos = new String[][]{{"idFornecedor","id_fornecedor"},{"idServico","id_servico"}};
                mensagem = "Já existe um fornecimento para este fornecedor e serviço. Edite as condições do fornecimento existente.";
            }
            case "estoque" -> {
                tabela = "estoque_peca"; campos = new String[][]{{"idPeca","id_peca"},{"idLocalEstoque","id_local_estoque"}};
                mensagem = "Já existe um controle de estoque para esta peça neste local.";
            }
            case "local" -> {
                tabela = "local_estoque"; campos = new String[][]{{"nome","nome"}};
                mensagem = "Já existe um local de estoque com este nome.";
            }
            case "regra" -> {
                tabela = "regra_manutencao_preventiva"; campos = new String[][]{{"grupoManutencao","grupo_manutencao"},{"descricao","descricao"}};
                mensagem = "Já existe uma regra com esta descrição neste grupo de manutenção.";
            }
            default -> throw new IllegalArgumentException("Tipo de cadastro inválido.");
        }
        if (tipo.equals("peca")) {
            var request = new com.clinicar.backend.dto.PecaRequest();
            var entrada = org.springframework.beans.PropertyAccessorFactory.forBeanPropertyAccess(request);
            for (String[] campo : campos) entrada.setPropertyValue(campo[0], valores.get(campo[0]));
            var peca = new com.clinicar.backend.model.Peca();
            new com.clinicar.backend.mapper.PecaMapper().preencherEntidade(peca, request);
            var normalizada = org.springframework.beans.PropertyAccessorFactory.forBeanPropertyAccess(peca);
            valores = new HashMap<>(valores);
            for (String[] campo : campos) valores.put(campo[0], Objects.toString(normalizada.getPropertyValue(campo[0]), ""));
        }
        List<Object> argumentos = new ArrayList<>();
        StringBuilder sql = new StringBuilder("SELECT id FROM ").append(tabela).append(" WHERE 1=1");
        for (String[] campo : campos) {
            String valor = valores.getOrDefault(campo[0], "").trim();
            boolean opcional = tipo.equals("peca") && !Set.of("nome", "fabricante", "tipo", "unidade").contains(campo[0]);
            if (!opcional && valor.isEmpty()) return new Resultado(false, null, "");
            if (campo[0].startsWith("id")) {
                long id;
                try { id = Long.parseLong(valor); } catch (NumberFormatException e) { throw new IllegalArgumentException("Identificação inválida."); }
                if (id <= 0) throw new IllegalArgumentException("Identificação inválida.");
                sql.append(" AND ").append(campo[1]).append(" = ?"); argumentos.add(id);
            } else {
                sql.append(" AND LOWER(TRIM(COALESCE(").append(campo[1]).append(",''))) = LOWER(?)"); argumentos.add(valor);
            }
        }
        String ignorado = valores.get("idIgnorado");
        if (ignorado != null && !ignorado.isBlank()) {
            long id;
            try { id = Long.parseLong(ignorado); } catch (NumberFormatException e) { throw new IllegalArgumentException("Identificação inválida."); }
            if (id <= 0) throw new IllegalArgumentException("Identificação inválida.");
            sql.append(" AND id <> ?"); argumentos.add(id);
        }
        sql.append(" ORDER BY id LIMIT 1");
        List<Long> ids = jdbc.queryForList(sql.toString(), Long.class, argumentos.toArray());
        return ids.isEmpty() ? new Resultado(false, null, "") : new Resultado(true, ids.get(0), mensagem);
    }
}
