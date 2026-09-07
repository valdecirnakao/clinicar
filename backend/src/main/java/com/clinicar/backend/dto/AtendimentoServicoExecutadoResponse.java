package com.clinicar.backend.dto;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * DTO de saída para serviços executados em um atendimento.
 *
 * Observação:
 * - valorMaoObra representa o valor unitário da mão de obra do serviço.
 * - valorTotal representa o total calculado do item:
 *   quantidade * valorMaoObra + valorTerceiro - desconto.
 */
@Data
public class AtendimentoServicoExecutadoResponse {

    private Long id;

    private Long idAtendimento;
    private String codigoAtendimento;

    private Long idServico;
    private String nomeServico;
    private String categoriaServico;

    private Long idResponsavel;
    private String nomeResponsavel;

    private Long idFornecedor;
    private String razaoSocialFornecedor;

    private String tipoExecucao;

    private BigDecimal quantidade;
    private String unidadeCobranca;

    private BigDecimal tempoExecucao;
    private String unidadeTempo;

    private BigDecimal valorMaoObra;
    private BigDecimal valorTerceiro;
    private BigDecimal desconto;
    private BigDecimal valorTotal;

    private String statusItem;
    private String observacoes;

    private LocalDateTime criadoEm;
    private LocalDateTime atualizadoEm;
}