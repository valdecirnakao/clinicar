package com.clinicar.backend.event;

public record UsuarioCadastradoEvent(Long usuarioId, String nome, String telefone) {
}
