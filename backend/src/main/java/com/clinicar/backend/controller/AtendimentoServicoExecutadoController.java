package com.clinicar.backend.controller;

import com.clinicar.backend.dto.AtendimentoServicoExecutadoRequest;
import com.clinicar.backend.dto.AtendimentoServicoExecutadoResponse;
import com.clinicar.backend.mapper.AtendimentoServicoExecutadoMapper;
import com.clinicar.backend.service.AtendimentoServicoExecutadoService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/atendimento/{atendimentoId}/servicos")
@CrossOrigin(origins = "http://localhost:4200", allowCredentials = "true")
public class AtendimentoServicoExecutadoController {

    private final AtendimentoServicoExecutadoService atendimentoServicoService;
    private final AtendimentoServicoExecutadoMapper atendimentoServicoMapper;

    public AtendimentoServicoExecutadoController(
            AtendimentoServicoExecutadoService atendimentoServicoService,
            AtendimentoServicoExecutadoMapper atendimentoServicoMapper
    ) {
        this.atendimentoServicoService = atendimentoServicoService;
        this.atendimentoServicoMapper = atendimentoServicoMapper;
    }

    @GetMapping
    public ResponseEntity<List<AtendimentoServicoExecutadoResponse>> listar(
            @PathVariable Long atendimentoId
    ) {
        return ResponseEntity.ok(
                atendimentoServicoMapper.toResponseList(
                        atendimentoServicoService.listarPorAtendimento(atendimentoId)
                )
        );
    }

    @PostMapping
    public ResponseEntity<AtendimentoServicoExecutadoResponse> adicionar(
            @PathVariable Long atendimentoId,
            @RequestBody AtendimentoServicoExecutadoRequest request
    ) {
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(
                        atendimentoServicoMapper.toResponse(
                                atendimentoServicoService.adicionar(atendimentoId, request)
                        )
                );
    }

    @PutMapping("/{itemId}")
    public ResponseEntity<AtendimentoServicoExecutadoResponse> atualizar(
            @PathVariable Long atendimentoId,
            @PathVariable Long itemId,
            @RequestBody AtendimentoServicoExecutadoRequest request
    ) {
        return ResponseEntity.ok(
                atendimentoServicoMapper.toResponse(
                        atendimentoServicoService.atualizar(atendimentoId, itemId, request)
                )
        );
    }

    @DeleteMapping("/{itemId}")
    public ResponseEntity<Void> remover(
            @PathVariable Long atendimentoId,
            @PathVariable Long itemId
    ) {
        atendimentoServicoService.remover(atendimentoId, itemId);

        return ResponseEntity.noContent().build();
    }
}