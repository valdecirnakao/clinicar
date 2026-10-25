package com.clinicar.backend.controller;

import com.clinicar.backend.dto.HistoricoVeicularResponse;
import com.clinicar.backend.dto.UsuarioResponse;
import com.clinicar.backend.dto.HistoricoVeicularResponse.*;
import com.clinicar.backend.repository.VeiculoRepository;
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
        var mvc = MockMvcBuilders.standaloneSetup(new HistoricoVeicularController(service,pdf,mock(VeiculoRepository.class))).build();
        mvc.perform(get("/api/veiculo/1/historico/pdf").requestAttr("usuarioLogado", usuario("ADMINISTRADOR", 9L))).andExpect(status().isOk()).andExpect(content().contentType("application/pdf"))
                .andExpect(header().string("Cache-Control","no-store"))
                .andExpect(header().string("Content-Disposition","attachment; filename=\"historico-veicular-1.pdf\""));
    }
    @Test void dataInvalidaRetorna400SemConsultarBanco() throws Exception {
        var service = mock(HistoricoVeicularService.class);
        var mvc = MockMvcBuilders.standaloneSetup(new HistoricoVeicularController(service,mock(HistoricoVeicularPdfService.class),mock(VeiculoRepository.class))).build();
        mvc.perform(get("/api/veiculo/1/historico").requestAttr("usuarioLogado", usuario("ADMINISTRADOR", 9L)).param("inicio","31/09/2026")).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.mensagem").exists()); verifyNoInteractions(service);
    }
    @Test void clienteConsultaEAcessaPdfSomenteDoProprioVeiculo() throws Exception {
        var service = mock(HistoricoVeicularService.class); var pdf = mock(HistoricoVeicularPdfService.class);
        var veiculos = mock(VeiculoRepository.class);
        when(veiculos.existsByIdAndIdProprietario(1L, 7L)).thenReturn(true);
        var report = new HistoricoVeicularResponse(new Cadastro(1L,"ABC1234","Toyota","Corolla","Preto","2026 Flex"),
                null,null,"TODOS",LocalDateTime.now(),new Resumo(0,0,0,BigDecimal.ZERO,null),List.of());
        when(service.consultar(1L,null,null,"TODOS")).thenReturn(report);
        when(pdf.gerar(report)).thenReturn(new byte[]{1,2,3});
        var mvc = MockMvcBuilders.standaloneSetup(new HistoricoVeicularController(service,pdf,veiculos)).build();
        var cliente = usuario("CLIENTE", 7L);
        mvc.perform(get("/api/veiculo/1/historico").requestAttr("usuarioLogado", cliente)).andExpect(status().isOk());
        mvc.perform(get("/api/veiculo/1/historico/pdf").requestAttr("usuarioLogado", cliente)).andExpect(status().isOk());
        mvc.perform(get("/api/veiculo/2/historico").requestAttr("usuarioLogado", cliente)).andExpect(status().isForbidden());
        mvc.perform(get("/api/veiculo/2/historico/pdf").requestAttr("usuarioLogado", cliente)).andExpect(status().isForbidden());
        verify(service, never()).consultar(eq(2L), any(), any(), any());
        verify(veiculos, times(2)).existsByIdAndIdProprietario(1L, 7L);
    }
    private UsuarioResponse usuario(String perfil, Long id) {
        var usuario = new UsuarioResponse(); usuario.setId(id); usuario.setTipo_do_acesso(perfil); usuario.setStatus("ATIVO");
        return usuario;
    }
}
