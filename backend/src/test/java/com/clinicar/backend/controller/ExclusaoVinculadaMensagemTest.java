package com.clinicar.backend.controller;

import com.clinicar.backend.exception.ApiExceptionHandler;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.RestController;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class ExclusaoVinculadaMensagemTest {
    @RestController
    static class ExclusaoTesteController {
        @DeleteMapping("/api/peca/12") public void excluir() {
            throw new DataIntegrityViolationException("Cannot delete a parent row: foreign key constraint fails fk_estoque_peca_peca");
        }
        @DeleteMapping("/api/servico/7") public void excluirDesconhecido() {
            throw new DataIntegrityViolationException("Detalhe técnico que não deve aparecer na tela");
        }
    }
    @Test void ambosHandlersInformamControleDeEstoqueNaExclusaoBloqueada() throws Exception {
        for (Object advice : new Object[]{new GlobalExceptionHandler(), new ApiExceptionHandler()}) {
            var mvc = MockMvcBuilders.standaloneSetup(new ExclusaoTesteController()).setControllerAdvice(advice).build();
            mvc.perform(delete("/api/peca/12")).andExpect(status().isConflict())
                .andExpect(jsonPath("$.mensagem").value("Não foi possível excluir a peça / insumo porque existem vínculos em Controle de estoque. Revise os vínculos nesse componente antes de tentar novamente."));
        }
    }
    @Test void ambosHandlersUsamAcaoCorretaSemExporErroBruto() throws Exception {
        for (Object advice : new Object[]{new GlobalExceptionHandler(), new ApiExceptionHandler()}) {
            var mvc = MockMvcBuilders.standaloneSetup(new ExclusaoTesteController()).setControllerAdvice(advice).build();
            mvc.perform(delete("/api/servico/7")).andExpect(status().isConflict())
                .andExpect(jsonPath("$.mensagem").value(com.clinicar.backend.util.MensagemVinculo.exclusaoSemDetalhe("/api/servico/7")));
        }
    }
}
