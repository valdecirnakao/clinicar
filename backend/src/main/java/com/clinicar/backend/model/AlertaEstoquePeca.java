package com.clinicar.backend.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "alerta_estoque_peca")
@Getter
@Setter
public class AlertaEstoquePeca {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "id_estoque_peca", nullable = false)
    private EstoquePeca estoquePeca;

    @ManyToOne(optional = false)
    @JoinColumn(name = "id_peca", nullable = false)
    private Peca peca;

    @Column(name = "nivel_alerta", nullable = false, length = 30)
    private String nivelAlerta;

    @Column(name = "status_alerta", nullable = false, length = 30)
    private String statusAlerta = "ABERTO";

    @Column(name = "quantidade_atual", nullable = false, precision = 12, scale = 3)
    private BigDecimal quantidadeAtual;

    @Column(name = "estoque_minimo", nullable = false, precision = 12, scale = 3)
    private BigDecimal estoqueMinimo;

    @Column(name = "estoque_critico", nullable = false, precision = 12, scale = 3)
    private BigDecimal estoqueCritico;

    @Column(length = 1000)
    private String mensagem;

    @Column(name = "whatsapp_enviado", nullable = false)
    private Boolean whatsappEnviado = false;

    @Column(name = "whatsapp_enviado_em")
    private LocalDateTime whatsappEnviadoEm;

    @Column(name = "whatsapp_destinatario", length = 30)
    private String whatsappDestinatario;

    @Column(name = "whatsapp_message_id")
    private String whatsappMessageId;

    @Column(name = "tentativas_envio", nullable = false)
    private Integer tentativasEnvio = 0;

    @Column(name = "ultimo_erro", length = 1000)
    private String ultimoErro;

    @Column(name = "criado_em", nullable = false)
    private LocalDateTime criadoEm;

    @Column(name = "atualizado_em")
    private LocalDateTime atualizadoEm;

    @PrePersist
    public void prePersist() {
        if (criadoEm == null) {
            criadoEm = LocalDateTime.now();
        }

        aplicarDefaults();
    }

    @PreUpdate
    public void preUpdate() {
        atualizadoEm = LocalDateTime.now();

        aplicarDefaults();
    }

    private void aplicarDefaults() {
        if (statusAlerta == null || statusAlerta.isBlank()) {
            statusAlerta = "ABERTO";
        }

        if (whatsappEnviado == null) {
            whatsappEnviado = false;
        }

        if (tentativasEnvio == null) {
            tentativasEnvio = 0;
        }
    }
}