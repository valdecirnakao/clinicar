package com.clinicar.backend.controller;

import com.clinicar.backend.dto.LocalEstoqueRequest;
import com.clinicar.backend.dto.LocalEstoqueResponse;
import com.clinicar.backend.mapper.LocalEstoqueMapper;
import com.clinicar.backend.model.LocalEstoque;
import com.clinicar.backend.service.LocalEstoqueService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/local-estoque")
@CrossOrigin(origins = "http://localhost:4200", allowCredentials = "true")
public class LocalEstoqueController {

    private final LocalEstoqueService service;
    private final LocalEstoqueMapper mapper;

    public LocalEstoqueController(
            LocalEstoqueService service,
            LocalEstoqueMapper mapper
    ) {
        this.service = service;
        this.mapper = mapper;
    }

    @PostMapping
    public ResponseEntity<LocalEstoqueResponse> criar(@RequestBody LocalEstoqueRequest request) {
        LocalEstoque salvo = service.criar(request);

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(mapper.toResponse(salvo));
    }

    @GetMapping
    public ResponseEntity<List<LocalEstoqueResponse>> listarTodos() {
        return ResponseEntity.ok(mapper.toResponseList(service.listarTodos()));
    }

    @GetMapping("/ativos")
    public ResponseEntity<List<LocalEstoqueResponse>> listarAtivos() {
        return ResponseEntity.ok(mapper.toResponseList(service.listarAtivos()));
    }

    @PutMapping("/{id}")
    public ResponseEntity<LocalEstoqueResponse> atualizar(
            @PathVariable Long id,
            @RequestBody LocalEstoqueRequest request
    ) {
        return ResponseEntity.ok(mapper.toResponse(service.atualizar(id, request)));
    }
}