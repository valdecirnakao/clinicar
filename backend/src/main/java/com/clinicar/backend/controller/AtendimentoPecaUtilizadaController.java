package com.clinicar.backend.controller;

import com.clinicar.backend.dto.AtendimentoPecaRequest;
import com.clinicar.backend.dto.AtendimentoPecaResponse;
import com.clinicar.backend.mapper.AtendimentoPecaMapper;
import com.clinicar.backend.service.AtendimentoPecaUtilizadaService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/atendimento/{atendimentoId}/pecas")
@CrossOrigin(origins = "http://localhost:4200", allowCredentials = "true")
public class AtendimentoPecaUtilizadaController {

    private final AtendimentoPecaUtilizadaService atendimentoPecaService;
    private final AtendimentoPecaMapper atendimentoPecaMapper;

    public AtendimentoPecaUtilizadaController(
            AtendimentoPecaUtilizadaService atendimentoPecaService,
            AtendimentoPecaMapper atendimentoPecaMapper
    ) {
        this.atendimentoPecaService = atendimentoPecaService;
        this.atendimentoPecaMapper = atendimentoPecaMapper;
    }

    @GetMapping
    public ResponseEntity<List<AtendimentoPecaResponse>> listar(
            @PathVariable Long atendimentoId
    ) {
        return ResponseEntity.ok(
                atendimentoPecaMapper.toResponseList(
                        atendimentoPecaService.listarPorAtendimento(atendimentoId)
                )
        );
    }

    @PostMapping
    public ResponseEntity<AtendimentoPecaResponse> adicionar(
            @PathVariable Long atendimentoId,
            @RequestBody AtendimentoPecaRequest request
    ) {
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(
                        atendimentoPecaMapper.toResponse(
                                atendimentoPecaService.adicionar(atendimentoId, request)
                        )
                );
    }

    @PutMapping("/{itemId}")
    public ResponseEntity<AtendimentoPecaResponse> atualizar(
            @PathVariable Long atendimentoId,
            @PathVariable Long itemId,
            @RequestBody AtendimentoPecaRequest request
    ) {
        return ResponseEntity.ok(
                atendimentoPecaMapper.toResponse(
                        atendimentoPecaService.atualizar(atendimentoId, itemId, request)
                )
        );
    }

    @DeleteMapping("/{itemId}")
    public ResponseEntity<Void> remover(
            @PathVariable Long atendimentoId,
            @PathVariable Long itemId
    ) {
        atendimentoPecaService.remover(atendimentoId, itemId);

        return ResponseEntity.noContent().build();
    }
}