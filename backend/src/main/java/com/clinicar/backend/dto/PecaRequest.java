package com.clinicar.backend.dto;

import lombok.Data;

@Data
public class PecaRequest {
    private String nome;
    private String descricao;
    private String tipo;
    private String origemOleo;
    private String especificacao;
    private String fabricante;
    private String modelo;
    private String norma;
    private String unidade;
    private String observacoes;
}
