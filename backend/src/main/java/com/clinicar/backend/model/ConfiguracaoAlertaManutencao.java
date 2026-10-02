package com.clinicar.backend.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "configuracao_alerta_manutencao")
@Getter @Setter
public class ConfiguracaoAlertaManutencao {
    @Id private Long id = 1L;
    @Version private Long versao;
    @NotNull @Column(nullable = false) private Boolean ativo = false;
    @NotNull @Min(0) @Max(365) @Column(nullable = false) private Integer antecedenciaDias = 15;
    @NotNull @Min(1) @Max(365) @Column(nullable = false) private Integer intervaloDias = 7;
    @NotNull @Min(1) @Max(100) @Column(nullable = false) private Integer maximoEnvios = 3;
    @NotNull @Min(0) @Max(365) @Column(nullable = false) private Integer diasAposVencimento = 30;
    @NotNull @Min(0) @Max(23) @Column(nullable = false) private Integer horaInicio = 9;
    @NotNull @Min(1) @Max(24) @Column(nullable = false) private Integer horaFim = 18;
    @NotBlank @Column(nullable = false, length = 60) private String fusoHorario = "America/Sao_Paulo";
}
