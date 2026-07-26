package com.clinicar.backend.dto;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

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