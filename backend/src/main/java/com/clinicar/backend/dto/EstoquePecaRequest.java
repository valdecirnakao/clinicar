package com.clinicar.backend.dto;

import lombok.Data;

@Data
public class EstoquePecaRequest {

    private Long idPeca;
    private Long idLocalEstoque;

    private String quantidadeAtual;
    private String quantidadeReservada;

    private String estoqueMinimo;
    private String estoqueCritico;
    private String estoqueMaximo;

    private String pontoReposicao;
    private String quantidadeReposicaoSugerida;

    private String custoMedio;
    private String localizacaoFisica;

    private Boolean ativo;
}