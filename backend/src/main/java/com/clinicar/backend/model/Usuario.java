package com.clinicar.backend.model;
import com.fasterxml.jackson.annotation.JsonIgnore;
import java.time.LocalDate;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Getter @Setter
public class Usuario {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String nome;
    private String nome_social;
    private String email;
    private String senha;
    private String cpf;
    private LocalDate nascimento;       
    private String telefone;
    private String cep;
    private String numero_endereco;
    private String complemento_endereco;
    private String logradouro;
    private String bairro;
    private String cidade;
    private String estado;
    private String tipo_do_acesso;
    private String status;

    @Column(name = "mfa_ativo", nullable = false)
    private Boolean mfaAtivo = false;

    @Column(name = "mfa_tipo", length = 30)
    private String mfaTipo;

    @JsonIgnore
    @Column(name = "mfa_secret", length = 1000)
    private String mfaSecret;
}
