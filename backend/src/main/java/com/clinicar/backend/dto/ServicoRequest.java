package com.clinicar.backend.dto;

import lombok.Data;

@Data
public class ServicoRequest {

    private String nome;
    private String descricao;
    private String categoria;

    private String tipoDoPrestador;

    private String duracaoEstimada;
    private String unidadeDuracao;

    private String valorBase;
    private String unidadeCobranca;

    private Integer garantiaDias;
    private Boolean necessitaPecas;
    private String materiaisReferencia;

    private Boolean ativo;

    private String observacoes;

    private Long idFornecedor;
}
