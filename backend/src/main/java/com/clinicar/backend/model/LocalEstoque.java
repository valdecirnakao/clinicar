package com.clinicar.backend.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "local_estoque",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_local_estoque_nome",
                        columnNames = "nome"
                )
        }
)
@Getter
@Setter
public class LocalEstoque {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 120)
    private String nome;

    @Column(length = 300)
    private String descricao;

    @Column(nullable = false)
    private Boolean ativo = true;

    @Column(name = "criado_em", nullable = false)
    private LocalDateTime criadoEm;

    @Column(name = "atualizado_em")
    private LocalDateTime atualizadoEm;

    @PrePersist
    public void prePersist() {
        if (criadoEm == null) {
            criadoEm = LocalDateTime.now();
        }

        if (ativo == null) {
            ativo = true;
        }
    }

    @PreUpdate
    public void preUpdate() {
        atualizadoEm = LocalDateTime.now();

        if (ativo == null) {
            ativo = true;
        }
    }
}