package com.clinicar.backend.util;

import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import static org.junit.jupiter.api.Assertions.*;

class MensagemVinculoTest {
    @Test void traduzRestricoesDosComponentesSemExporDetalhesTecnicos() {
        String[][] casos = {
            {"fk_estoque_peca_peca", "Controle de estoque"},
            {"fk_fornecimento_peca_peca", "Fornecimento de peças"},
            {"fk_fornecimento_servico_servico", "Fornecimento de serviços"},
            {"fk_mov_estoque_peca", "Movimentações de estoque"},
            {"fk_agendamento_peca_peca", "Agendamentos (peças reservadas)"},
            {"fk_atendimento_peca_peca", "Atendimentos (peças utilizadas)"},
            {"fk_atendimento_servico_servico", "Atendimentos (serviços executados)"},
            {"fk_regra_manutencao_peca", "Regras de manutenção preventiva"},
            {"fk_previsao_manutencao_peca", "Previsões de manutenção preventiva"}
        };
        for (String[] caso : casos) {
            var erro = new DataIntegrityViolationException("Falha", new RuntimeException("Cannot delete parent row: foreign key constraint fails (CONSTRAINT `" + caso[0] + "`)"));
            var mensagem = MensagemVinculo.obter(erro, "DELETE", "/api/peca/12");
            assertTrue(mensagem.contains("excluir a peça / insumo"));
            assertTrue(mensagem.contains(caso[1]), caso[0]);
            assertFalse(mensagem.contains("CONSTRAINT")); assertFalse(mensagem.contains("fk_"));
        }
    }

    @Test void identificaTabelaQuandoNomeDaConstraintFoiGeradoPeloHibernate() {
        var erro = new DataIntegrityViolationException("Cannot delete or update a parent row: a foreign key constraint fails (`clinicar`.`estoque_peca`, CONSTRAINT `FK123456` FOREIGN KEY (`id_peca`) REFERENCES `peca` (`id`))");
        assertTrue(MensagemVinculo.obter(erro, "DELETE", "/api/peca/12").contains("Controle de estoque"));
    }

    @Test void diferenciaSalvarDeExcluirEIdentificaEntidadeExcluida() {
        var erro = new DataIntegrityViolationException("foreign key constraint fails fk_servico_fornecedor");
        assertTrue(MensagemVinculo.obter(erro, "DELETE", "/api/fornecedor/7").contains("excluir o fornecedor"));
        var salvar = MensagemVinculo.obter(erro, "POST", "/api/servico");
        assertTrue(salvar.contains("salvar")); assertTrue(salvar.contains("Cadastro de serviços")); assertFalse(salvar.contains("excluir"));
    }

    @Test void restricoesNaoIdentificadasNaoAtribuemUmComponenteIncorreto() {
        assertNull(MensagemVinculo.obter(new DataIntegrityViolationException("not null: peca.nome"), "DELETE", "/api/peca/7"));
        var mensagem = MensagemVinculo.exclusaoSemDetalhe("/api/peca/7");
        assertTrue(mensagem.contains("excluir a peça")); assertFalse(mensagem.contains("salvar"));
    }
}
