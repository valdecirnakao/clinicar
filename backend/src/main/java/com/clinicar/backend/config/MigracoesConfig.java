package com.clinicar.backend.config;

import java.sql.Connection;
import java.util.Map;
import javax.sql.DataSource;
import org.springframework.boot.autoconfigure.flyway.FlywayMigrationStrategy;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;

/** Impede marcar uma base antiga como atual sem verificar as migrações pré-existentes. */
@Configuration
@ConditionalOnProperty(name = "spring.flyway.enabled", havingValue = "true", matchIfMissing = true)
public class MigracoesConfig {
    @Bean FlywayMigrationStrategy migrarBaseValidada(DataSource dataSource) {
        return flyway -> {
            try (Connection connection = dataSource.getConnection()) {
                String schema = connection.getCatalog();
                if (!tabela(connection, schema, "flyway_schema_history") && tabela(connection, schema, "usuario")) {
                    Map<String, String> requisitos = Map.of(
                        "auditoria_consulta", "realizado_em", "auditoria_reset_mfa", "justificativa",
                        "auditoria_exclusao_usuario", "justificativa", "movimentacao_estoque_peca", "nome_usuario",
                        "configuracao_alerta_manutencao_usuario", "versao", "fornecedor", "ativo",
                        "peca", "chave_catalogo");
                    for (var requisito : requisitos.entrySet()) {
                        try (var columns = connection.getMetaData().getColumns(schema, null, requisito.getKey(), requisito.getValue())) {
                            if (!columns.next()) throw new IllegalStateException("Base legada incompleta: aplique as migrações até 020 antes de iniciar. Ausente: " + requisito.getKey() + "." + requisito.getValue());
                        }
                    }
                    for(var indice:Map.of("peca","uk_peca_chave_catalogo","servico","uk_servico_nome_categoria","fornecedor","uk_fornecedor_email","fornecimento_pecas","uk_fornecedor_peca","regra_manutencao_preventiva","uk_regra_grupo_descricao").entrySet()) {
                        boolean encontrado=false;
                        try(var indexes=connection.getMetaData().getIndexInfo(schema,null,indice.getKey(),true,false)) {
                            while(indexes.next()) if(indice.getValue().equalsIgnoreCase(indexes.getString("INDEX_NAME"))) encontrado=true;
                        }
                        if(!encontrado) throw new IllegalStateException("Base legada incompleta: falta a restrição "+indice.getValue()+". Aplique as migrações até 020 antes de iniciar.");
                    }
                    flyway.baseline();
                }
                flyway.migrate();
            } catch (java.sql.SQLException error) {
                throw new IllegalStateException("Não foi possível validar as migrações do banco.", error);
            }
        };
    }
    private boolean tabela(Connection connection, String schema, String nome) throws java.sql.SQLException {
        try (var tables = connection.getMetaData().getTables(schema, null, nome, new String[]{"TABLE"})) {
            return tables.next();
        }
    }
}
