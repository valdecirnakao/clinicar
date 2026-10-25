package com.clinicar.backend.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.LocalDateTime;

@Entity @Table(name = "atendimento_checklist", uniqueConstraints = @UniqueConstraint(name = "uk_checklist_atendimento_item", columnNames = {"atendimento_id", "item"}))
@Getter @Setter
public class AtendimentoChecklist {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(name = "atendimento_id", nullable = false) private Long atendimentoId;
    @Column(name = "autor_id", nullable = false) private Long autorId;
    @Column(nullable = false, length = 120) private String item;
    @Column(nullable = false, length = 20) private String situacao;
    @Column(length = 500) private String observacao;
    @Column(name = "registrado_em", nullable = false) private LocalDateTime registradoEm;
    @Column(name = "atualizado_em", nullable = false) private LocalDateTime atualizadoEm;
    @PrePersist void criar() { registradoEm = LocalDateTime.now(); atualizadoEm = registradoEm; }
    @PreUpdate void alterar() { atualizadoEm = LocalDateTime.now(); }
}
