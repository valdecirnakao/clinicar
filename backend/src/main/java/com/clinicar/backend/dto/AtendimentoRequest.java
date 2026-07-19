package com.clinicar.backend.dto;

import lombok.Data;

@Data
public class AtendimentoRequest {

    private Long idAgendamento;

    private Long idFornecedor;
    private Long idResponsavel;

    private String tipoExecucao;
    private String statusAtendimento;

    private String dataEntrada;
    private String inicioReal;
    private String fimReal;
    private String prazoEstimadoEntrega;
    private String dataEntrega;

    private Integer quilometragemEntrada;
    private Integer quilometragemSaida;

    private String relatoCliente;
    private String diagnosticoTecnico;
    private String servicoExecutado;
    private String observacoesInternas;
    private String recomendacoesCliente;

    private Boolean necessitaRetorno;
    private String dataRetornoSugerida;
    private Integer garantiaDias;

    private String valorMaoObra;
    private String valorPecas;
    private String valorTerceiros;
    private String desconto;

    private Boolean aprovado;
}