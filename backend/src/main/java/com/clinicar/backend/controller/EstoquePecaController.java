package com.clinicar.backend.controller;

import com.clinicar.backend.dto.EstoquePecaRequest;
import com.clinicar.backend.dto.EstoquePecaResponse;
import com.clinicar.backend.dto.MovimentacaoEstoquePecaRequest;
import com.clinicar.backend.dto.MovimentacaoEstoquePecaResponse;
import com.clinicar.backend.mapper.EstoquePecaMapper;
import com.clinicar.backend.mapper.MovimentacaoEstoquePecaMapper;
import com.clinicar.backend.model.EstoquePeca;
import com.clinicar.backend.service.EstoquePecaService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/estoque-pecas")
@CrossOrigin(origins = "http://localhost:4200", allowCredentials = "true")
public class EstoquePecaController {

    private final EstoquePecaService service;
    private final EstoquePecaMapper estoqueMapper;
    private final MovimentacaoEstoquePecaMapper movimentacaoMapper;

    public EstoquePecaController(
            EstoquePecaService service,
            EstoquePecaMapper estoqueMapper,
            MovimentacaoEstoquePecaMapper movimentacaoMapper
    ) {
        this.service = service;
        this.estoqueMapper = estoqueMapper;
        this.movimentacaoMapper = movimentacaoMapper;
    }

    @PostMapping
    public ResponseEntity<EstoquePecaResponse> criar(@RequestBody EstoquePecaRequest request) {
        EstoquePeca salvo = service.criar(request);

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(estoqueMapper.toResponse(salvo));
    }

    @GetMapping
    public ResponseEntity<List<EstoquePecaResponse>> listarTodos() {
        return ResponseEntity.ok(estoqueMapper.toResponseList(service.listarTodos()));
    }

    @GetMapping("/ativos")
    public ResponseEntity<List<EstoquePecaResponse>> listarAtivos() {
        return ResponseEntity.ok(estoqueMapper.toResponseList(service.listarAtivos()));
    }

    @GetMapping("/criticos")
    public ResponseEntity<List<EstoquePecaResponse>> listarCriticos() {
        return ResponseEntity.ok(estoqueMapper.toResponseList(service.listarCriticos()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<EstoquePecaResponse> buscarPorId(@PathVariable Long id) {
        return ResponseEntity.ok(estoqueMapper.toResponse(service.buscarPorId(id)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<EstoquePecaResponse> atualizar(
            @PathVariable Long id,
            @RequestBody EstoquePecaRequest request
    ) {
        return ResponseEntity.ok(estoqueMapper.toResponse(service.atualizar(id, request)));
    }

    @PostMapping("/{id}/entrada")
    public ResponseEntity<EstoquePecaResponse> registrarEntrada(
            @PathVariable Long id,
            @RequestBody MovimentacaoEstoquePecaRequest request
    ) {
        return ResponseEntity.ok(estoqueMapper.toResponse(service.registrarEntrada(id, request)));
    }

    @PostMapping("/{id}/saida")
    public ResponseEntity<EstoquePecaResponse> registrarSaida(
            @PathVariable Long id,
            @RequestBody MovimentacaoEstoquePecaRequest request
    ) {
        return ResponseEntity.ok(estoqueMapper.toResponse(service.registrarSaida(id, request)));
    }

    @PostMapping("/{id}/ajuste")
    public ResponseEntity<EstoquePecaResponse> registrarAjuste(
            @PathVariable Long id,
            @RequestBody MovimentacaoEstoquePecaRequest request
    ) {
        return ResponseEntity.ok(estoqueMapper.toResponse(service.registrarAjuste(id, request)));
    }

    @GetMapping("/{id}/movimentacoes")
    public ResponseEntity<List<MovimentacaoEstoquePecaResponse>> listarMovimentacoes(
            @PathVariable Long id
    ) {
        return ResponseEntity.ok(
                movimentacaoMapper.toResponseList(service.listarMovimentacoes(id))
        );
    }
}