package com.clinicar.backend.controller;

import com.clinicar.backend.dto.FornecimentoPecasRequest;
import com.clinicar.backend.model.FornecimentoPecas;
import com.clinicar.backend.service.FornecimentoPecasService;
import lombok.RequiredArgsConstructor;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/fornecimento-pecas")
@CrossOrigin(origins = "http://localhost:4200")
@RequiredArgsConstructor
public class FornecimentoPecasController {

    private final FornecimentoPecasService fornecimentoPecasService;

    // CREATE
    @PostMapping
    public ResponseEntity<FornecimentoPecas> criarFornecimento(
            @RequestBody FornecimentoPecasRequest request) {

        FornecimentoPecas salvo = fornecimentoPecasService.criar(request);

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(salvo);
    }

    // READ - LISTAR TODOS
    @GetMapping
    public ResponseEntity<List<FornecimentoPecas>> listarTodos() {
        return ResponseEntity.ok(fornecimentoPecasService.listarTodos());
    }

    // READ - POR ID
    @GetMapping("/{id}")
    public ResponseEntity<FornecimentoPecas> buscarPorId(@PathVariable Long id) {

        FornecimentoPecas fornecimento = fornecimentoPecasService.buscarPorId(id);

        if (fornecimento == null) {
            return ResponseEntity.notFound().build();
        }

        return ResponseEntity.ok(fornecimento);
    }

    // UPDATE
    @PutMapping("/{id}")
    public ResponseEntity<FornecimentoPecas> atualizarFornecimento(
            @PathVariable Long id,
            @RequestBody FornecimentoPecasRequest request) {

        FornecimentoPecas atualizado =
                fornecimentoPecasService.atualizar(id, request);

        if (atualizado == null) {
            return ResponseEntity.notFound().build();
        }

        return ResponseEntity.ok(atualizado);
    }

    // DELETE
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> removerFornecimento(@PathVariable Long id) {

        boolean removido = fornecimentoPecasService.remover(id);

        if (!removido) {
            return ResponseEntity.notFound().build();
        }

        return ResponseEntity.noContent().build();
    }
}