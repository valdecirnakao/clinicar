package com.clinicar.backend.controller;

import com.clinicar.backend.dto.AtendimentoResponse;
import com.clinicar.backend.mapper.AtendimentoMapper;
import com.clinicar.backend.service.AtendimentoTotaisService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/atendimento")
@CrossOrigin(origins = "http://localhost:4200", allowCredentials = "true")
public class AtendimentoTotaisController {

    private final AtendimentoTotaisService atendimentoTotaisService;
    private final AtendimentoMapper atendimentoMapper;

    public AtendimentoTotaisController(
            AtendimentoTotaisService atendimentoTotaisService,
            AtendimentoMapper atendimentoMapper
    ) {
        this.atendimentoTotaisService = atendimentoTotaisService;
        this.atendimentoMapper = atendimentoMapper;
    }

    @PostMapping("/{id}/recalcular-totais")
    public ResponseEntity<AtendimentoResponse> recalcularTotais(
            @PathVariable Long id
    ) {
        return ResponseEntity.ok(
                atendimentoMapper.toResponse(
                        atendimentoTotaisService.recalcularTotais(id)
                )
        );
    }
}