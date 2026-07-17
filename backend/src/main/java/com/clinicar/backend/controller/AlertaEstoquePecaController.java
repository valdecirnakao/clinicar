package com.clinicar.backend.controller;

import com.clinicar.backend.dto.AlertaEstoquePecaResponse;
import com.clinicar.backend.mapper.AlertaEstoquePecaMapper;
import com.clinicar.backend.service.AlertaEstoquePecaService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/alertas-estoque")
@CrossOrigin(origins = "http://localhost:4200", allowCredentials = "true")
public class AlertaEstoquePecaController {

    private final AlertaEstoquePecaService service;
    private final AlertaEstoquePecaMapper mapper;

    public AlertaEstoquePecaController(
            AlertaEstoquePecaService service,
            AlertaEstoquePecaMapper mapper
    ) {
        this.service = service;
        this.mapper = mapper;
    }

    @GetMapping
    public ResponseEntity<List<AlertaEstoquePecaResponse>> listarTodos() {
        return ResponseEntity.ok(mapper.toResponseList(service.listarTodos()));
    }

    @GetMapping("/abertos")
    public ResponseEntity<List<AlertaEstoquePecaResponse>> listarAbertos() {
        return ResponseEntity.ok(mapper.toResponseList(service.listarAbertos()));
    }

    @PatchMapping("/{id}/resolver")
    public ResponseEntity<AlertaEstoquePecaResponse> resolver(@PathVariable Long id) {
        return ResponseEntity.ok(mapper.toResponse(service.resolver(id)));
    }

    @PostMapping("/{id}/reenviar-whatsapp")
    public ResponseEntity<AlertaEstoquePecaResponse> reenviarWhatsapp(@PathVariable Long id) {
        return ResponseEntity.ok(mapper.toResponse(service.reenviarWhatsapp(id)));
    }
}