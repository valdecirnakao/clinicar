package com.clinicar.backend.dto;

import lombok.Data;

@Data
public class UsuarioRequest {
    private String cpf;
    private String nome;
    private String nome_social;
    private String senha;
    private String nascimento;
    private String telefone;
    private String whatsappapikey;
    private String email;
    private String cep;
    private String logradouro;
    private String bairro;
    private String cidade;
    private String estado;
    private String complemento_endereco;
    private String numero_endereco;
    private String tipo_do_acesso;
}
