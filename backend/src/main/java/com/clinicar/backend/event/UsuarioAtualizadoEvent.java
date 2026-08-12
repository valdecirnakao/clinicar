package com.clinicar.backend.event;

public record UsuarioAtualizadoEvent(
        Long usuarioId,
        String nome,
        String telefone
) {
}