package com.clinicar.backend.controller;

import com.clinicar.backend.dto.FornecimentoServicoRequest;
import com.clinicar.backend.dto.FornecimentoServicoResponse;
import com.clinicar.backend.mapper.FornecimentoServicoMapper;
import com.clinicar.backend.model.FornecimentoServico;
import com.clinicar.backend.service.FornecimentoServicoService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/fornecimento-servicos")
@CrossOrigin(
        origins = "http://localhost:4200",
        allowCredentials = "true"
)
public class FornecimentoServicoController {

    private final FornecimentoServicoService fornecimentoServicoService;
    private final FornecimentoServicoMapper fornecimentoServicoMapper;

    public FornecimentoServicoController(
            FornecimentoServicoService fornecimentoServicoService,
            FornecimentoServicoMapper fornecimentoServicoMapper
    ) {
        this.fornecimentoServicoService = fornecimentoServicoService;
        this.fornecimentoServicoMapper = fornecimentoServicoMapper;
    }

    @PostMapping
    public ResponseEntity<FornecimentoServicoResponse> criar(
            @RequestBody FornecimentoServicoRequest request
    ) {
        FornecimentoServico salvo = fornecimentoServicoService.criar(request);

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(fornecimentoServicoMapper.toResponse(salvo));
    }

    @GetMapping
    public ResponseEntity<List<FornecimentoServicoResponse>> listarTodos() {
        List<FornecimentoServicoResponse> response =
                fornecimentoServicoMapper.toResponseList(
                        fornecimentoServicoService.listarTodos()
                );

        return ResponseEntity.ok(response);
    }

    @GetMapping("/ativos")
    public ResponseEntity<List<FornecimentoServicoResponse>> listarAtivos() {
        List<FornecimentoServicoResponse> response =
                fornecimentoServicoMapper.toResponseList(
                        fornecimentoServicoService.listarAtivos()
                );

        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    public ResponseEntity<FornecimentoServicoResponse> buscarPorId(
            @PathVariable Long id
    ) {
        FornecimentoServico fornecimento =
                fornecimentoServicoService.buscarPorId(id);

        return ResponseEntity.ok(
                fornecimentoServicoMapper.toResponse(fornecimento)
        );
    }

    @GetMapping("/fornecedor/{fornecedorId}")
    public ResponseEntity<List<FornecimentoServicoResponse>> listarPorFornecedor(
            @PathVariable Long fornecedorId
    ) {
        List<FornecimentoServicoResponse> response =
                fornecimentoServicoMapper.toResponseList(
                        fornecimentoServicoService.listarPorFornecedor(fornecedorId)
                );

        return ResponseEntity.ok(response);
    }

    @GetMapping("/servico/{servicoId}")
    public ResponseEntity<List<FornecimentoServicoResponse>> listarPorServico(
            @PathVariable Long servicoId
    ) {
        List<FornecimentoServicoResponse> response =
                fornecimentoServicoMapper.toResponseList(
                        fornecimentoServicoService.listarPorServico(servicoId)
                );

        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}")
    public ResponseEntity<FornecimentoServicoResponse> atualizar(
            @PathVariable Long id,
            @RequestBody FornecimentoServicoRequest request
    ) {
        FornecimentoServico atualizado =
                fornecimentoServicoService.atualizar(id, request);

        return ResponseEntity.ok(
                fornecimentoServicoMapper.toResponse(atualizado)
        );
    }

    @PatchMapping("/{id}/ativar")
    public ResponseEntity<FornecimentoServicoResponse> ativar(
            @PathVariable Long id
    ) {
        fornecimentoServicoService.ativar(id);

        FornecimentoServico fornecimento =
                fornecimentoServicoService.buscarPorId(id);

        return ResponseEntity.ok(
                fornecimentoServicoMapper.toResponse(fornecimento)
        );
    }

    @PatchMapping("/{id}/inativar")
    public ResponseEntity<FornecimentoServicoResponse> inativar(
            @PathVariable Long id
    ) {
        fornecimentoServicoService.inativar(id);

        FornecimentoServico fornecimento =
                fornecimentoServicoService.buscarPorId(id);

        return ResponseEntity.ok(
                fornecimentoServicoMapper.toResponse(fornecimento)
        );
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> remover(@PathVariable Long id) {
        /*
         * Exclusão lógica: o registro não é apagado do banco,
         * apenas marcado como inativo.
         */
        fornecimentoServicoService.inativar(id);

        return ResponseEntity.noContent().build();
    }
}