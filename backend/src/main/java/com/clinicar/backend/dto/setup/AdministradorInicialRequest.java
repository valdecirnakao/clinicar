package com.clinicar.backend.dto.setup;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Dados permitidos para o cadastro do administrador
 * responsável pela configuração inicial do CliniCar.
 *
 * Importante:
 * este DTO não possui senha, status, tipo de acesso
 * ou informações de MFA.
 *
 * Esses atributos são controlados exclusivamente
 * pelo backend durante o primeiro acesso.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class AdministradorInicialRequest {

    private String cpf;

    private String nome;

    private String nomeSocial;

    private String email;

    /**
     * Mantido como String para seguir o padrão já utilizado
     * pelos DTOs de usuário do CliniCar.
     *
     * O formato esperado pelo frontend será:
     * yyyy-MM-dd
     */
    private String nascimento;

    private String telefone;

    private String cep;

    private String logradouro;

    private String numeroEndereco;

    private String complementoEndereco;

    private String bairro;

    private String cidade;

    /**
     * Sigla da Unidade Federativa.
     *
     * Exemplos:
     * SP
     * RJ
     * MG
     */
    private String estado;
}