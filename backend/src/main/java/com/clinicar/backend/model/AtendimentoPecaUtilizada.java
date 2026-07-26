package com.clinicar.backend.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "atendimento_peca_utilizada")
@Getter
@Setter
public class AtendimentoPecaUtilizada {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", columnDefinition = "BIGINT UNSIGNED")
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "id_atendimento", nullable = false, columnDefinition = "BIGINT UNSIGNED")
    private Atendimento atendimento;

    @ManyToOne(optional = false)
    @JoinColumn(name = "id_peca", nullable = false, columnDefinition = "BIGINT UNSIGNED")
    private Peca peca;

    @ManyToOne
    @JoinColumn(name = "id_estoque_peca", columnDefinition = "BIGINT UNSIGNED")
    private EstoquePeca estoquePeca;

    @ManyToOne
    @JoinColumn(name = "id_fornecedor", columnDefinition = "BIGINT UNSIGNED")
    private Fornecedor fornecedor;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal quantidade = BigDecimal.ONE;

    @Column(name = "valor_unitario", nullable = false, precision = 10, scale = 2)
    private BigDecimal valorUnitario = BigDecimal.ZERO;

    @Column(name = "valor_total", nullable = false, precision = 10, scale = 2)
    private BigDecimal valorTotal = BigDecimal.ZERO;

    @Column(name = "unidade_medida", length = 50)
    private String unidadeMedida;

    @Column(length = 500)
    private String observacoes;

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
        recalcularTotal();
    }

    @PreUpdate
    public void preUpdate() {
        atualizadoEm = LocalDateTime.now();

        aplicarDefaults();
        recalcularTotal();
    }

    private void aplicarDefaults() {
        if (quantidade == null) {
            quantidade = BigDecimal.ONE;
        }

        if (valorUnitario == null) {
            valorUnitario = BigDecimal.ZERO;
        }

        if (valorTotal == null) {
            valorTotal = BigDecimal.ZERO;
        }
    }

    private void recalcularTotal() {
        valorTotal = quantidade.multiply(valorUnitario);

        if (valorTotal.compareTo(BigDecimal.ZERO) < 0) {
            valorTotal = BigDecimal.ZERO;
        }
    }
}