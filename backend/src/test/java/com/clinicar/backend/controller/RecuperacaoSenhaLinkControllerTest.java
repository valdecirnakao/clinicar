package com.clinicar.backend.controller;

import com.clinicar.backend.service.*;
import java.time.LocalDateTime;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class RecuperacaoSenhaLinkControllerTest {
    @Test void linkUsadoRetornaDataOriginalEmCampoProprioSemCache() throws Exception {
        var service = mock(RecuperacaoSenhaService.class);
        doThrow(new TokenRedefinicaoUtilizadoException(LocalDateTime.of(2026,10,1,17,45,28)))
                .when(service).validarLinkRedefinicao("teste");
        var mvc = MockMvcBuilders.standaloneSetup(new AuthController(service, mock(MfaService.class), mock(SessionService.class)))
                .setControllerAdvice(new GlobalExceptionHandler()).build();
        mvc.perform(get("/api/auth/redefinir-senha/validar").param("token","teste"))
                .andExpect(status().isBadRequest()).andExpect(header().string("Cache-Control","no-store"))
                .andExpect(jsonPath("$.mensagem").value("Token já utilizado."))
                .andExpect(jsonPath("$.dataHoraUtilizacao").value("2026-10-01T17:45:28"));
    }
    @Test void linkValidoApenasValidaSemDefinirSenha() throws Exception {
        var service = mock(RecuperacaoSenhaService.class);
        var mvc = MockMvcBuilders.standaloneSetup(new AuthController(service, mock(MfaService.class), mock(SessionService.class))).build();
        mvc.perform(get("/api/auth/redefinir-senha/validar").param("token","teste"))
                .andExpect(status().isNoContent()).andExpect(header().string("Cache-Control","no-store"));
        verify(service).validarLinkRedefinicao("teste"); verifyNoMoreInteractions(service);
    }
}
