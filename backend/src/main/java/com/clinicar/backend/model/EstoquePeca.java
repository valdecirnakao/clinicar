package com.clinicar.backend.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "estoque_peca", uniqueConstraints = {
        @UniqueConstraint(name = "uk_estoque_peca_local", columnNames = { "id_peca", "id_local_estoque" })
})
@Getter
@Setter
public class EstoquePeca {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "id_peca", nullable = false)
    private Peca peca;

    @ManyToOne(optional = false)
    @JoinColumn(name = "id_local_estoque", nullable = false)
    private LocalEstoque localEstoque;

    @Column(name = "quantidade_atual", nullable = false, precision = 12, scale = 3)
    private BigDecimal quantidadeAtual = BigDecimal.ZERO;

    @Column(name = "quantidade_reservada", nullable = false, precision = 10, scale = 2)
    private BigDecimal quantidadeReservada = BigDecimal.ZERO;

    @Column(name = "estoque_minimo", nullable = false, precision = 12, scale = 3)
    private BigDecimal estoqueMinimo = BigDecimal.ZERO;

    @Column(name = "estoque_critico", nullable = false, precision = 12, scale = 3)
    private BigDecimal estoqueCritico = BigDecimal.ZERO;

    @Column(name = "estoque_maximo", precision = 12, scale = 3)
    private BigDecimal estoqueMaximo;

    @Column(name = "ponto_reposicao", precision = 12, scale = 3)
    private BigDecimal pontoReposicao;

    @Column(name = "quantidade_reposicao_sugerida", precision = 12, scale = 3)
    private BigDecimal quantidadeReposicaoSugerida;

    @Column(name = "custo_medio", precision = 10, scale = 2)
    private BigDecimal custoMedio;

    @Column(name = "localizacao_fisica", length = 120)
    private String localizacaoFisica;

    @Column(name = "status_estoque", nullable = false, length = 30)
    private String statusEstoque = "NORMAL";

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

        aplicarDefaults();
    }

    @PreUpdate
    public void preUpdate() {
        atualizadoEm = LocalDateTime.now();

        aplicarDefaults();
    }

    private void aplicarDefaults() {
        if (quantidadeAtual == null) {
            quantidadeAtual = BigDecimal.ZERO;
        }

        if (quantidadeReservada == null) {
            quantidadeReservada = BigDecimal.ZERO;
        }

        if (estoqueMinimo == null) {
            estoqueMinimo = BigDecimal.ZERO;
        }

        if (estoqueCritico == null) {
            estoqueCritico = BigDecimal.ZERO;
        }

        if (statusEstoque == null || statusEstoque.isBlank()) {
            statusEstoque = "NORMAL";
        }

        if (ativo == null) {
            ativo = true;
        }
    }

    public BigDecimal getQuantidadeDisponivel() {
        BigDecimal atual = quantidadeAtual != null
                ? quantidadeAtual
                : BigDecimal.ZERO;

        BigDecimal reservada = quantidadeReservada != null
                ? quantidadeReservada
                : BigDecimal.ZERO;

        return atual.subtract(reservada);
    }
}