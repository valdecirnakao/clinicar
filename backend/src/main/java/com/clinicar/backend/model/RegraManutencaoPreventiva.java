package com.clinicar.backend.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "regra_manutencao_preventiva",
        indexes = {
                @Index(name = "idx_regra_manutencao_grupo", columnList = "grupo_manutencao"),
                @Index(name = "idx_regra_manutencao_origem_oleo", columnList = "origem_oleo"),
                @Index(name = "idx_regra_manutencao_ativo", columnList = "ativo")
        }
)
@Getter
@Setter
public class RegraManutencaoPreventiva {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", columnDefinition = "BIGINT UNSIGNED")
    private Long id;

    @Column(name = "grupo_manutencao", nullable = false, length = 80)
    private String grupoManutencao;

    @Column(name = "descricao", nullable = false, length = 200)
    private String descricao;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_servico", columnDefinition = "BIGINT UNSIGNED")
    private Servico servico;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_peca", columnDefinition = "BIGINT UNSIGNED")
    private Peca peca;

    @Column(name = "origem_oleo", length = 30)
    private String origemOleo;

    @Column(name = "intervalo_km")
    private Integer intervaloKm;

    @Column(name = "intervalo_dias")
    private Integer intervaloDias;

    @Column(name = "prioridade", nullable = false)
    private Integer prioridade = 100;

    @Column(name = "ativo", nullable = false)
    private Boolean ativo = true;

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
    }

    @PreUpdate
    public void preUpdate() {
        atualizadoEm = LocalDateTime.now();
        aplicarDefaults();
    }

    private void aplicarDefaults() {
        if (prioridade == null || prioridade <= 0) {
            prioridade = 100;
        }
        if (ativo == null) {
            ativo = true;
        }
    }
}
