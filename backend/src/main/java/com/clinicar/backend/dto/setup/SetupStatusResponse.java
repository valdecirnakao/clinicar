package com.clinicar.backend.dto.setup;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Resposta utilizada pelo frontend para identificar
 * o estado atual da configuração inicial do CliniCar.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class SetupStatusResponse {

    /**
     * Indica se ainda é permitido cadastrar
     * o primeiro administrador.
     */
    private boolean setupDisponivel;

    /**
     * Estado atual da configuração.
     *
     * Valores esperados:
     *
     * NAO_INICIADO
     * AGUARDANDO_ATIVACAO
     * CONCLUIDO
     */
    private String estado;

    /**
     * Mensagem amigável para apresentação
     * ao frontend.
     */
    private String mensagem;
}