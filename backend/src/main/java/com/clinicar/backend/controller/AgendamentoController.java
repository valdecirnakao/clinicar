package com.clinicar.backend.controller;

import com.clinicar.backend.dto.AgendamentoCancelamentoRequest;
import com.clinicar.backend.dto.AgendamentoRequest;
import com.clinicar.backend.dto.AgendamentoResponse;
import com.clinicar.backend.mapper.AgendamentoMapper;
import com.clinicar.backend.model.Agendamento;
import com.clinicar.backend.service.AgendamentoService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/agendamento")
@CrossOrigin(origins = "http://localhost:4200", allowCredentials = "true")
public class AgendamentoController {

    private final AgendamentoService agendamentoService;
    private final AgendamentoMapper agendamentoMapper;

    public AgendamentoController(
            AgendamentoService agendamentoService,
            AgendamentoMapper agendamentoMapper
    ) {
        this.agendamentoService = agendamentoService;
        this.agendamentoMapper = agendamentoMapper;
    }

    @PostMapping
    public ResponseEntity<AgendamentoResponse> criar(
            @RequestBody AgendamentoRequest request
    ) {
        Agendamento salvo = agendamentoService.criar(request);

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(agendamentoMapper.toResponse(salvo));
    }

    @GetMapping
    public ResponseEntity<List<AgendamentoResponse>> listarTodos() {
        return ResponseEntity.ok(
                agendamentoMapper.toResponseList(
                        agendamentoService.listarTodos()
                )
        );
    }

    @GetMapping("/{id}")
    public ResponseEntity<AgendamentoResponse> buscarPorId(
            @PathVariable Long id
    ) {
        return ResponseEntity.ok(
                agendamentoMapper.toResponse(
                        agendamentoService.buscarPorId(id)
                )
        );
    }

    @GetMapping("/status/{status}")
    public ResponseEntity<List<AgendamentoResponse>> listarPorStatus(
            @PathVariable String status
    ) {
        return ResponseEntity.ok(
                agendamentoMapper.toResponseList(
                        agendamentoService.listarPorStatus(status)
                )
        );
    }

    @GetMapping("/cliente/{clienteId}")
    public ResponseEntity<List<AgendamentoResponse>> listarPorCliente(
            @PathVariable Long clienteId
    ) {
        return ResponseEntity.ok(
                agendamentoMapper.toResponseList(
                        agendamentoService.listarPorCliente(clienteId)
                )
        );
    }

    @GetMapping("/veiculo/{veiculoId}")
    public ResponseEntity<List<AgendamentoResponse>> listarPorVeiculo(
            @PathVariable Long veiculoId
    ) {
        return ResponseEntity.ok(
                agendamentoMapper.toResponseList(
                        agendamentoService.listarPorVeiculo(veiculoId)
                )
        );
    }

    @GetMapping("/periodo")
    public ResponseEntity<List<AgendamentoResponse>> listarPorPeriodo(
            @RequestParam String inicio,
            @RequestParam String fim
    ) {
        return ResponseEntity.ok(
                agendamentoMapper.toResponseList(
                        agendamentoService.listarPorPeriodo(inicio, fim)
                )
        );
    }

    @PutMapping("/{id}")
    public ResponseEntity<AgendamentoResponse> atualizar(
            @PathVariable Long id,
            @RequestBody AgendamentoRequest request
    ) {
        return ResponseEntity.ok(
                agendamentoMapper.toResponse(
                        agendamentoService.atualizar(id, request)
                )
        );
    }

    @PatchMapping("/{id}/confirmar")
    public ResponseEntity<AgendamentoResponse> confirmar(
            @PathVariable Long id
    ) {
        return ResponseEntity.ok(
                agendamentoMapper.toResponse(
                        agendamentoService.confirmar(id)
                )
        );
    }

    @PatchMapping("/{id}/iniciar")
    public ResponseEntity<AgendamentoResponse> iniciarAtendimento(
            @PathVariable Long id
    ) {
        return ResponseEntity.ok(
                agendamentoMapper.toResponse(
                        agendamentoService.iniciarAtendimento(id)
                )
        );
    }

    @PatchMapping("/{id}/concluir")
    public ResponseEntity<AgendamentoResponse> concluir(
            @PathVariable Long id
    ) {
        return ResponseEntity.ok(
                agendamentoMapper.toResponse(
                        agendamentoService.concluir(id)
                )
        );
    }

    @PatchMapping("/{id}/cancelar")
    public ResponseEntity<AgendamentoResponse> cancelar(
            @PathVariable Long id,
            @RequestBody(required = false) AgendamentoCancelamentoRequest request
    ) {
        return ResponseEntity.ok(
                agendamentoMapper.toResponse(
                        agendamentoService.cancelar(id, request)
                )
        );
    }

    @PatchMapping("/{id}/nao-compareceu")
    public ResponseEntity<AgendamentoResponse> marcarNaoCompareceu(
            @PathVariable Long id
    ) {
        return ResponseEntity.ok(
                agendamentoMapper.toResponse(
                        agendamentoService.marcarNaoCompareceu(id)
                )
        );
    }
}