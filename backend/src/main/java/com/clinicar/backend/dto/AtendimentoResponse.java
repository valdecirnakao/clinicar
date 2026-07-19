package com.clinicar.backend.dto;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
public class AtendimentoResponse {

    private Long id;
    private String codigoAtendimento;

    private Long idAgendamento;
    private String codigoAgendamento;

    private Long idCliente;
    private String nomeCliente;
    private String cpfCliente;
    private String telefoneCliente;
    private String emailCliente;

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

    private String tipoExecucao;
    private String statusAtendimento;

    private LocalDateTime dataEntrada;
    private LocalDateTime inicioReal;
    private LocalDateTime fimReal;
    private LocalDateTime prazoEstimadoEntrega;
    private LocalDateTime dataEntrega;

    private Integer quilometragemEntrada;
    private Integer quilometragemSaida;

    private String relatoCliente;
    private String diagnosticoTecnico;
    private String servicoExecutado;
    private String observacoesInternas;
    private String recomendacoesCliente;

    private Boolean necessitaRetorno;
    private LocalDateTime dataRetornoSugerida;
    private Integer garantiaDias;

    private BigDecimal valorMaoObra;
    private BigDecimal valorPecas;
    private BigDecimal valorTerceiros;
    private BigDecimal desconto;
    private BigDecimal valorTotal;

    private Boolean aprovado;
    private LocalDateTime aprovadoEm;

    private LocalDateTime finalizadoEm;

    private LocalDateTime canceladoEm;
    private String motivoCancelamento;

    private LocalDateTime criadoEm;
    private LocalDateTime atualizadoEm;
}