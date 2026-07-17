package com.clinicar.backend.dto;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
public class FornecimentoServicoResponse {

    private Long id;

    private Long idFornecedor;
    private String razaoSocialFornecedor;
    private String cnpjFornecedor;

    private Long idServico;
    private String nomeServico;
    private String categoriaServico;

    private BigDecimal valorCusto;
    private String unidadeCobranca;

    private BigDecimal prazoExecucao;
    private String unidadePrazo;

    private Integer quantidadeMinima;

    private String disponibilidade;

    private String contratoReferencia;

    private LocalDate dataInicioVigencia;
    private LocalDate dataFimVigencia;

    private Boolean ativo;

    private String observacoes;

    private LocalDateTime criadoEm;
    private LocalDateTime atualizadoEm;
}