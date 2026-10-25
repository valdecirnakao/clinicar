package com.clinicar.backend.controller;

import com.clinicar.backend.dto.UsuarioResponse;
import com.clinicar.backend.service.CorrecaoVeiculoService;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;

class CorrecaoVeiculoControllerTest {
    private final CorrecaoVeiculoService service = mock(CorrecaoVeiculoService.class);
    private final CorrecaoVeiculoController controller = new CorrecaoVeiculoController(service);

    private UsuarioResponse usuario(String perfil, String status) {
        var u = new UsuarioResponse(); u.setId(4L);
        u.setTipo_do_acesso(perfil); u.setStatus(status);
        return u;
    }

    @Test void colaboradorNaoAcessaSolicitacoesAdministrativas() {
        var erro = assertThrows(ResponseStatusException.class,
                () -> controller.pendentes(usuario("COLABORADOR", "ATIVO"), 0, 10));
        assertEquals(403, erro.getStatusCode().value());
        verifyNoInteractions(service);
    }

    @Test void clienteInativoNaoSolicitaCorrecao() {
        var erro = assertThrows(ResponseStatusException.class,
                () -> controller.solicitar(usuario("CLIENTE", "INATIVO"), 10L, null));
        assertEquals(403, erro.getStatusCode().value());
        verifyNoInteractions(service);
    }

    @Test void administradorNaoUsaRotaDeCliente() {
        var erro = assertThrows(ResponseStatusException.class,
                () -> controller.dadosEdicao(usuario("ADMINISTRADOR", "ATIVO")));
        assertEquals(403, erro.getStatusCode().value());
        verifyNoInteractions(service);
    }
}
