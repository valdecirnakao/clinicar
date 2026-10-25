package com.clinicar.backend.service;

import com.clinicar.backend.model.Atendimento;
import com.clinicar.backend.model.AtendimentoPausa;
import com.clinicar.backend.repository.AtendimentoPausaRepository;
import com.clinicar.backend.repository.AtendimentoRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class PausaAtendimentoService {
    private final AtendimentoRepository atendimentos;
    private final AtendimentoPausaRepository pausas;
    public PausaAtendimentoService(AtendimentoRepository atendimentos, AtendimentoPausaRepository pausas) {
        this.atendimentos = atendimentos; this.pausas = pausas;
    }
    @Transactional
    public Atendimento pausar(Long atendimentoId, Long autorId, String motivo) {
        if (motivo == null || motivo.isBlank() || motivo.strip().length() > 500)
            throw new IllegalArgumentException("Informe o motivo da pausa (até 500 caracteres).");
        Atendimento atendimento = atendimentos.buscarParaPrevisao(atendimentoId)
                .orElseThrow(() -> new IllegalArgumentException("Atendimento não encontrado."));
        if (!"EM_EXECUCAO".equals(atendimento.getStatusAtendimento()))
            throw new IllegalArgumentException("Somente um atendimento em execução pode ser pausado.");
        AtendimentoPausa pausa = new AtendimentoPausa();
        pausa.setAtendimentoId(atendimentoId); pausa.setAutorId(autorId);
        pausa.setMotivo(motivo.strip()); pausa.setPausadoEm(LocalDateTime.now());
        pausas.save(pausa);
        atendimento.setStatusAtendimento("PAUSADO");
        return atendimentos.save(atendimento);
    }
    @Transactional
    public Atendimento retomar(Long atendimentoId, Long autorId) {
        Atendimento atendimento = atendimentos.buscarParaPrevisao(atendimentoId)
                .orElseThrow(() -> new IllegalArgumentException("Atendimento não encontrado."));
        if (!"PAUSADO".equals(atendimento.getStatusAtendimento()))
            throw new IllegalArgumentException("Somente um atendimento pausado pode ser retomado.");
        AtendimentoPausa pausa = pausas.findFirstByAtendimentoIdAndRetomadoEmIsNullOrderByPausadoEmDesc(atendimentoId)
                .orElseThrow(() -> new IllegalStateException("O registro da pausa não foi encontrado."));
        pausa.setRetomadoEm(LocalDateTime.now()); pausa.setRetomadoPorId(autorId);
        pausas.save(pausa);
        atendimento.setStatusAtendimento("EM_EXECUCAO");
        return atendimentos.save(atendimento);
    }
    @Transactional(readOnly = true)
    public List<AtendimentoPausa> historico(Long atendimentoId) {
        return pausas.findByAtendimentoIdOrderByPausadoEmDesc(atendimentoId);
    }
}
