package com.clinicar.backend.event;

import lombok.AllArgsConstructor;
import lombok.Getter;

import java.time.LocalDateTime;

/**
 * Evento publicado após a criação ou reemissão
 * de uma ativação do administrador inicial.
 *
 * O token puro existe apenas em memória.
 * O banco armazena somente seu hash.
 *
 * Importante:
 * não utilizar @Data neste evento, para evitar
 * geração automática de toString() contendo
 * o token de ativação.
 */
@Getter
@AllArgsConstructor
public class AtivacaoAdministradorSolicitadaEvent {

    private Long usuarioId;

    private String nome;

    private String email;

    private String token;

    private LocalDateTime expiraEm;
}