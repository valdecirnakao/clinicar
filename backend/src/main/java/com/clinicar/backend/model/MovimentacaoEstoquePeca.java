package com.clinicar.backend.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "movimentacao_estoque_peca")
@Getter
@Setter
public class MovimentacaoEstoquePeca {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "id_estoque_peca", nullable = false)
    private EstoquePeca estoquePeca;

    @ManyToOne(optional = false)
    @JoinColumn(name = "id_peca", nullable = false)
    private Peca peca;

    @Column(name = "tipo_movimento", nullable = false, length = 40)
    private String tipoMovimento;

    @Column(nullable = false, precision = 12, scale = 3)
    private BigDecimal quantidade;

    @Column(name = "saldo_anterior", nullable = false, precision = 12, scale = 3)
    private BigDecimal saldoAnterior;

    @Column(name = "saldo_posterior", nullable = false, precision = 12, scale = 3)
    private BigDecimal saldoPosterior;

    @Column(name = "valor_unitario", precision = 10, scale = 2)
    private BigDecimal valorUnitario;

    @Column(name = "valor_total", precision = 10, scale = 2)
    private BigDecimal valorTotal;

    @Column(length = 80)
    private String origem;

    @Column(name = "documento_referencia", length = 120)
    private String documentoReferencia;

    @Column(length = 200)
    private String motivo;

    @Column(length = 500)
    private String observacoes;

    @Column(name = "id_usuario")
    private Long idUsuario;

    @Column(name = "criado_em", nullable = false)
    private LocalDateTime criadoEm;

    @PrePersist
    public void prePersist() {
        if (criadoEm == null) {
            criadoEm = LocalDateTime.now();
        }
    }
}