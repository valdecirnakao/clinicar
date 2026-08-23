package com.clinicar.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class AgendamentoInicioResponse {

    private AgendamentoResponse agendamento;

    private AtendimentoResponse atendimento;

    private Boolean atendimentoCriado;

    private String mensagem;
}