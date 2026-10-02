package com.clinicar.backend.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import java.time.LocalDate;
import java.time.LocalDateTime;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "usuario", uniqueConstraints = @UniqueConstraint(name = "uk_usuario_cpf", columnNames = "cpf"))
@Getter
@Setter
public class Usuario {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String nome;
    private String nome_social;

    @Column(name = "email", nullable = false, unique = true, length = 255)
    private String email;

    @JsonIgnore
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

    @Column(name = "criado_em", nullable = false, updatable = false)
    private LocalDateTime criadoEm;

    @Column(name = "atualizado_em", nullable = false)
    private LocalDateTime atualizadoEm;

    @PrePersist
    public void prePersist() {
        LocalDateTime agora = LocalDateTime.now();

        if (criadoEm == null) {
            criadoEm = agora;
        }

        if (atualizadoEm == null) {
            atualizadoEm = agora;
        }
    }

    @PreUpdate
    public void preUpdate() {
        atualizadoEm = LocalDateTime.now();
    }
}
