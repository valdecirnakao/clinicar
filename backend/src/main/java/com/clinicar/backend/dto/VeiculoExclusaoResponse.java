package com.clinicar.backend.dto;

import lombok.Getter;

/** O resultado distingue registro na fila da aceitação pelo provedor. */
@Getter
public class VeiculoExclusaoResponse {
    private final String mensagem = "Veículo excluído com sucesso.";
    private String notificacaoWhatsapp = "PENDENTE";
    private String mensagemNotificacao = "";

    public void notificacaoAgendada() {
        notificacaoWhatsapp = "AGENDADA";
        mensagemNotificacao = "A notificação de exclusão será enviada em segundo plano.";
    }

    public void notificacaoAceita() {
        notificacaoWhatsapp = "ENVIADA";
        mensagemNotificacao = "A notificação de exclusão foi encaminhada ao WhatsApp do proprietário.";
    }
    public void notificacaoNaoEnviada(String motivo) {
        notificacaoWhatsapp = "NAO_ENVIADA";
        mensagemNotificacao = motivo;
    }
}
