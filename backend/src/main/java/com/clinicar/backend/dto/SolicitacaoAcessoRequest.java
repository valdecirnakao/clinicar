package com.clinicar.backend.dto;
public record SolicitacaoAcessoRequest(String tipo, String justificativa, java.time.LocalDate inicioPeriodo, java.time.LocalDate fimPeriodo) {
    public SolicitacaoAcessoRequest(String tipo, String justificativa) { this(tipo, justificativa, null, null); }
}
