package com.clinicar.backend.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import com.clinicar.backend.model.enums.EstadoSetup;
import java.time.LocalDateTime;

@Entity
@Table(name = "configuracao_sistema")
@Getter
@Setter
public class ConfiguracaoSistema {

    @Id
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(name = "estado_setup", nullable = false, length = 40)
    private EstadoSetup estadoSetup;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "administrador_inicial_id")
    private Usuario administradorInicial;

    @Column(name = "setup_iniciado_em")
    private LocalDateTime setupIniciadoEm;

    @Column(name = "setup_concluido_em")
    private LocalDateTime setupConcluidoEm;

    @Column(name = "atualizado_em")
    private LocalDateTime atualizadoEm;
}