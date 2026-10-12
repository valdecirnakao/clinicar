package com.clinicar.backend.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.Instant;

/** Registro independente e imutável dos acessos à auditoria. */
@Entity @Table(name = "auditoria_consulta", indexes={
    @Index(name="idx_auditoria_consulta_data",columnList="realizado_em"),
    @Index(name="idx_auditoria_consulta_usuario",columnList="usuario_id,realizado_em")}) @Getter @Setter
public class AuditoriaConsulta {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(name="usuario_id", nullable=false, updatable=false) private Long usuarioId;
    @Column(name="usuario_nome", nullable=false, updatable=false) private String usuarioNome;
    @Column(nullable=false, length=30, updatable=false) private String operacao;
    @Column(nullable=false, length=1000, updatable=false) private String descricao;
    @Column(name="realizado_em", nullable=false, updatable=false, columnDefinition="TIMESTAMP(6)") private Instant realizadoEm;
}
