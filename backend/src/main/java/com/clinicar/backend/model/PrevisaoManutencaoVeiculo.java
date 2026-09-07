package com.clinicar.backend.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(
        name = "previsao_manutencao_veiculo",
        indexes = {
                @Index(name = "idx_previsao_veiculo_status", columnList = "id_veiculo, status_previsao"),
                @Index(name = "idx_previsao_cliente", columnList = "id_cliente"),
                @Index(name = "idx_previsao_grupo", columnList = "grupo_manutencao"),
                @Index(name = "idx_previsao_data_recomendada", columnList = "data_recomendada")
        }
)
@Getter
@Setter
public class PrevisaoManutencaoVeiculo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", columnDefinition = "BIGINT UNSIGNED")
    private Long id;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "id_veiculo", nullable = false, columnDefinition = "BIGINT UNSIGNED")
    private Veiculo veiculo;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "id_cliente", nullable = false, columnDefinition = "BIGINT UNSIGNED")
    private Usuario cliente;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_atendimento_origem", columnDefinition = "BIGINT UNSIGNED")
    private Atendimento atendimentoOrigem;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "id_regra_manutencao", nullable = false, columnDefinition = "BIGINT UNSIGNED")
    private RegraManutencaoPreventiva regraManutencao;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_servico", columnDefinition = "BIGINT UNSIGNED")
    private Servico servico;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_peca", columnDefinition = "BIGINT UNSIGNED")
    private Peca peca;

    @Column(name = "grupo_manutencao", nullable = false, length = 80)
    private String grupoManutencao;

    @Column(name = "descricao", nullable = false, length = 200)
    private String descricao;

    @Column(name = "origem_oleo", length = 30)
    private String origemOleo;

    @Column(name = "km_referencia", nullable = false)
    private Integer kmReferencia;

    @Column(name = "km_limite")
    private Integer kmLimite;

    @Column(name = "data_referencia", nullable = false)
    private LocalDate dataReferencia;

    @Column(name = "data_limite_tempo")
    private LocalDate dataLimiteTempo;

    @Column(name = "data_estimada_km")
    private LocalDate dataEstimadaKm;

    @Column(name = "data_recomendada", nullable = false)
    private LocalDate dataRecomendada;

    @Column(name = "criterio_utilizado", nullable = false, length = 50)
    private String criterioUtilizado;

    @Column(name = "media_km_dia", precision = 10, scale = 2)
    private BigDecimal mediaKmDia;

    @Column(name = "quantidade_registros_calculo", nullable = false)
    private Integer quantidadeRegistrosCalculo = 0;

    @Column(name = "nivel_confianca", nullable = false, length = 30)
    private String nivelConfianca;

    @Column(name = "status_previsao", nullable = false, length = 30)
    private String statusPrevisao = "PENDENTE";

    @Column(name = "observacoes", length = 1000)
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
    }

    @PreUpdate
    public void preUpdate() {
        atualizadoEm = LocalDateTime.now();
        aplicarDefaults();
    }

    private void aplicarDefaults() {
        if (statusPrevisao == null || statusPrevisao.isBlank()) {
            statusPrevisao = "PENDENTE";
        }
        if (quantidadeRegistrosCalculo == null) {
            quantidadeRegistrosCalculo = 0;
        }
        if (mediaKmDia != null) {
            mediaKmDia = mediaKmDia.setScale(2, java.math.RoundingMode.HALF_UP);
        }
    }
}
