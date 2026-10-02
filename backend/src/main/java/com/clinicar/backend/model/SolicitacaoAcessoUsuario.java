package com.clinicar.backend.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "solicitacao_acesso_usuario", indexes = {
    @Index(name = "idx_solicitacao_acesso_status_data", columnList = "status,solicitado_em"),
    @Index(name = "idx_solicitacao_acesso_usuario_data", columnList = "usuario_id,solicitado_em")})
@Getter @Setter
public class SolicitacaoAcessoUsuario {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(name = "usuario_id", nullable = false, updatable = false) private Long usuarioId;
    @Column(name = "usuario_nome", nullable = false, updatable = false) private String usuarioNome;
    @Column(name = "usuario_email", nullable = false, updatable = false) private String usuarioEmail;
    @Column(name = "usuario_perfil", nullable = false, length = 30, updatable = false) private String usuarioPerfil;
    @Column(nullable = false, length = 30, updatable = false) private String tipo;
    @Column(nullable = false, length = 1000, updatable = false) private String justificativa;
    @Column(nullable = false, length = 30) private String status;
    // UNIQUE permite histórico, mas somente uma solicitação pendente por usuário.
    @Column(name = "pendencia_usuario_id", unique = true) private Long pendenciaUsuarioId;
    @Column(name = "solicitado_em", nullable = false, updatable = false, columnDefinition = "TIMESTAMP(6)") private Instant solicitadoEm;
    @Column(name = "administrador_id") private Long administradorId;
    @Column(name = "administrador_nome") private String administradorNome;
    @Column(name = "motivo_decisao", length = 1000) private String motivoDecisao;
    @Column(name = "decidido_em", columnDefinition = "TIMESTAMP(6)") private Instant decididoEm;
    @Column(name="inicio_periodo", updatable=false) private LocalDate inicioPeriodo;
    @Column(name="fim_periodo", updatable=false) private LocalDate fimPeriodo;
    @Column(name="situacao_periodo", length=30) private String situacaoPeriodo;
    @Column(name="inativado_em", columnDefinition="TIMESTAMP(6)") private Instant inativadoEm;
    @Column(name="reativado_em", columnDefinition="TIMESTAMP(6)") private Instant reativadoEm;
    @Column(name="interrompido_em", columnDefinition="TIMESTAMP(6)") private Instant interrompidoEm;
}
