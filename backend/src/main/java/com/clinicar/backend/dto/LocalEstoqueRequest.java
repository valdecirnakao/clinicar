package com.clinicar.backend.dto;

import lombok.Data;

@Data
public class LocalEstoqueRequest {

    private String nome;
    private String descricao;
    private Boolean ativo;
}