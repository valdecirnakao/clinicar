package com.clinicar.backend.dto;

import lombok.Data;

import java.util.List;

@Data
public class AgendamentoRequest {

    private Long idCliente;
    private Long idVeiculo;
    private Long idServico;

    private Long idFornecedor;
    private Long idResponsavel;

    private String dataHoraInicio;
    private String dataHoraFim;

    private Integer duracaoEstimadaMinutos;

    private String statusAgendamento;

    private String canalOrigem;
    private String prioridade;
    private String tipoAtendimento;

    private Integer quilometragemAtual;

    private String queixaCliente;
    private String diagnosticoPrevio;
    private String observacoes;

    private String valorEstimado;
    private String valorFinal;

    private Boolean requerConfirmacao;
    private Boolean confirmado;

    private List<AgendamentoPecaPrevistaRequest> pecasPrevistas;
}