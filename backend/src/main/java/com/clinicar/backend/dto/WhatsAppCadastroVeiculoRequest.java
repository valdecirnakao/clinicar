package com.clinicar.backend.dto;

import java.util.List;

public class WhatsAppCadastroVeiculoRequest {

    private String telefone;
    private String template;
    private String languageCode;
    private List<String> parametrosBody;

    public String getTelefone() {
        return telefone;
    }

    public void setTelefone(String telefone) {
        this.telefone = telefone;
    }

    public String getTemplate() {
        return template;
    }

    public void setTemplate(String template) {
        this.template = template;
    }

    public String getLanguageCode() {
        return languageCode;
    }

    public void setLanguageCode(String languageCode) {
        this.languageCode = languageCode;
    }

    public List<String> getParametrosBody() {
        return parametrosBody;
    }

    public void setParametrosBody(List<String> parametrosBody) {
        this.parametrosBody = parametrosBody;
    }
}