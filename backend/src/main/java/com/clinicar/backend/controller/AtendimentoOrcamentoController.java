package com.clinicar.backend.controller;

import com.clinicar.backend.service.AtendimentoOrcamentoService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import java.util.List;

/** Histórico de versões para a equipe; o interceptor restringe o acesso a perfis internos. */
@RestController
@RequestMapping("/api/atendimento/{id}/orcamentos")
public class AtendimentoOrcamentoController {
    private final AtendimentoOrcamentoService service;
    public AtendimentoOrcamentoController(AtendimentoOrcamentoService service) { this.service = service; }
    @GetMapping
    public List<AtendimentoOrcamentoService.OrcamentoCliente> listar(@PathVariable Long id) {
        return service.listarDoAtendimento(id);
    }
}
