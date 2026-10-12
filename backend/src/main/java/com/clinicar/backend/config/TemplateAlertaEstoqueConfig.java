package com.clinicar.backend.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/** Configuração técnica do servidor, independente dos dados enviados pela interface. */
@Component
public record TemplateAlertaEstoqueConfig(String nome, String idioma) {
    public TemplateAlertaEstoqueConfig(
            @Value("${clinicar.estoque.alerta.template:alerta_estoque_peca}") String nome,
            @Value("${clinicar.estoque.alerta.idioma:pt_BR}") String idioma) {
        if (nome == null || !nome.matches("[a-z0-9_]{1,120}"))
            throw new IllegalArgumentException("Template de estoque inválido na configuração do servidor.");
        if (idioma == null || !idioma.matches("[a-z]{2}(_[A-Z]{2})?"))
            throw new IllegalArgumentException("Idioma do template de estoque inválido na configuração do servidor.");
        this.nome = nome;
        this.idioma = idioma;
    }
}
