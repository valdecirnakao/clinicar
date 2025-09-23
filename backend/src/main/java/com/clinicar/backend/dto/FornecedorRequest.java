// FornecedorRequest.java
package com.clinicar.backend.dto;

import lombok.Data;

@Data
public class FornecedorRequest {
    private String cnpj;
    private String razaoSocial;
    private String nomeFantasia;
    private String itemFornecido;
    private String telefone;
    private String email;
    private String fundacao; // virá como "dd/MM/yyyy" do front
    private String cep;
    private String logradouro;
    private String bairro;
    private String cidade;
    private String estado;
    private String complementoEndereco;
    private String numeroEndereco;
}
