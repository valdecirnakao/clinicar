package com.clinicar.backend.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.Instant;

@Entity
@Table(name = "solicitacao_correcao_veiculo")
@Getter @Setter
public class SolicitacaoCorrecaoVeiculo {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "veiculo_id", nullable = false, updatable = false) private Long veiculoId;
    @Column(name = "cliente_id", nullable = false, updatable = false) private Long clienteId;
    @Column(name = "pendencia_veiculo_id", unique = true) private Long pendenciaVeiculoId;
    @Column(name = "placa_anterior", nullable = false, updatable = false) private String placaAnterior;
    @Column(name = "fabricante_anterior", nullable = false, updatable = false) private String fabricanteAnterior;
    @Column(name = "modelo_anterior", nullable = false, updatable = false) private String modeloAnterior;
    @Column(name = "ano_modelo_combustivel_anterior", nullable = false, updatable = false) private String anoModeloCombustivelAnterior;
    @Column(name = "placa_solicitada", nullable = false, updatable = false) private String placaSolicitada;
    @Column(name = "fabricante_solicitado", nullable = false, updatable = false) private String fabricanteSolicitado;
    @Column(name = "modelo_solicitado", nullable = false, updatable = false) private String modeloSolicitado;
    @Column(name = "ano_modelo_combustivel_solicitado", nullable = false, updatable = false) private String anoModeloCombustivelSolicitado;
    @Column(nullable = false, length = 1000, updatable = false) private String justificativa;
    @Column(nullable = false, length = 20) private String status;
    @Column(name = "solicitado_em", nullable = false, updatable = false, columnDefinition = "TIMESTAMP(6)") private Instant solicitadoEm;
    @Column(name = "administrador_id") private Long administradorId;
    @Column(name = "motivo_decisao", length = 1000) private String motivoDecisao;
    @Column(name = "decidido_em", columnDefinition = "TIMESTAMP(6)") private Instant decididoEm;
}
