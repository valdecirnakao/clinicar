package com.clinicar.backend.dto;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
public class AtendimentoPecaResponse {

    private Long id;

    private Long idAtendimento;
    private String codigoAtendimento;

    private Long idPeca;
    private String nomePeca;

    private Long idEstoquePeca;

    private Long idFornecedor;
    private String razaoSocialFornecedor;

    private BigDecimal quantidade;
    private BigDecimal valorUnitario;
    private BigDecimal valorTotal;

    private String unidadeMedida;
    private String observacoes;

    private LocalDateTime criadoEm;
    private LocalDateTime atualizadoEm;
}