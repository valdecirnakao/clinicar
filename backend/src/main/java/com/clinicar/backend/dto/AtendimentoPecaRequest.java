package com.clinicar.backend.dto;

import lombok.Data;

@Data
public class AtendimentoPecaRequest {

    private Long idPeca;
    private Long idEstoquePeca;
    private Long idFornecedor;

    private String quantidade;
    private String valorUnitario;

    private String unidadeMedida;
    private String observacoes;
}