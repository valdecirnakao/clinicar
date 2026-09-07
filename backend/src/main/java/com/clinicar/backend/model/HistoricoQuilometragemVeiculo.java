package com.clinicar.backend.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(
        name = "historico_quilometragem_veiculo",
        indexes = {
                @Index(name = "idx_historico_km_veiculo_data", columnList = "id_veiculo, data_registro"),
                @Index(name = "idx_historico_km_atendimento", columnList = "id_atendimento")
        }
)
@Getter
@Setter
public class HistoricoQuilometragemVeiculo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", columnDefinition = "BIGINT UNSIGNED")
    private Long id;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "id_veiculo", nullable = false, columnDefinition = "BIGINT UNSIGNED")
    private Veiculo veiculo;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_atendimento", columnDefinition = "BIGINT UNSIGNED")
    private Atendimento atendimento;

    @Column(name = "data_registro", nullable = false)
    private LocalDate dataRegistro;

    @Column(name = "quilometragem", nullable = false)
    private Integer quilometragem;

    @Column(name = "origem", nullable = false, length = 50)
    private String origem = "ATENDIMENTO";

    @Column(name = "valido_para_calculo", nullable = false)
    private Boolean validoParaCalculo = true;

    @Column(name = "observacoes", length = 500)
    private String observacoes;

    @Column(name = "criado_em", nullable = false)
    private LocalDateTime criadoEm;

    @PrePersist
    public void prePersist() {
        if (criadoEm == null) {
            criadoEm = LocalDateTime.now();
        }

        if (origem == null || origem.isBlank()) {
            origem = "ATENDIMENTO";
        }

        if (validoParaCalculo == null) {
            validoParaCalculo = true;
        }
    }
}
