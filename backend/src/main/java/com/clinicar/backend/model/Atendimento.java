package com.clinicar.backend.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(
        name = "atendimento",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_atendimento_codigo",
                        columnNames = "codigo_atendimento"
                ),
                @UniqueConstraint(
                        name = "uk_atendimento_agendamento",
                        columnNames = "id_agendamento"
                )
        }
)
@Getter
@Setter
public class Atendimento {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", columnDefinition = "BIGINT UNSIGNED")
    private Long id;

    @Column(name = "codigo_atendimento", nullable = false, length = 40)
    private String codigoAtendimento;

    @OneToOne(optional = false)
    @JoinColumn(
            name = "id_agendamento",
            nullable = false,
            columnDefinition = "BIGINT UNSIGNED"
    )
    private Agendamento agendamento;

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

    @ManyToOne
    @JoinColumn(
            name = "id_responsavel",
            columnDefinition = "BIGINT UNSIGNED"
    )
    private Usuario responsavel;

    @Column(name = "tipo_execucao", nullable = false, length = 30)
    private String tipoExecucao = "INTERNO";

    @Column(name = "status_atendimento", nullable = false, length = 40)
    private String statusAtendimento = "ABERTO";

    @Column(name = "data_entrada")
    private LocalDateTime dataEntrada;

    @Column(name = "inicio_real")
    private LocalDateTime inicioReal;

    @Column(name = "fim_real")
    private LocalDateTime fimReal;

    @Column(name = "prazo_estimado_entrega")
    private LocalDateTime prazoEstimadoEntrega;

    @Column(name = "data_entrega")
    private LocalDateTime dataEntrega;

    @Column(name = "quilometragem_entrada")
    private Integer quilometragemEntrada;

    @Column(name = "quilometragem_saida")
    private Integer quilometragemSaida;

    @Column(name = "relato_cliente", length = 1000)
    private String relatoCliente;

    @Column(name = "diagnostico_tecnico", length = 2000)
    private String diagnosticoTecnico;

    @Column(name = "servico_executado", length = 2000)
    private String servicoExecutado;

    @Column(name = "observacoes_internas", length = 1000)
    private String observacoesInternas;

    @Column(name = "recomendacoes_cliente", length = 1000)
    private String recomendacoesCliente;

    @Column(name = "necessita_retorno", nullable = false)
    private Boolean necessitaRetorno = false;

    @Column(name = "data_retorno_sugerida")
    private LocalDateTime dataRetornoSugerida;

    @Column(name = "garantia_dias", nullable = false)
    private Integer garantiaDias = 0;

    @Column(name = "valor_mao_obra", nullable = false, precision = 10, scale = 2)
    private BigDecimal valorMaoObra = BigDecimal.ZERO;

    @Column(name = "valor_pecas", nullable = false, precision = 10, scale = 2)
    private BigDecimal valorPecas = BigDecimal.ZERO;

    @Column(name = "valor_terceiros", nullable = false, precision = 10, scale = 2)
    private BigDecimal valorTerceiros = BigDecimal.ZERO;

    @Column(name = "desconto", nullable = false, precision = 10, scale = 2)
    private BigDecimal desconto = BigDecimal.ZERO;

    @Column(name = "valor_total", nullable = false, precision = 10, scale = 2)
    private BigDecimal valorTotal = BigDecimal.ZERO;

    @Column(nullable = false)
    private Boolean aprovado = false;

    @Column(name = "aprovado_em")
    private LocalDateTime aprovadoEm;

    @Column(name = "finalizado_em")
    private LocalDateTime finalizadoEm;

    @Column(name = "cancelado_em")
    private LocalDateTime canceladoEm;

    @Column(name = "motivo_cancelamento", length = 500)
    private String motivoCancelamento;

    @Column(name = "os_pdf_gerada_em")
    private LocalDateTime osPdfGeradaEm;

    @Column(name = "os_enviada_email", nullable = false)
    private Boolean osEnviadaEmail = false;

    @Column(name = "os_enviada_email_em")
    private LocalDateTime osEnviadaEmailEm;

    @Column(name = "os_email_destino", length = 255)
    private String osEmailDestino;

    @Column(name = "os_ultimo_erro", length = 1000)
    private String osUltimoErro;

    @Column(name = "criado_em", nullable = false)
    private LocalDateTime criadoEm;

    @Column(name = "atualizado_em")
    private LocalDateTime atualizadoEm;


    @Column(name = "estoque_baixado", nullable = false)
    private Boolean estoqueBaixado = false;

    @Column(name = "estoque_baixado_em")
    private LocalDateTime estoqueBaixadoEm;

    @PrePersist
    public void prePersist() {
        if (criadoEm == null) {
            criadoEm = LocalDateTime.now();
        }

        aplicarDefaults();
        recalcularValorTotal();
    }

    @PreUpdate
    public void preUpdate() {
        atualizadoEm = LocalDateTime.now();

        aplicarDefaults();
        recalcularValorTotal();
    }

    private void aplicarDefaults() {

        if (osEnviadaEmail == null) {
            osEnviadaEmail = false;
        }

        if (tipoExecucao == null || tipoExecucao.isBlank()) {
            tipoExecucao = "INTERNO";
        }

        if (statusAtendimento == null || statusAtendimento.isBlank()) {
            statusAtendimento = "ABERTO";
        }

        if (necessitaRetorno == null) {
            necessitaRetorno = false;
        }

        if (garantiaDias == null) {
            garantiaDias = 0;
        }

        if (valorMaoObra == null) {
            valorMaoObra = BigDecimal.ZERO;
        }

        if (valorPecas == null) {
            valorPecas = BigDecimal.ZERO;
        }

        if (valorTerceiros == null) {
            valorTerceiros = BigDecimal.ZERO;
        }

        if (desconto == null) {
            desconto = BigDecimal.ZERO;
        }

        if (aprovado == null) {
            aprovado = false;
        }
    }

    private void recalcularValorTotal() {
        BigDecimal total = valorMaoObra
                .add(valorPecas)
                .add(valorTerceiros)
                .subtract(desconto);

        if (total.compareTo(BigDecimal.ZERO) < 0) {
            total = BigDecimal.ZERO;
        }

        valorTotal = total;
    }
}