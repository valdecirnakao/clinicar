package com.clinicar.backend.dto;

import java.time.LocalDateTime;

public class ErroResponse {

    private String mensagem;
    private LocalDateTime dataHora;

    public ErroResponse(String mensagem) {
        this.mensagem = mensagem;
        this.dataHora = LocalDateTime.now();
    }

    public String getMensagem() {
        return mensagem;
    }

    public void setMensagem(String mensagem) {
        this.mensagem = mensagem;
    }

    public LocalDateTime getDataHora() {
        return dataHora;
    }

    public void setDataHora(LocalDateTime dataHora) {
        this.dataHora = dataHora;
    }
}