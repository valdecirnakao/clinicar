package com.clinicar.backend.dto.setup;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Resultado da validação de um token de ativação.
 *
 * Não devolvemos a entidade Usuario e não expomos
 * detalhes internos do token.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ValidarTokenResponse {

    /**
     * true quando o token pode ser utilizado.
     */
    private boolean valido;

    /**
     * Mensagem amigável a ser exibida pelo frontend.
     */
    private String mensagem;

    /**
     * E-mail parcialmente mascarado do usuário.
     *
     * Exemplo:
     * h***@gmail.com
     *
     * Somente deve ser preenchido quando fizer sentido
     * informar ao usuário para qual conta a ativação
     * está sendo realizada.
     */
    private String emailMascarado;
}