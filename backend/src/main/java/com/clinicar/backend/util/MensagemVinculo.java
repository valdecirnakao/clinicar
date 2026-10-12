package com.clinicar.backend.util;

import java.util.List;
import java.util.Locale;
import org.hibernate.exception.ConstraintViolationException;

/** Traduz vínculos para os nomes apresentados no sistema, sem expor SQL. */
public final class MensagemVinculo {
    private MensagemVinculo() {}
    private record Componente(String prefixo, String tabela, String nome) {}
    private static final List<Componente> COMPONENTES = List.of(
        new Componente("fk_atendimento_peca_", "atendimento_peca_utilizada", "Atendimentos (peças utilizadas)"),
        new Componente("fk_atendimento_servico_", "atendimento_servico_executado", "Atendimentos (serviços executados)"),
        new Componente("fk_agendamento_peca_", "agendamento_peca_prevista", "Agendamentos (peças reservadas)"),
        new Componente("fk_fornecimento_peca_", "fornecimento_pecas", "Fornecimento de peças"),
        new Componente("fk_fornecimento_servico_", "fornecimento_servicos", "Fornecimento de serviços"),
        new Componente("fk_mov_estoque_", "movimentacao_estoque_peca", "Movimentações de estoque"),
        new Componente("fk_config_estoque_responsavel", "configuracao_alerta_estoque", "Configuração dos alertas de estoque"),
        new Componente("fk_alerta_estoque", "alerta_estoque_peca", "Alertas de estoque"),
        new Componente("fk_estoque_peca_", "estoque_peca", "Controle de estoque"),
        new Componente("fk_regra_manutencao_", "regra_manutencao_preventiva", "Regras de manutenção preventiva"),
        new Componente("fk_hist_quilometragem_", "historico_quilometragem_veiculo", "Histórico de quilometragem"),
        new Componente("fk_previsao_", "previsao_manutencao_veiculo", "Previsões de manutenção preventiva"),
        new Componente("fk_atendimento_", "atendimento", "Atendimentos"),
        new Componente("fk_agendamento_", "agendamento", "Agendamentos"),
        new Componente("fk_servico_", "servico", "Cadastro de serviços"),
        new Componente("fk_veiculo_", "veiculo", "Cadastro de veículos"),
        new Componente("fk_solicitacao_acesso_", "solicitacao_acesso_usuario", "Solicitações de acesso"),
        new Componente("fk_configuracao_sistema_", "configuracao_sistema", "Configuração do sistema"),
        new Componente("fk_password_reset_", "password_reset_token", "Recuperação de senha"),
        new Componente("fk_token_ativacao_", "token_ativacao_usuario", "Ativação de conta"),
        new Componente("fk_mfa_challenge_", "mfa_challenge", "Autenticação em duas etapas"),
        new Componente("fk_auth_session_", "auth_session", "Sessões de acesso")
    );

    public static String obter(Throwable erro, String metodo, String uri) {
        String componente = identificarComponente(erro);
        if (componente == null) return null;
        if ("DELETE".equalsIgnoreCase(metodo)) {
            return "Não foi possível excluir " + registro(uri) + " porque existem vínculos em " + componente
                + ". Revise os vínculos nesse componente antes de tentar novamente.";
        }
        return "Não foi possível salvar o registro porque o vínculo utilizado em " + componente
            + " é inválido. Verifique se o registro associado existe e atualize os dados selecionados.";
    }

    public static String exclusaoSemDetalhe(String uri) {
        return "Não foi possível excluir " + registro(uri)
            + " porque existem registros vinculados ou outra restrição de integridade. Verifique os vínculos antes de tentar novamente.";
    }

    private static String identificarComponente(Throwable erro) {
        StringBuilder detalhes = new StringBuilder();
        for (Throwable causa = erro; causa != null; causa = causa.getCause()) {
            if (causa instanceof ConstraintViolationException constraint) {
                String nome = String.valueOf(constraint.getConstraintName()).toLowerCase(Locale.ROOT);
                for (Componente item : COMPONENTES) if (nome.contains(item.prefixo())) return item.nome();
            }
            detalhes.append(' ').append(causa.getMessage());
        }
        String texto = detalhes.toString().toLowerCase(Locale.ROOT);
        if (!texto.contains("foreign key") && !texto.contains("referential integrity") && !texto.contains("fk_")) return null;
        for (Componente item : COMPONENTES) if (texto.contains(item.prefixo())) return item.nome();
        // MySQL names the referencing table before CONSTRAINT, even when Hibernate generated the key name.
        var tabela = java.util.regex.Pattern.compile("fails\\s*\\(\\s*[`\"]?[^`\".\\s]+[`\"]?\\.[`\"]([^`\"]+)[`\"]").matcher(texto);
        if (tabela.find()) {
            for (Componente item : COMPONENTES) if (item.tabela().equals(tabela.group(1))) return item.nome();
        }
        return null;
    }

    private static String registro(String uri) {
        String caminho = uri == null ? "" : uri;
        if (caminho.matches(".*/api/peca/\\d+/?")) return "a peça / insumo";
        if (caminho.matches(".*/api/fornecedor/\\d+/?")) return "o fornecedor";
        if (caminho.matches(".*/api/servico/\\d+/?")) return "o serviço";
        if (caminho.matches(".*/api/veiculo/\\d+/?")) return "o veículo";
        if (caminho.matches(".*/api/usuario/\\d+/?")) return "o usuário";
        if (caminho.matches(".*/api/agendamento/\\d+/?")) return "o agendamento";
        if (caminho.matches(".*/api/fornecimento-(pecas|servicos)/\\d+/?")) return "o fornecimento";
        if (caminho.matches(".*/api/estoque-pecas/\\d+/?")) return "o controle de estoque";
        if (caminho.matches(".*/api/local-estoque/\\d+/?")) return "o local de estoque";
        if (caminho.matches(".*/api/regra-manutencao-preventiva/\\d+/?")) return "a regra de manutenção preventiva";
        return "o registro";
    }
}
