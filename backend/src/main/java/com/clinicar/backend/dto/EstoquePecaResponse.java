package com.clinicar.backend.dto;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
public class EstoquePecaResponse {

    private Long id;

    private Long idPeca;
    private String nomePeca;
    private String fabricantePeca;
    private String modeloPeca;
    private String unidadePeca;

    private Long idLocalEstoque;
    private String nomeLocalEstoque;

    private BigDecimal quantidadeAtual;
    private BigDecimal quantidadeReservada;

    private BigDecimal estoqueMinimo;
    private BigDecimal estoqueCritico;
    private BigDecimal estoqueMaximo;

    private BigDecimal pontoReposicao;
    private BigDecimal quantidadeReposicaoSugerida;

    private BigDecimal custoMedio;
    private String localizacaoFisica;

    private String statusEstoque;
    private Boolean ativo;

    private LocalDateTime criadoEm;
    private LocalDateTime atualizadoEm;
}