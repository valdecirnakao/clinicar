package com.clinicar.backend.dto.setup;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;

/**
 * Requisição utilizada para definir a senha
 * do administrador durante a ativação inicial.
 *
 * A senha nunca deverá ser gravada diretamente
 * no banco de dados.
 *
 * O PrimeiroAcessoService deverá utilizar o
 * PasswordEncoder antes de atualizar Usuario.senha.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class DefinirSenhaInicialRequest {

    /**
     * Token puro recebido através do link
     * enviado por e-mail.
     *
     * O banco contém somente o hash SHA-256
     * correspondente ao token.
     */
    private String token;

    /**
     * Nova senha escolhida pelo administrador.
     */
    private String senha;

    /**
     * Repetição da senha para evitar erro
     * de digitação.
     */
    private String confirmarSenha;
}