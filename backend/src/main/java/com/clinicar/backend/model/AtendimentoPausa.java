package com.clinicar.backend.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.LocalDateTime;

@Entity @Table(name = "atendimento_pausa")
@Getter @Setter
public class AtendimentoPausa {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(name = "atendimento_id", nullable = false) private Long atendimentoId;
    @Column(name = "autor_id", nullable = false) private Long autorId;
    @Column(nullable = false, length = 500) private String motivo;
    @Column(name = "pausado_em", nullable = false) private LocalDateTime pausadoEm;
    @Column(name = "retomado_em") private LocalDateTime retomadoEm;
    @Column(name = "retomado_por_id") private Long retomadoPorId;
}
