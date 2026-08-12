package com.clinicar.backend.event;

public record UsuarioInativadoEvent(
        Long usuarioId,
        String nome,
        String telefone
) {
}