package com.clinicar.backend.event;

public record VeiculoAtualizadoEvent(
        Long veiculoId,
        String nome,
        String telefone,
        String veiculo
) {
}