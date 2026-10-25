package com.clinicar.backend.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.LocalDateTime;

@Entity
@Table(name = "permissao_colaborador")
@Getter @Setter
public class PermissaoColaborador {
    @Id @Column(name = "usuario_id") private Long usuarioId;
    @Column(name = "pode_mecanica", nullable = false) private Boolean podeMecanica = true;
    @Column(name = "pode_estoque", nullable = false) private Boolean podeEstoque = true;
    @Column(name = "atualizado_em", nullable = false) private LocalDateTime atualizadoEm;
    @PrePersist @PreUpdate void data() { atualizadoEm = LocalDateTime.now(); }
}
