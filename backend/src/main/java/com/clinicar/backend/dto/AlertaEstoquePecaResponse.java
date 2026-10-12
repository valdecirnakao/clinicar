package com.clinicar.backend.dto;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
public class AlertaEstoquePecaResponse {


    private LocalDateTime reconhecidoEm;
    private Long idUsuarioReconhecimento;
    private String nomeUsuarioReconhecimento;
    private LocalDateTime encerradoEm;
    private Long idUsuarioEncerramento;
    private String nomeUsuarioEncerramento;
    private String justificativaEncerramento;
    private Boolean excecaoAtiva = false;

    private Long id;

    private Long idEstoquePeca;
    private Long idPeca;
    private String nomePeca;
    private String nomeLocalEstoque;

    private String nivelAlerta;
    private String statusAlerta;

    private BigDecimal quantidadeAtual;
    private BigDecimal estoqueMinimo;
    private BigDecimal estoqueCritico;

    private String mensagem;

    private Boolean whatsappEnviado;
    private LocalDateTime whatsappEnviadoEm;
    private String whatsappDestinatario;
    private String whatsappMessageId;

    private Integer tentativasEnvio;
    private LocalDateTime ultimaTentativaEm;
    private String ultimoErro;

    private LocalDateTime criadoEm;
    private LocalDateTime atualizadoEm;
}