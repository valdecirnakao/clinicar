package com.clinicar.backend.dto;

import com.clinicar.backend.model.Usuario;

public class LoginResponse {

    private Boolean autenticado;
    private Boolean mfaRequerido;
    private Boolean mfaSetupNecessario;

    private String mfaToken;
    private String qrCodeDataUrl;
    private String chaveManual;
    private String mensagem;

    private Usuario usuario;

    public static LoginResponse mfaLogin(String mfaToken) {
        LoginResponse response = new LoginResponse();

        response.setAutenticado(false);
        response.setMfaRequerido(true);
        response.setMfaSetupNecessario(false);
        response.setMfaToken(mfaToken);
        response.setMensagem("Informe o código do aplicativo autenticador.");

        return response;
    }

    public static LoginResponse mfaSetup(
            String mfaToken,
            String qrCodeDataUrl,
            String chaveManual
    ) {
        LoginResponse response = new LoginResponse();

        response.setAutenticado(false);
        response.setMfaRequerido(true);
        response.setMfaSetupNecessario(true);
        response.setMfaToken(mfaToken);
        response.setQrCodeDataUrl(qrCodeDataUrl);
        response.setChaveManual(chaveManual);
        response.setMensagem("Configure a autenticação em duas etapas no seu aplicativo autenticador.");

        return response;
    }

    public Boolean getAutenticado() {
        return autenticado;
    }

    public void setAutenticado(Boolean autenticado) {
        this.autenticado = autenticado;
    }

    public Boolean getMfaRequerido() {
        return mfaRequerido;
    }

    public void setMfaRequerido(Boolean mfaRequerido) {
        this.mfaRequerido = mfaRequerido;
    }

    public Boolean getMfaSetupNecessario() {
        return mfaSetupNecessario;
    }

    public void setMfaSetupNecessario(Boolean mfaSetupNecessario) {
        this.mfaSetupNecessario = mfaSetupNecessario;
    }

    public String getMfaToken() {
        return mfaToken;
    }

    public void setMfaToken(String mfaToken) {
        this.mfaToken = mfaToken;
    }

    public String getQrCodeDataUrl() {
        return qrCodeDataUrl;
    }

    public void setQrCodeDataUrl(String qrCodeDataUrl) {
        this.qrCodeDataUrl = qrCodeDataUrl;
    }

    public String getChaveManual() {
        return chaveManual;
    }

    public void setChaveManual(String chaveManual) {
        this.chaveManual = chaveManual;
    }

    public String getMensagem() {
        return mensagem;
    }

    public void setMensagem(String mensagem) {
        this.mensagem = mensagem;
    }

    public Usuario getUsuario() {
        return usuario;
    }

    public void setUsuario(Usuario usuario) {
        this.usuario = usuario;
    }
}