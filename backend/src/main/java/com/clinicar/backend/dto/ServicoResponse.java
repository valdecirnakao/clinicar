package com.clinicar.backend.dto;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
public class ServicoResponse {

    private Long id;

    private String nome;
    private String descricao;
    private String categoria;

    private String tipoDoPrestador;

    private BigDecimal duracaoEstimada;
    private String unidadeDuracao;

    private BigDecimal valorBase;
    private String unidadeCobranca;

    private Integer garantiaDias;
    private Boolean necessitaPecas;

    private Boolean ativo;

    private String observacoes;

    private Long idFornecedor;
    private String razaoSocialFornecedor;

    private LocalDateTime criadoEm;
    private LocalDateTime atualizadoEm;
}