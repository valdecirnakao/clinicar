package com.clinicar.backend.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.Instant;

/** Retrato da exclusão, independente do cadastro removido. */
@Entity
@Table(name = "auditoria_exclusao_usuario", indexes = {
        @Index(name = "idx_exclusao_usuario_data", columnList = "usuario_id,realizado_em"),
        @Index(name = "idx_exclusao_admin_data", columnList = "administrador_id,realizado_em")})
@Getter @Setter
public class AuditoriaExclusaoUsuario {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "usuario_id", nullable = false, updatable = false)
    private Long usuarioId;
    @Column(name = "usuario_nome", nullable = false, updatable = false)
    private String usuarioNome;
    @Column(name = "administrador_id", nullable = false, updatable = false)
    private Long administradorId;
    @Column(name = "administrador_nome", nullable = false, updatable = false)
    private String administradorNome;
    @Column(nullable = false, length = 1000, updatable = false)
    private String justificativa;
    @Column(name = "realizado_em", nullable = false, updatable = false, columnDefinition = "TIMESTAMP(6)")
    private Instant realizadoEm;
}
