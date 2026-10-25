package com.clinicar.backend.controller;

import com.clinicar.backend.dto.AtendimentoResponse;
import com.clinicar.backend.dto.UsuarioResponse;
import com.clinicar.backend.mapper.AtendimentoMapper;
import com.clinicar.backend.repository.AtendimentoRepository;
import com.clinicar.backend.service.AtendimentoService;
import com.clinicar.backend.service.PausaAtendimentoService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.Objects;

/** Edição estrita do relato técnico, limitada à ordem atribuída ao colaborador autenticado. */
@RestController
@RequestMapping("/api/colaborador/meus-atendimentos")
public class AtendimentoTecnicoController {
    private final AtendimentoRepository atendimentos;
    private final AtendimentoMapper mapper;
    private final AtendimentoService service;
    private final PausaAtendimentoService pausas;

    public AtendimentoTecnicoController(AtendimentoRepository atendimentos, AtendimentoMapper mapper,
            AtendimentoService service, PausaAtendimentoService pausas) {
        this.atendimentos = atendimentos;
        this.mapper = mapper;
        this.service = service;
        this.pausas = pausas;
    }

    public record Relato(@Size(max = 2000) String diagnosticoTecnico,
            @Size(max = 2000) String servicoExecutado,
            @Size(max = 1000) String observacoesInternas,
            @Size(max = 1000) String recomendacoesCliente,
            @Min(0) @Max(999999999) Integer quilometragemEntrada) {}
    public record Conclusao(@Min(0) @Max(999999999) Integer quilometragemSaida) {}
    public record Pausa(@Size(max = 500) String motivo) {}

    @PatchMapping("/{id}/pausar") @Transactional
    public AtendimentoResponse pausar(@PathVariable Long id, @Valid @RequestBody Pausa pedido,
            @RequestAttribute("usuarioLogado") UsuarioResponse sessao) {
        validarAtendimento(id, sessao);
        return mapper.toResponse(pausas.pausar(id, sessao.getId(), pedido == null ? null : pedido.motivo()));
    }

    @PatchMapping("/{id}/retomar") @Transactional
    public AtendimentoResponse retomar(@PathVariable Long id,
            @RequestAttribute("usuarioLogado") UsuarioResponse sessao) {
        validarAtendimento(id, sessao);
        return mapper.toResponse(pausas.retomar(id, sessao.getId()));
    }

    @GetMapping("/{id}/pausas") @Transactional(readOnly = true)
    public java.util.List<com.clinicar.backend.model.AtendimentoPausa> historicoPausas(@PathVariable Long id,
            @RequestAttribute("usuarioLogado") UsuarioResponse sessao) {
        validarAtendimento(id, sessao);
        return pausas.historico(id);
    }

    @PatchMapping("/{id}/diagnosticar") @Transactional
    public AtendimentoResponse diagnosticar(@PathVariable Long id, @RequestAttribute("usuarioLogado") UsuarioResponse sessao) {
        validarAtendimento(id, sessao);
        return mapper.toResponse(service.abrirDiagnostico(id));
    }

    @PatchMapping("/{id}/solicitar-aprovacao") @Transactional
    public AtendimentoResponse solicitarAprovacao(@PathVariable Long id, @RequestAttribute("usuarioLogado") UsuarioResponse sessao) {
        validarAtendimento(id, sessao);
        return mapper.toResponse(service.solicitarAprovacao(id));
    }

    @PatchMapping("/{id}/iniciar") @Transactional
    public AtendimentoResponse iniciar(@PathVariable Long id, @RequestAttribute("usuarioLogado") UsuarioResponse sessao) {
        validarAtendimento(id, sessao);
        return mapper.toResponse(service.iniciar(id));
    }

    @PatchMapping("/{id}/concluir") @Transactional
    public AtendimentoResponse concluir(@PathVariable Long id, @Valid @RequestBody Conclusao conclusao,
            @RequestAttribute("usuarioLogado") UsuarioResponse sessao) {
        validarAtendimento(id, sessao);
        return mapper.toResponse(service.concluir(id, conclusao == null ? null : conclusao.quilometragemSaida()));
    }

    @GetMapping("/{id}")
    @Transactional(readOnly = true)
    public AtendimentoResponse consultar(@PathVariable Long id, @RequestAttribute("usuarioLogado") UsuarioResponse sessao) {
        var atendimento = atendimentos.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        validarAtribuicao(atendimento.getResponsavel() == null ? null : atendimento.getResponsavel().getId(), sessao);
        return mapper.toResponse(atendimento);
    }

    @PutMapping("/{id}/relato")
    @Transactional
    public AtendimentoResponse salvarRelato(@PathVariable Long id, @Valid @RequestBody Relato relato,
            @RequestAttribute("usuarioLogado") UsuarioResponse sessao) {
        var atendimento = atendimentos.buscarParaPrevisao(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        validarAtribuicao(atendimento.getResponsavel() == null ? null : atendimento.getResponsavel().getId(), sessao);
        if (java.util.Set.of("CANCELADO", "CONCLUIDO", "ENTREGUE").contains(atendimento.getStatusAtendimento())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Este atendimento não aceita alterações técnicas.");
        }
        atendimento.setDiagnosticoTecnico(relato.diagnosticoTecnico());
        atendimento.setServicoExecutado(relato.servicoExecutado());
        atendimento.setObservacoesInternas(relato.observacoesInternas());
        atendimento.setRecomendacoesCliente(relato.recomendacoesCliente());
        if (relato.quilometragemEntrada() != null) atendimento.setQuilometragemEntrada(relato.quilometragemEntrada());
        return mapper.toResponse(atendimentos.saveAndFlush(atendimento));
    }

    private void validarAtribuicao(Long responsavelId, UsuarioResponse sessao) {
        if (sessao == null || !"ATIVO".equalsIgnoreCase(sessao.getStatus())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Atendimento não atribuído a você.");
        }
        if ("ADMINISTRADOR".equalsIgnoreCase(sessao.getTipo_do_acesso())) return;
        if (!"COLABORADOR".equalsIgnoreCase(sessao.getTipo_do_acesso())
                || !Objects.equals(responsavelId, sessao.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Atendimento não atribuído a você.");
        }
    }

    private void validarAtendimento(Long id, UsuarioResponse sessao) {
        var atendimento = atendimentos.buscarParaPrevisao(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        validarAtribuicao(atendimento.getResponsavel() == null ? null : atendimento.getResponsavel().getId(), sessao);
    }
}
