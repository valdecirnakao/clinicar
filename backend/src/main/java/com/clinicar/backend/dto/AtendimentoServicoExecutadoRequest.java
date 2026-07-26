package com.clinicar.backend.dto;

import lombok.Data;

@Data
public class AtendimentoServicoExecutadoRequest {

    private Long idServico;

    private Long idResponsavel;
    private Long idFornecedor;

    private String tipoExecucao;

    private String quantidade;
    private String unidadeCobranca;

    private String tempoExecucao;
    private String unidadeTempo;

    private String valorMaoObra;
    private String valorTerceiro;
    private String desconto;

    private String statusItem;
    private String observacoes;
}