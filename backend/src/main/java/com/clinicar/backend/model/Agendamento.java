package com.clinicar.backend.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(
        name = "agendamento",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_agendamento_codigo",
                        columnNames = "codigo_agendamento"
                )
        }
)
@Getter
@Setter
public class Agendamento {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", columnDefinition = "BIGINT UNSIGNED")
    private Long id;

    @Column(name = "codigo_agendamento", nullable = false, length = 40)
    private String codigoAgendamento;

    /*
     * Cliente também é um usuário do sistema.
     * A regra de negócio será validada no service pelo campo tipo_do_acesso.
     */
    @ManyToOne(optional = false)
    @JoinColumn(
            name = "id_cliente",
            nullable = false,
            columnDefinition = "BIGINT UNSIGNED"
    )
    private Usuario cliente;

    @ManyToOne(optional = false)
    @JoinColumn(
            name = "id_veiculo",
            nullable = false,
            columnDefinition = "BIGINT UNSIGNED"
    )
    private Veiculo veiculo;

    @ManyToOne(optional = false)
    @JoinColumn(
            name = "id_servico",
            nullable = false,
            columnDefinition = "BIGINT UNSIGNED"
    )
    private Servico servico;

    @ManyToOne
    @JoinColumn(
            name = "id_fornecedor",
            columnDefinition = "BIGINT UNSIGNED"
    )
    private Fornecedor fornecedor;

    /*
     * Responsável interno pelo atendimento.
     * Pode ser administrador ou colaborador.
     */
    @ManyToOne
    @JoinColumn(
            name = "id_responsavel",
            columnDefinition = "BIGINT UNSIGNED"
    )
    private Usuario responsavel;

    @Column(name = "data_hora_inicio", nullable = false)
    private LocalDateTime dataHoraInicio;

    @Column(name = "data_hora_fim", nullable = false)
    private LocalDateTime dataHoraFim;

    @Column(name = "duracao_estimada_minutos", nullable = false)
    private Integer duracaoEstimadaMinutos;

    @Column(name = "status_agendamento", nullable = false, length = 30)
    private String statusAgendamento = "AGENDADO";

    @Column(name = "canal_origem", nullable = false, length = 30)
    private String canalOrigem = "SISTEMA";

    @Column(nullable = false, length = 20)
    private String prioridade = "NORMAL";

    @Column(name = "tipo_atendimento", nullable = false, length = 40)
    private String tipoAtendimento = "PRESENCIAL";

    @Column(name = "quilometragem_atual")
    private Integer quilometragemAtual;

    @Column(name = "queixa_cliente", length = 1000)
    private String queixaCliente;

    @Column(name = "diagnostico_previo", length = 1000)
    private String diagnosticoPrevio;

    @Column(length = 1000)
    private String observacoes;

    @Column(name = "valor_estimado", precision = 10, scale = 2)
    private BigDecimal valorEstimado;

    @Column(name = "valor_final", precision = 10, scale = 2)
    private BigDecimal valorFinal;

    @Column(name = "requer_confirmacao", nullable = false)
    private Boolean requerConfirmacao = true;

    @Column(nullable = false)
    private Boolean confirmado = false;

    @Column(name = "confirmado_em")
    private LocalDateTime confirmadoEm;

    @Column(name = "lembrete_enviado", nullable = false)
    private Boolean lembreteEnviado = false;

    @Column(name = "lembrete_enviado_em")
    private LocalDateTime lembreteEnviadoEm;

    @Column(name = "cancelado_em")
    private LocalDateTime canceladoEm;

    @Column(name = "motivo_cancelamento", length = 500)
    private String motivoCancelamento;

    @Column(name = "criado_em", nullable = false)
    private LocalDateTime criadoEm;

    @Column(name = "atualizado_em")
    private LocalDateTime atualizadoEm;

    @PrePersist
    public void prePersist() {
        if (criadoEm == null) {
            criadoEm = LocalDateTime.now();
        }

        aplicarDefaults();
    }

    @PreUpdate
    public void preUpdate() {
        atualizadoEm = LocalDateTime.now();

        aplicarDefaults();
    }

    private void aplicarDefaults() {
        if (statusAgendamento == null || statusAgendamento.isBlank()) {
            statusAgendamento = "AGENDADO";
        }

        if (canalOrigem == null || canalOrigem.isBlank()) {
            canalOrigem = "SISTEMA";
        }

        if (prioridade == null || prioridade.isBlank()) {
            prioridade = "NORMAL";
        }

        if (tipoAtendimento == null || tipoAtendimento.isBlank()) {
            tipoAtendimento = "PRESENCIAL";
        }

        if (requerConfirmacao == null) {
            requerConfirmacao = true;
        }

        if (confirmado == null) {
            confirmado = false;
        }

        if (lembreteEnviado == null) {
            lembreteEnviado = false;
        }
    }
}