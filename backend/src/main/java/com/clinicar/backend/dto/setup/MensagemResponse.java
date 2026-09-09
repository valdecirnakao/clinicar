package com.clinicar.backend.dto.setup;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Resposta simples utilizada pelos endpoints
 * do fluxo de configuração inicial.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class MensagemResponse {

    private String mensagem;
}