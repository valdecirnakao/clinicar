package com.clinicar.backend.dto;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
public class MovimentacaoEstoquePecaResponse {

    private Long id;

    private Long idEstoquePeca;
    private Long idPeca;
    private String nomePeca;

    private String tipoMovimento;

    private BigDecimal quantidade;

    private BigDecimal saldoAnterior;
    private BigDecimal saldoPosterior;

    private BigDecimal valorUnitario;
    private BigDecimal valorTotal;

    private String origem;
    private String documentoReferencia;
    private String motivo;
    private String observacoes;

    private Long idUsuario;

    private LocalDateTime criadoEm;
}