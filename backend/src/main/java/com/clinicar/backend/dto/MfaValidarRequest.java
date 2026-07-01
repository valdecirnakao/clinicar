package com.clinicar.backend.dto;

public class MfaValidarRequest {

    private String mfaToken;
    private String codigo;

    public String getMfaToken() {
        return mfaToken;
    }

    public void setMfaToken(String mfaToken) {
        this.mfaToken = mfaToken;
    }

    public String getCodigo() {
        return codigo;
    }

    public void setCodigo(String codigo) {
        this.codigo = codigo;
    }
}