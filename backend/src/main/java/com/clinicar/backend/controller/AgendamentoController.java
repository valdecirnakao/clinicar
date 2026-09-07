package com.clinicar.backend.controller;

import com.clinicar.backend.dto.AgendamentoCancelamentoRequest;
import com.clinicar.backend.dto.AgendamentoInicioResponse;
import com.clinicar.backend.dto.AgendamentoRequest;
import com.clinicar.backend.dto.AgendamentoResponse;
import com.clinicar.backend.mapper.AgendamentoMapper;
import com.clinicar.backend.mapper.AtendimentoMapper;
import com.clinicar.backend.model.Agendamento;
import com.clinicar.backend.service.AgendamentoService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/agendamento")
@CrossOrigin(origins = "http://localhost:4200", allowCredentials = "true")
public class AgendamentoController {

    private final AgendamentoService agendamentoService;
    private final AgendamentoMapper agendamentoMapper;
    private final AtendimentoMapper atendimentoMapper;

    public AgendamentoController(
            AgendamentoService agendamentoService,
            AgendamentoMapper agendamentoMapper,
            AtendimentoMapper atendimentoMapper
    ) {
        this.agendamentoService = agendamentoService;
        this.agendamentoMapper = agendamentoMapper;
        this.atendimentoMapper = atendimentoMapper;
    }

    @PostMapping
    public ResponseEntity<AgendamentoResponse> criar(
            @RequestBody AgendamentoRequest request
    ) {
        log.info(
                "[AGENDAMENTO-CONTROLLER] Criando agendamento. Peças previstas recebidas no POST: {}",
                request.getPecasPrevistas() != null ? request.getPecasPrevistas().size() : 0
        );

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
        log.info(
                "[AGENDAMENTO-CONTROLLER] Atualizando agendamento ID {}. Peças previstas recebidas no PUT: {}",
                id,
                request.getPecasPrevistas() != null ? request.getPecasPrevistas().size() : 0
        );

        Agendamento atualizado = agendamentoService.atualizar(id, request);

        return ResponseEntity.ok(
                agendamentoMapper.toResponse(atualizado)
        );
    }

    @PatchMapping("/{id}/confirmar")
    public ResponseEntity<AgendamentoResponse> confirmar(
            @PathVariable Long id
    ) {
        log.info(
                "[AGENDAMENTO-CONTROLLER] Confirmando agendamento ID {}.",
                id
        );

        Agendamento confirmado = agendamentoService.confirmar(id);

        return ResponseEntity.ok(
                agendamentoMapper.toResponse(confirmado)
        );
    }

    @PatchMapping("/{id}/iniciar")
    public ResponseEntity<AgendamentoInicioResponse> iniciar(
            @PathVariable Long id
    ) {
        log.info(
                "[AGENDAMENTO-CONTROLLER] Iniciando atendimento a partir do agendamento ID {}.",
                id
        );

        AgendamentoService.ResultadoInicioAgendamento resultado =
                agendamentoService.iniciarComAtendimento(id);

        AgendamentoInicioResponse response = new AgendamentoInicioResponse(
                agendamentoMapper.toResponse(resultado.agendamento()),
                atendimentoMapper.toResponse(resultado.atendimento()),
                resultado.atendimentoCriado(),
                resultado.atendimentoCriado()
                        ? "Agendamento iniciado e atendimento criado com sucesso."
                        : "Agendamento iniciado. Já existia um atendimento vinculado a este agendamento."
        );

        return ResponseEntity.ok(response);
    }

    @PatchMapping("/{id}/concluir")
    public ResponseEntity<AgendamentoResponse> concluir(
            @PathVariable Long id
    ) {
        log.info(
                "[AGENDAMENTO-CONTROLLER] Concluindo agendamento ID {}.",
                id
        );

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
        log.info(
                "[AGENDAMENTO-CONTROLLER] Cancelando agendamento ID {}.",
                id
        );

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
        log.info(
                "[AGENDAMENTO-CONTROLLER] Marcando agendamento ID {} como não compareceu.",
                id
        );

        return ResponseEntity.ok(
                agendamentoMapper.toResponse(
                        agendamentoService.marcarNaoCompareceu(id)
                )
        );
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> excluirAgendamento(
            @PathVariable Long id
    ) {
        log.info(
                "[AGENDAMENTO-CONTROLLER] Excluindo agendamento ID {}.",
                id
        );

        agendamentoService.excluir(id);

        return ResponseEntity.noContent().build();
    }
}