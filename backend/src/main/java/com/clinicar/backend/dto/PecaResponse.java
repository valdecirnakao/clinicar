package com.clinicar.backend.dto;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class PecaResponse {

    private Long id;

    private String nome;
    private String descricao;
    private String tipo;
    private String origemOleo;

    private String especificacao;
    private String fabricante;
    private String modelo;
    private String norma;
    private String unidade;
    private String unidadeMedida;

    private String observacoes;

    private LocalDateTime criadoEm;
    private LocalDateTime atualizadoEm;
}
