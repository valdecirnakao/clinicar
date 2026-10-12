package com.clinicar.backend.dto;

import com.clinicar.backend.model.SolicitacaoAcessoUsuario;
import java.time.Instant;
public record SolicitacaoAcessoResponse(Long id, Long usuarioId, String usuarioNome, String usuarioEmail,
        String usuarioPerfil, String tipo, String justificativa, String status, Instant solicitadoEm,
        String administradorNome, String motivoDecisao, Instant decididoEm, java.time.LocalDate inicioPeriodo, java.time.LocalDate fimPeriodo, String situacaoPeriodo,
        Instant inativadoEm, Instant reativadoEm, Instant interrompidoEm) {
    public static SolicitacaoAcessoResponse de(SolicitacaoAcessoUsuario s) {
        return new SolicitacaoAcessoResponse(s.getId(), s.getUsuarioId(), s.getUsuarioNome(), s.getUsuarioEmail(),
                s.getUsuarioPerfil(), s.getTipo(), s.getJustificativa(), s.getStatus(), s.getSolicitadoEm(),
                s.getAdministradorNome(), s.getMotivoDecisao(), s.getDecididoEm(), s.getInicioPeriodo(), s.getFimPeriodo(),
                s.getSituacaoPeriodo(), s.getInativadoEm(), s.getReativadoEm(), s.getInterrompidoEm());
    }
}
