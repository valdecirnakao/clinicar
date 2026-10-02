package com.clinicar.backend.service;

import java.time.LocalDateTime;

public class TokenRedefinicaoUtilizadoException extends IllegalArgumentException {
    private final LocalDateTime utilizadoEm;
    public TokenRedefinicaoUtilizadoException(LocalDateTime utilizadoEm) {
        super("Token já utilizado.");
        this.utilizadoEm = utilizadoEm;
    }
    public LocalDateTime getUtilizadoEm() { return utilizadoEm; }
}
