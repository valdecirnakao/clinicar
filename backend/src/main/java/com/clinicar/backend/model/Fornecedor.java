// Fornecedor.java
package com.clinicar.backend.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

@Entity
@Getter @Setter
public class Fornecedor {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String cnpj;
    private String razaoSocial;
    private String nomeFantasia;
    private String itemFornecido;
    private String telefone;
    private String email;

    private LocalDate fundacao;

    private String cep;
    private String logradouro;
    private String bairro;
    private String cidade;
    private String estado;
    private String complementoEndereco;
    private String numeroEndereco;
}
