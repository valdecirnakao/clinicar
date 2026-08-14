package com.clinicar.backend.event;

public record UsuarioAtivadoEvent(
        Long usuarioId,
        String nome,
        String telefone
) {
}