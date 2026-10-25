package com.clinicar.backend.controller;

import com.clinicar.backend.dto.UsuarioResponse;
import com.clinicar.backend.mapper.AgendamentoMapper;
import com.clinicar.backend.mapper.AtendimentoMapper;
import com.clinicar.backend.service.AgendamentoService;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.List;

import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class AgendamentoPecasControllerTest {
    @Test void apenasEquipeConsultaPecasPrevistasParaEdicao() throws Exception {
        var service = mock(AgendamentoService.class);
        when(service.listarPecasPrevistas(4L)).thenReturn(List.of());
        var mvc = MockMvcBuilders.standaloneSetup(new AgendamentoController(service,
                mock(AgendamentoMapper.class), mock(AtendimentoMapper.class))).build();
        var cliente = usuario("CLIENTE");
        mvc.perform(get("/api/agendamento/4/pecas-previstas")
                .requestAttr("usuarioLogado", cliente)).andExpect(status().isForbidden());
        verify(service, never()).listarPecasPrevistas(anyLong());
        mvc.perform(get("/api/agendamento/4/pecas-previstas")
                .requestAttr("usuarioLogado", usuario("COLABORADOR")))
                .andExpect(status().isOk()).andExpect(content().json("[]"));
    }

    private UsuarioResponse usuario(String perfil) {
        var usuario = new UsuarioResponse();
        usuario.setTipo_do_acesso(perfil);
        usuario.setStatus("ATIVO");
        return usuario;
    }
}
