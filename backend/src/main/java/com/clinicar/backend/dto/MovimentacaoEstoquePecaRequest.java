package com.clinicar.backend.dto;

import lombok.Data;

@Data
public class MovimentacaoEstoquePecaRequest {

    private String tipoMovimento;

    private String quantidade;

    private String valorUnitario;
    private Long idMovimentacaoOrigem;
    private Long idFornecedor;

    private String origem;
    private String documentoReferencia;
    private String motivo;
    private String observacoes;

    private Long idUsuario;
    private String tratamentoCobranca;
    private String valorRestituicao;
}
