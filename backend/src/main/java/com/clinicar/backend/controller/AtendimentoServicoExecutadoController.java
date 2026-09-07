package com.clinicar.backend.controller;

import com.clinicar.backend.dto.AtendimentoServicoExecutadoRequest;
import com.clinicar.backend.dto.AtendimentoServicoExecutadoResponse;
import com.clinicar.backend.mapper.AtendimentoServicoExecutadoMapper;
import com.clinicar.backend.model.AtendimentoServicoExecutado;
import com.clinicar.backend.service.AtendimentoServicoExecutadoService;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping(
        value = "/api/atendimento/{atendimentoId}/servicos",
        produces = MediaType.APPLICATION_JSON_VALUE
)
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
        List<AtendimentoServicoExecutado> servicos =
                atendimentoServicoService.listarPorAtendimento(atendimentoId);

        return ResponseEntity.ok(
                atendimentoServicoMapper.toResponseList(servicos)
        );
    }

    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<AtendimentoServicoExecutadoResponse> adicionar(
            @PathVariable Long atendimentoId,
            @RequestBody AtendimentoServicoExecutadoRequest request
    ) {
        AtendimentoServicoExecutado salvo = atendimentoServicoService.adicionar(
                atendimentoId,
                request
        );

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(atendimentoServicoMapper.toResponse(salvo));
    }

    @PutMapping(value = "/{itemId}", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<AtendimentoServicoExecutadoResponse> atualizar(
            @PathVariable Long atendimentoId,
            @PathVariable Long itemId,
            @RequestBody AtendimentoServicoExecutadoRequest request
    ) {
        AtendimentoServicoExecutado salvo = atendimentoServicoService.atualizar(
                atendimentoId,
                itemId,
                request
        );

        return ResponseEntity.ok(
                atendimentoServicoMapper.toResponse(salvo)
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