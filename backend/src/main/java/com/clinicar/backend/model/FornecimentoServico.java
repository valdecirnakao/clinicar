package com.clinicar.backend.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(
        name = "fornecimento_servicos",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_fornecedor_servico",
                        columnNames = {"id_fornecedor", "id_servico"}
                )
        }
)
@Getter
@Setter
public class FornecimentoServico {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "id_fornecedor", nullable = false)
    private Fornecedor fornecedor;

    @ManyToOne(optional = false)
    @JoinColumn(name = "id_servico", nullable = false)
    private Servico servico;

    @Column(name = "valor_custo", nullable = false, precision = 10, scale = 2)
    private BigDecimal valorCusto;

    @Column(name = "unidade_cobranca", nullable = false, length = 50)
    private String unidadeCobranca;

    @Column(name = "prazo_execucao", nullable = false, precision = 6, scale = 2)
    private BigDecimal prazoExecucao;

    @Column(name = "unidade_prazo", nullable = false, length = 30)
    private String unidadePrazo;

    @Column(name = "quantidade_minima", nullable = false)
    private Integer quantidadeMinima = 1;

    @Column(nullable = false, length = 50)
    private String disponibilidade = "SOB_DEMANDA";

    @Column(name = "contrato_referencia", length = 120)
    private String contratoReferencia;

    @Column(name = "data_inicio_vigencia")
    private LocalDate dataInicioVigencia;

    @Column(name = "data_fim_vigencia")
    private LocalDate dataFimVigencia;

    @Column(nullable = false)
    private Boolean ativo = true;

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

        if (ativo == null) {
            ativo = true;
        }

        if (quantidadeMinima == null) {
            quantidadeMinima = 1;
        }

        if (disponibilidade == null || disponibilidade.isBlank()) {
            disponibilidade = "SOB_DEMANDA";
        }
    }

    @PreUpdate
    public void preUpdate() {
        atualizadoEm = LocalDateTime.now();

        if (ativo == null) {
            ativo = true;
        }

        if (quantidadeMinima == null) {
            quantidadeMinima = 1;
        }

        if (disponibilidade == null || disponibilidade.isBlank()) {
            disponibilidade = "SOB_DEMANDA";
        }
    }
}