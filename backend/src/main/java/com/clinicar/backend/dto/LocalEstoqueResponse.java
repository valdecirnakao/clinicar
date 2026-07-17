package com.clinicar.backend.dto;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class LocalEstoqueResponse {

    private Long id;
    private String nome;
    private String descricao;
    private Boolean ativo;
    private LocalDateTime criadoEm;
    private LocalDateTime atualizadoEm;
}