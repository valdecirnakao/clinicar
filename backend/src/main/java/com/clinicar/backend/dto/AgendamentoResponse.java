package com.clinicar.backend.dto;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
public class AgendamentoResponse {

    private Long id;
    private String codigoAgendamento;

    private Long idCliente;
    private String nomeCliente;
    private String cpfCliente;
    private String telefoneCliente;
    private String emailCliente;
    private String tipoAcessoCliente;

    private Long idVeiculo;
    private String placaVeiculo;
    private String fabricanteVeiculo;
    private String modeloVeiculo;

    private Long idServico;
    private String nomeServico;
    private String categoriaServico;

    private Long idFornecedor;
    private String razaoSocialFornecedor;

    private Long idResponsavel;
    private String nomeResponsavel;
    private String tipoAcessoResponsavel;

    private LocalDateTime dataHoraInicio;
    private LocalDateTime dataHoraFim;
    private Integer duracaoEstimadaMinutos;

    private String statusAgendamento;
    private String canalOrigem;
    private String prioridade;
    private String tipoAtendimento;

    private Integer quilometragemAtual;

    private String queixaCliente;
    private String diagnosticoPrevio;
    private String observacoes;

    private BigDecimal valorEstimado;
    private BigDecimal valorFinal;

    private Boolean requerConfirmacao;
    private Boolean confirmado;
    private LocalDateTime confirmadoEm;

    private Boolean lembreteEnviado;
    private LocalDateTime lembreteEnviadoEm;

    private LocalDateTime canceladoEm;
    private String motivoCancelamento;

    private LocalDateTime criadoEm;
    private LocalDateTime atualizadoEm;
}