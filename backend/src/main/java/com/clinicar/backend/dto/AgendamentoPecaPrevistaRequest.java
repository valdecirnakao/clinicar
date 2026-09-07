package com.clinicar.backend.dto;

import lombok.Data;

@Data
public class AgendamentoPecaPrevistaRequest {

    private Long idPeca;

    private Long idEstoquePeca;

    private Long idFornecedor;

    private String quantidade;

    private String unidadeMedida;

    private String valorUnitario;

    private String observacoes;
}