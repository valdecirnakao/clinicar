package com.clinicar.backend.dto;

import lombok.Data;

@Data
public class FornecimentoServicoRequest {

    private Long idFornecedor;
    private Long idServico;

    private String valorCusto;
    private String unidadeCobranca;

    private String prazoExecucao;
    private String unidadePrazo;

    private Integer quantidadeMinima;

    private String disponibilidade;

    private String contratoReferencia;

    private String dataInicioVigencia;
    private String dataFimVigencia;

    private Boolean ativo;

    private String observacoes;
}