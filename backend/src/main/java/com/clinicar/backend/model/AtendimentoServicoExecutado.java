package com.clinicar.backend.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;

@Entity
@Table(name = "atendimento_servico_executado")
@Getter
@Setter
public class AtendimentoServicoExecutado {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", columnDefinition = "BIGINT UNSIGNED")
    private Long id;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "id_atendimento", nullable = false, columnDefinition = "BIGINT UNSIGNED")
    private Atendimento atendimento;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "id_servico", nullable = false, columnDefinition = "BIGINT UNSIGNED")
    private Servico servico;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_responsavel", columnDefinition = "BIGINT UNSIGNED")
    private Usuario responsavel;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_fornecedor", columnDefinition = "BIGINT UNSIGNED")
    private Fornecedor fornecedor;

    @Column(name = "tipo_execucao", nullable = false, length = 30)
    private String tipoExecucao = "INTERNO";

    @Column(name = "quantidade", nullable = false, precision = 10, scale = 2)
    private BigDecimal quantidade = BigDecimal.ONE;

    @Column(name = "unidade_cobranca", length = 50)
    private String unidadeCobranca;

    @Column(name = "tempo_execucao", precision = 10, scale = 2)
    private BigDecimal tempoExecucao;

    @Column(name = "unidade_tempo", length = 30)
    private String unidadeTempo;

    @Column(name = "valor_mao_obra", nullable = false, precision = 10, scale = 2)
    private BigDecimal valorMaoObra = BigDecimal.ZERO;

    @Column(name = "valor_terceiro", nullable = false, precision = 10, scale = 2)
    private BigDecimal valorTerceiro = BigDecimal.ZERO;

    @Column(name = "desconto", nullable = false, precision = 10, scale = 2)
    private BigDecimal desconto = BigDecimal.ZERO;

    @Column(name = "valor_total", nullable = false, precision = 10, scale = 2)
    private BigDecimal valorTotal = BigDecimal.ZERO;

    @Column(name = "status_item", nullable = false, length = 30)
    private String statusItem = "EXECUTADO";

    @Column(name = "observacoes", length = 500)
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
        if (tipoExecucao == null || tipoExecucao.isBlank()) {
            tipoExecucao = "INTERNO";
        } else {
            tipoExecucao = tipoExecucao.trim().toUpperCase();
        }

        if (quantidade == null || quantidade.compareTo(BigDecimal.ZERO) <= 0) {
            quantidade = BigDecimal.ONE;
        }

        quantidade = quantidade.setScale(2, RoundingMode.HALF_UP);

        valorMaoObra = valorOuZero(valorMaoObra);
        valorTerceiro = valorOuZero(valorTerceiro);
        desconto = valorOuZero(desconto);

        if ("INTERNO".equals(tipoExecucao)) {
            valorTerceiro = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        }

        if (statusItem == null || statusItem.isBlank()) {
            statusItem = "EXECUTADO";
        } else {
            statusItem = statusItem.trim().toUpperCase();
        }
    }

    private void recalcularTotal() {
        /*
         * Regra:
         * valorTotal = quantidade * valorMaoObra + valorTerceiro - desconto
         *
         * Exemplo:
         * quantidade = 2
         * valorMaoObra = 95.50
         * valorTerceiro = 0
         * desconto = 0
         * total = 191.00
         */
        BigDecimal totalMaoObra = valorOuZero(quantidade)
                .multiply(valorOuZero(valorMaoObra))
                .setScale(2, RoundingMode.HALF_UP);

        BigDecimal total = totalMaoObra
                .add(valorOuZero(valorTerceiro))
                .subtract(valorOuZero(desconto))
                .setScale(2, RoundingMode.HALF_UP);

        if (total.compareTo(BigDecimal.ZERO) < 0) {
            total = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        }

        valorTotal = total;
    }

    private BigDecimal valorOuZero(BigDecimal valor) {
        return valor == null
                ? BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP)
                : valor.setScale(2, RoundingMode.HALF_UP);
    }
}