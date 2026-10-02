package com.clinicar.backend.service;

import com.clinicar.backend.repository.*;
import com.clinicar.backend.event.*;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.*;

@Service @RequiredArgsConstructor
public class PeriodoAcessoUsuarioService {
    public static final ZoneId FUSO = ZoneId.of("America/Sao_Paulo");
    private final UsuarioRepository usuarios;
    private final SolicitacaoAcessoUsuarioRepository solicitacoes;
    private final AuthSessionRepository sessoes;
    private final ApplicationEventPublisher eventos;

    // Cada período usa uma transação própria. A ordem dos locks acompanha a gestão administrativa.
    @Transactional
    public void processar(Long id, LocalDate hoje) {
        var usuarioId = solicitacoes.buscarUsuarioId(id).orElse(null);
        if (usuarioId == null) return;
        var usuario = usuarios.buscarParaAtualizacao(usuarioId).orElseThrow();
        var s = solicitacoes.buscarParaDecisao(id).orElseThrow();
        if (!"APROVADA".equals(s.getStatus()) || !java.util.Set.of("AGENDADA", "EM_CURSO").contains(s.getSituacaoPeriodo() == null ? "" : s.getSituacaoPeriodo())) return;
        if (!"COLABORADOR".equalsIgnoreCase(usuario.getTipo_do_acesso())
                || ("AGENDADA".equals(s.getSituacaoPeriodo()) && !"ATIVO".equalsIgnoreCase(usuario.getStatus()))
                || ("EM_CURSO".equals(s.getSituacaoPeriodo()) && !"INATIVO".equalsIgnoreCase(usuario.getStatus()))) {
            s.setSituacaoPeriodo("INTERROMPIDA"); s.setInterrompidoEm(Instant.now());
        } else if (hoje.isAfter(s.getFimPeriodo())) {
            if ("EM_CURSO".equals(s.getSituacaoPeriodo())) {
                usuario.setStatus("ATIVO"); usuarios.saveAndFlush(usuario);
                // Não restaura tokens anteriores: o retorno exige novo login e 2FA.
                sessoes.revogarTodasDoUsuario(usuario.getId()); s.setReativadoEm(Instant.now());
                eventos.publishEvent(new UsuarioAtivadoEvent(usuario.getId(), usuario.getNome(), usuario.getTelefone()));
            }
            s.setSituacaoPeriodo("CONCLUIDA");
        } else if (!hoje.isBefore(s.getInicioPeriodo()) && "AGENDADA".equals(s.getSituacaoPeriodo())) {
            usuario.setStatus("INATIVO"); usuarios.saveAndFlush(usuario);
            sessoes.revogarTodasDoUsuario(usuario.getId()); s.setSituacaoPeriodo("EM_CURSO"); s.setInativadoEm(Instant.now());
            eventos.publishEvent(new UsuarioInativadoEvent(usuario.getId(), usuario.getNome(), usuario.getTelefone()));
        }
        solicitacoes.saveAndFlush(s);
    }
}
