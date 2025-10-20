package com.clinicar.backend.dto;

import lombok.Data;

@Data
public class PecaRequest {
    private String nome;
    private String tipo;
    private String especificacao;
    private String fabricante;
    private String modelo;
    private String norma;
    private String unidade;
}
