package com.clinicar.backend.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "configuracao_alerta_estoque")
@Getter
@Setter
public class ConfiguracaoAlertaEstoque {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Boolean ativo = true;

    @Column(name = "telefone_administrador", nullable = false, length = 30)
    private String telefoneAdministrador;

    @Column(name = "template_whatsapp", nullable = false, length = 120)
    private String templateWhatsapp = "alerta_estoque_peca";

    @Column(name = "idioma_template", nullable = false, length = 20)
    private String idiomaTemplate = "pt_BR";

    @Column(name = "reenviar_alerta_apos_horas", nullable = false)
    private Integer reenviarAlertaAposHoras = 24;

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
        if (ativo == null) {
            ativo = true;
        }

        if (templateWhatsapp == null || templateWhatsapp.isBlank()) {
            templateWhatsapp = "alerta_estoque_peca";
        }

        if (idiomaTemplate == null || idiomaTemplate.isBlank()) {
            idiomaTemplate = "pt_BR";
        }

        if (reenviarAlertaAposHoras == null || reenviarAlertaAposHoras <= 0) {
            reenviarAlertaAposHoras = 24;
        }
    }
}