package com.clinicar.backend.controller;

import com.clinicar.backend.dto.ServicoRequest;
import com.clinicar.backend.dto.ServicoResponse;
import com.clinicar.backend.mapper.ServicoMapper;
import com.clinicar.backend.model.Servico;
import com.clinicar.backend.service.ServicoService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/servico")
@CrossOrigin(
        origins = "http://localhost:4200",
        allowCredentials = "true"
)
public class ServicoController {

    private final ServicoService servicoService;
    private final ServicoMapper servicoMapper;

    public ServicoController(
            ServicoService servicoService,
            ServicoMapper servicoMapper
    ) {
        this.servicoService = servicoService;
        this.servicoMapper = servicoMapper;
    }

    @PostMapping
    public ResponseEntity<ServicoResponse> criarServico(
            @RequestBody ServicoRequest request
    ) {
        Servico salvo = servicoService.criar(request);

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(servicoMapper.toResponse(salvo));
    }

    @GetMapping
    public ResponseEntity<List<ServicoResponse>> listarTodos() {
        List<ServicoResponse> servicos = servicoMapper.toResponseList(
                servicoService.listarTodos()
        );

        return ResponseEntity.ok(servicos);
    }

    @GetMapping("/ativos")
    public ResponseEntity<List<ServicoResponse>> listarAtivos() {
        List<ServicoResponse> servicos = servicoMapper.toResponseList(
                servicoService.listarAtivos()
        );

        return ResponseEntity.ok(servicos);
    }

    @GetMapping("/{id}")
    public ResponseEntity<ServicoResponse> buscarPorId(@PathVariable Long id) {
        Servico servico = servicoService.buscarPorId(id);

        return ResponseEntity.ok(servicoMapper.toResponse(servico));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ServicoResponse> atualizarServico(
            @PathVariable Long id,
            @RequestBody ServicoRequest request
    ) {
        Servico atualizado = servicoService.atualizar(id, request);

        return ResponseEntity.ok(servicoMapper.toResponse(atualizado));
    }

    @PatchMapping("/{id}/ativar")
    public ResponseEntity<ServicoResponse> ativarServico(@PathVariable Long id) {
        servicoService.ativar(id);

        Servico servico = servicoService.buscarPorId(id);

        return ResponseEntity.ok(servicoMapper.toResponse(servico));
    }

    @PatchMapping("/{id}/inativar")
    public ResponseEntity<ServicoResponse> inativarServico(@PathVariable Long id) {
        servicoService.inativar(id);

        Servico servico = servicoService.buscarPorId(id);

        return ResponseEntity.ok(servicoMapper.toResponse(servico));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> removerServico(@PathVariable Long id) {
        /*
         * Para preservar histórico, este DELETE faz exclusão lógica.
         * O serviço não é apagado do banco, apenas marcado como inativo.
         */
        servicoService.inativar(id);

        return ResponseEntity.noContent().build();
    }
}