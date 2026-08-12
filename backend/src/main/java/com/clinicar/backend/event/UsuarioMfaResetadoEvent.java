package com.clinicar.backend.event;

public record UsuarioMfaResetadoEvent(
        Long usuarioId,
        String nome,
        String telefone
) {
}