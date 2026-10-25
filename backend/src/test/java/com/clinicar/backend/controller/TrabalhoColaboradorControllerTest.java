package com.clinicar.backend.controller;

import com.clinicar.backend.dto.UsuarioResponse;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import static org.junit.jupiter.api.Assertions.assertEquals;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class TrabalhoColaboradorControllerTest {
    @Autowired TrabalhoColaboradorController controller;

    @Test void painelConsultaSomentePendenciasDoUsuarioDaSessao() {
        var usuario = new UsuarioResponse();
        usuario.setId(987654L);
        usuario.setStatus("ATIVO");
        usuario.setTipo_do_acesso("COLABORADOR");
        var request = new MockHttpServletRequest();
        request.setAttribute("usuarioLogado", usuario);

        var resumo = controller.pendencias(request);
        assertEquals(0L, resumo.get("agendamentos"));
        assertEquals(0L, resumo.get("atendimentos"));
        assertEquals(0L, resumo.get("alertasEstoque"));
        assertEquals(0L, controller.consultar(request, "agendamentos", 0, 10, "", true).get("totalElements"));
        assertEquals(0L, controller.consultar(request, "atendimentos", 0, 10, "", true).get("totalElements"));
        assertEquals(0L, controller.consultar(request, "alertas-estoque", 0, 10, "", true).get("totalElements"));
    }
}
