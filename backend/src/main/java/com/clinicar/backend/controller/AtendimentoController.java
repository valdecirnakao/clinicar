package com.clinicar.backend.controller;

import com.clinicar.backend.dto.AtendimentoCancelamentoRequest;
import com.clinicar.backend.dto.AtendimentoRequest;
import com.clinicar.backend.dto.AtendimentoResponse;
import com.clinicar.backend.mapper.AtendimentoMapper;
import com.clinicar.backend.model.Atendimento;
import com.clinicar.backend.service.AtendimentoService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/atendimento")
@CrossOrigin(origins = "http://localhost:4200", allowCredentials = "true")
public class AtendimentoController {

    private final AtendimentoService atendimentoService;
    private final AtendimentoMapper atendimentoMapper;

    public AtendimentoController(
            AtendimentoService atendimentoService,
            AtendimentoMapper atendimentoMapper
    ) {
        this.atendimentoService = atendimentoService;
        this.atendimentoMapper = atendimentoMapper;
    }

    @PostMapping
    public ResponseEntity<AtendimentoResponse> criar(
            @RequestBody AtendimentoRequest request
    ) {
        Atendimento salvo = atendimentoService.criar(request);

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(atendimentoMapper.toResponse(salvo));
    }

    @GetMapping
    public ResponseEntity<List<AtendimentoResponse>> listarTodos() {
        return ResponseEntity.ok(
                atendimentoMapper.toResponseList(
                        atendimentoService.listarTodos()
                )
        );
    }

    @GetMapping("/{id}")
    public ResponseEntity<AtendimentoResponse> buscarPorId(
            @PathVariable Long id
    ) {
        return ResponseEntity.ok(
                atendimentoMapper.toResponse(
                        atendimentoService.buscarPorId(id)
                )
        );
    }

    @GetMapping("/agendamento/{agendamentoId}")
    public ResponseEntity<AtendimentoResponse> buscarPorAgendamento(
            @PathVariable Long agendamentoId
    ) {
        return ResponseEntity.ok(
                atendimentoMapper.toResponse(
                        atendimentoService.buscarPorAgendamento(agendamentoId)
                )
        );
    }

    @GetMapping("/status/{status}")
    public ResponseEntity<List<AtendimentoResponse>> listarPorStatus(
            @PathVariable String status
    ) {
        return ResponseEntity.ok(
                atendimentoMapper.toResponseList(
                        atendimentoService.listarPorStatus(status)
                )
        );
    }

    @GetMapping("/tipo-execucao/{tipoExecucao}")
    public ResponseEntity<List<AtendimentoResponse>> listarPorTipoExecucao(
            @PathVariable String tipoExecucao
    ) {
        return ResponseEntity.ok(
                atendimentoMapper.toResponseList(
                        atendimentoService.listarPorTipoExecucao(tipoExecucao)
                )
        );
    }

    @GetMapping("/cliente/{clienteId}")
    public ResponseEntity<List<AtendimentoResponse>> listarPorCliente(
            @PathVariable Long clienteId
    ) {
        return ResponseEntity.ok(
                atendimentoMapper.toResponseList(
                        atendimentoService.listarPorCliente(clienteId)
                )
        );
    }

    @GetMapping("/veiculo/{veiculoId}")
    public ResponseEntity<List<AtendimentoResponse>> listarPorVeiculo(
            @PathVariable Long veiculoId
    ) {
        return ResponseEntity.ok(
                atendimentoMapper.toResponseList(
                        atendimentoService.listarPorVeiculo(veiculoId)
                )
        );
    }

    @GetMapping("/responsavel/{responsavelId}")
    public ResponseEntity<List<AtendimentoResponse>> listarPorResponsavel(
            @PathVariable Long responsavelId
    ) {
        return ResponseEntity.ok(
                atendimentoMapper.toResponseList(
                        atendimentoService.listarPorResponsavel(responsavelId)
                )
        );
    }

    @GetMapping("/fornecedor/{fornecedorId}")
    public ResponseEntity<List<AtendimentoResponse>> listarPorFornecedor(
            @PathVariable Long fornecedorId
    ) {
        return ResponseEntity.ok(
                atendimentoMapper.toResponseList(
                        atendimentoService.listarPorFornecedor(fornecedorId)
                )
        );
    }

    @GetMapping("/periodo")
    public ResponseEntity<List<AtendimentoResponse>> listarPorPeriodo(
            @RequestParam String inicio,
            @RequestParam String fim
    ) {
        return ResponseEntity.ok(
                atendimentoMapper.toResponseList(
                        atendimentoService.listarPorPeriodo(inicio, fim)
                )
        );
    }

    @PutMapping("/{id}")
    public ResponseEntity<AtendimentoResponse> atualizar(
            @PathVariable Long id,
            @RequestBody AtendimentoRequest request
    ) {
        return ResponseEntity.ok(
                atendimentoMapper.toResponse(
                        atendimentoService.atualizar(id, request)
                )
        );
    }

    @PatchMapping("/{id}/iniciar")
    public ResponseEntity<AtendimentoResponse> iniciar(
            @PathVariable Long id
    ) {
        return ResponseEntity.ok(
                atendimentoMapper.toResponse(
                        atendimentoService.iniciar(id)
                )
        );
    }

    @PatchMapping("/{id}/aprovar")
    public ResponseEntity<AtendimentoResponse> aprovar(
            @PathVariable Long id
    ) {
        return ResponseEntity.ok(
                atendimentoMapper.toResponse(
                        atendimentoService.aprovar(id)
                )
        );
    }

    @PatchMapping("/{id}/aguardar-terceiro")
    public ResponseEntity<AtendimentoResponse> aguardarTerceiro(
            @PathVariable Long id
    ) {
        return ResponseEntity.ok(
                atendimentoMapper.toResponse(
                        atendimentoService.aguardarTerceiro(id)
                )
        );
    }

    @PatchMapping("/{id}/concluir")
    public ResponseEntity<AtendimentoResponse> concluir(
            @PathVariable Long id
    ) {
        return ResponseEntity.ok(
                atendimentoMapper.toResponse(
                        atendimentoService.concluir(id)
                )
        );
    }

    @PatchMapping("/{id}/entregar")
    public ResponseEntity<AtendimentoResponse> entregar(
            @PathVariable Long id
    ) {
        return ResponseEntity.ok(
                atendimentoMapper.toResponse(
                        atendimentoService.entregar(id)
                )
        );
    }

    @PatchMapping("/{id}/cancelar")
    public ResponseEntity<AtendimentoResponse> cancelar(
            @PathVariable Long id,
            @RequestBody(required = false) AtendimentoCancelamentoRequest request
    ) {
        return ResponseEntity.ok(
                atendimentoMapper.toResponse(
                        atendimentoService.cancelar(id, request)
                )
        );
    }
}