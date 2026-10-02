package com.clinicar.backend.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.Instant;

@Entity
@Table(name = "envio_alerta_manutencao", indexes = {
    @Index(name = "idx_envio_previsao", columnList = "previsao_id, criado_em")
})
@Getter @Setter
public class EnvioAlertaManutencao {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false) private Long previsaoId;
    @Column(nullable = false) private Long proprietarioId;
    @Column(nullable = false, length = 254) private String destinatario;
    @Column(nullable = false, length = 30) private String status;
    @Column(nullable = false) private Instant criadoEm;
    private Instant finalizadoEm;
    @Column(length = 300) private String detalhe;
}
