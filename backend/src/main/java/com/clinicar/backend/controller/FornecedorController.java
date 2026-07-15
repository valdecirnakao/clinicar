package com.clinicar.backend.controller;

import com.clinicar.backend.dto.FornecedorRequest;
import com.clinicar.backend.dto.FornecedorResponse;
import com.clinicar.backend.mapper.FornecedorMapper;
import com.clinicar.backend.model.Fornecedor;
import com.clinicar.backend.repository.FornecedorRepository;
import com.clinicar.backend.service.FornecedorService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/fornecedor")
@CrossOrigin(
        origins = "http://localhost:4200",
        allowCredentials = "true"
)
public class FornecedorController {

    private final FornecedorRepository fornecedorRepository;
    private final FornecedorService fornecedorService;
    private final FornecedorMapper fornecedorMapper;

    public FornecedorController(
            FornecedorRepository fornecedorRepository,
            FornecedorService fornecedorService,
            FornecedorMapper fornecedorMapper
    ) {
        this.fornecedorRepository = fornecedorRepository;
        this.fornecedorService = fornecedorService;
        this.fornecedorMapper = fornecedorMapper;
    }

    @PostMapping
    public ResponseEntity<FornecedorResponse> criarFornecedor(
            @RequestBody FornecedorRequest request
    ) {
        Fornecedor salvo = fornecedorService.criar(request);

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(fornecedorMapper.toResponse(salvo));
    }

    @GetMapping
    public ResponseEntity<List<FornecedorResponse>> listarTodos() {
        List<FornecedorResponse> fornecedores = fornecedorMapper.toResponseList(
                fornecedorRepository.findAll()
        );

        return ResponseEntity.ok(fornecedores);
    }

    @GetMapping("/{id}")
    public ResponseEntity<FornecedorResponse> buscarPorId(@PathVariable Long id) {
        return fornecedorRepository.findById(id)
                .map(fornecedor -> ResponseEntity.ok(fornecedorMapper.toResponse(fornecedor)))
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}")
    public ResponseEntity<FornecedorResponse> atualizarFornecedor(
            @PathVariable Long id,
            @RequestBody FornecedorRequest request
    ) {
        Fornecedor atualizado = fornecedorService.atualizar(id, request);

        return ResponseEntity.ok(fornecedorMapper.toResponse(atualizado));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> removerFornecedor(@PathVariable Long id) {
        if (!fornecedorRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }

        fornecedorRepository.deleteById(id);

        return ResponseEntity.noContent().build();
    }
}