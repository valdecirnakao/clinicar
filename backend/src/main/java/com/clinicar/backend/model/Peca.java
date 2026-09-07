package com.clinicar.backend.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "peca")
@Getter
@Setter
public class Peca {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", columnDefinition = "BIGINT UNSIGNED")
    private Long id;

    @Column(name = "nome", nullable = false, length = 200)
    private String nome;

    @Column(name = "descricao", length = 500)
    private String descricao;

    @Column(name = "tipo", length = 100)
    private String tipo;

    @Column(name = "origem_oleo", length = 30)
    private String origemOleo;

    @Column(name = "especificacao", length = 200)
    private String especificacao;

    @Column(name = "fabricante", length = 200)
    private String fabricante;

    @Column(name = "modelo", length = 200)
    private String modelo;

    @Column(name = "norma", length = 100)
    private String norma;

    @Column(name = "unidade", length = 50)
    private String unidade;

    @Column(name = "observacoes", length = 500)
    private String observacoes;

    @Column(name = "criado_em")
    private LocalDateTime criadoEm;

    @Column(name = "atualizado_em")
    private LocalDateTime atualizadoEm;

    @PrePersist
    public void prePersist() {
        if (criadoEm == null) {
            criadoEm = LocalDateTime.now();
        }
    }

    @PreUpdate
    public void preUpdate() {
        atualizadoEm = LocalDateTime.now();
    }
}
