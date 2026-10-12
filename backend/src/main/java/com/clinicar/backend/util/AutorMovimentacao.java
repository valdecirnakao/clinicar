package com.clinicar.backend.util;

import com.clinicar.backend.dto.UsuarioResponse;
import com.clinicar.backend.model.MovimentacaoEstoquePeca;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

public final class AutorMovimentacao {
    private AutorMovimentacao() {}

    public static void registrar(MovimentacaoEstoquePeca movimento) {
        if (!(RequestContextHolder.getRequestAttributes() instanceof ServletRequestAttributes contexto)) return;
        Object atributo = contexto.getRequest().getAttribute("usuarioLogado");
        if (!(atributo instanceof UsuarioResponse usuario) || usuario.getId() == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Sessão autenticada necessária para registrar a movimentação.");
        }
        movimento.setIdUsuario(usuario.getId());
        movimento.setNomeUsuario(usuario.getNome());
    }
}
