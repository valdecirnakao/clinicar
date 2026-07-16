package com.clinicar.backend.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "servico")
@Getter
@Setter
public class Servico {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 120)
    private String nome;

    @Column(length = 500)
    private String descricao;

    @Column(nullable = false, length = 100)
    private String categoria;

    @Column(name = "tipo_do_prestador", nullable = false, length = 100)
    private String tipoDoPrestador;

    @Column(name = "duracao_estimada", nullable = false, precision = 6, scale = 2)
    private BigDecimal duracaoEstimada;

    @Column(name = "unidade_duracao", nullable = false, length = 30)
    private String unidadeDuracao;

    @Column(name = "valor_base", nullable = false, precision = 10, scale = 2)
    private BigDecimal valorBase;

    @Column(name = "unidade_cobranca", nullable = false, length = 50)
    private String unidadeCobranca;

    @Column(name = "garantia_dias", nullable = false)
    private Integer garantiaDias = 0;

    @Column(name = "necessita_pecas", nullable = false)
    private Boolean necessitaPecas = false;

    @Column(nullable = false)
    private Boolean ativo = true;

    @Column(length = 500)
    private String observacoes;

    @ManyToOne
    @JoinColumn(name = "id_fornecedor")
    private Fornecedor fornecedor;

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

        if (necessitaPecas == null) {
            necessitaPecas = false;
        }

        if (garantiaDias == null) {
            garantiaDias = 0;
        }
    }

    @PreUpdate
    public void preUpdate() {
        atualizadoEm = LocalDateTime.now();

        if (ativo == null) {
            ativo = true;
        }

        if (necessitaPecas == null) {
            necessitaPecas = false;
        }

        if (garantiaDias == null) {
            garantiaDias = 0;
        }
    }
}