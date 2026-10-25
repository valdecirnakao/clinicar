package com.clinicar.backend.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "atendimento_orcamento")
@Getter @Setter
public class AtendimentoOrcamento {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(columnDefinition = "BIGINT UNSIGNED") private Long id;
    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "id_atendimento", nullable = false, columnDefinition = "BIGINT UNSIGNED")
    private Atendimento atendimento;
    @Column(nullable = false) private Integer versao;
    @Column(nullable = false, length = 20) private String status;
    @Column(name = "codigo_atendimento", nullable = false, length = 40) private String codigoAtendimento;
    @Column(nullable = false, length = 20) private String placa;
    @Column(nullable = false) private String servico;
    @Column(nullable = false, columnDefinition = "TEXT") private String diagnostico;
    @Column(nullable = false, columnDefinition = "TEXT") private String itens;
    @Column(name = "valor_mao_obra", nullable = false, precision = 10, scale = 2) private BigDecimal valorMaoObra;
    @Column(name = "valor_pecas", nullable = false, precision = 10, scale = 2) private BigDecimal valorPecas;
    @Column(name = "valor_terceiros", nullable = false, precision = 10, scale = 2) private BigDecimal valorTerceiros;
    @Column(nullable = false, precision = 10, scale = 2) private BigDecimal desconto;
    @Column(name = "valor_total", nullable = false, precision = 10, scale = 2) private BigDecimal valorTotal;
    @Column(name = "prazo_estimado_entrega") private LocalDateTime prazoEstimadoEntrega;
    @Column(name = "assinatura_conteudo", nullable = false, length = 64) private String assinaturaConteudo;
    @Column(name = "criado_em", nullable = false) private LocalDateTime criadoEm;
    @Column(name = "decidido_em") private LocalDateTime decididoEm;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_decisor", columnDefinition = "BIGINT UNSIGNED") private Usuario decisor;
}
