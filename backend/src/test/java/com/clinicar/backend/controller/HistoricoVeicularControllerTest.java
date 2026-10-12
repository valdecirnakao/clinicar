package com.clinicar.backend.controller;

import com.clinicar.backend.dto.HistoricoVeicularResponse;
import com.clinicar.backend.dto.HistoricoVeicularResponse.*;
import com.clinicar.backend.service.HistoricoVeicularPdfService;
import com.clinicar.backend.service.HistoricoVeicularService;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class HistoricoVeicularControllerTest {
    @Test void exportacaoPdfTemTipoCorretoEDownloadSemCache() throws Exception {
        var service = mock(HistoricoVeicularService.class); var pdf = mock(HistoricoVeicularPdfService.class);
        var report = new HistoricoVeicularResponse(new Cadastro(1L,"ABC1234","Toyota","Corolla","Preto","2026 Flex"),
                null,null,"TODOS",LocalDateTime.now(),new Resumo(0,0,0,BigDecimal.ZERO,null),List.of());
        when(service.consultar(1L,null,null,"TODOS")).thenReturn(report); when(pdf.gerar(report)).thenReturn(new byte[]{1,2,3});
        var mvc = MockMvcBuilders.standaloneSetup(new HistoricoVeicularController(service,pdf)).build();
        mvc.perform(get("/api/veiculo/1/historico/pdf")).andExpect(status().isOk()).andExpect(content().contentType("application/pdf"))
                .andExpect(header().string("Cache-Control","no-store"))
                .andExpect(header().string("Content-Disposition","attachment; filename=\"historico-veicular-1.pdf\""));
    }
    @Test void dataInvalidaRetorna400SemConsultarBanco() throws Exception {
        var service = mock(HistoricoVeicularService.class);
        var mvc = MockMvcBuilders.standaloneSetup(new HistoricoVeicularController(service,mock(HistoricoVeicularPdfService.class))).build();
        mvc.perform(get("/api/veiculo/1/historico").param("inicio","31/09/2026")).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.mensagem").exists()); verifyNoInteractions(service);
    }
}
