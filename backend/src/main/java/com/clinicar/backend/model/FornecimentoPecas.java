package com.clinicar.backend.model;

import java.math.BigDecimal;
import java.time.LocalDate;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "fornecimento_pecas")
@Getter
@Setter
public class FornecimentoPecas {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // RELACIONAMENTO COM FORNECEDOR
    @ManyToOne
    @JoinColumn(name = "id_fornecedor", nullable = false)
    private Fornecedor fornecedor;

    // RELACIONAMENTO COM PECA
    @ManyToOne
    @JoinColumn(name = "id_peca", nullable = false)
    private Peca peca;

    private BigDecimal valorCusto;

    private Integer prazoEntregaDias;

    private Integer quantidadeMinima;

    private Boolean ativo;

    private LocalDate dataCadastro;
}