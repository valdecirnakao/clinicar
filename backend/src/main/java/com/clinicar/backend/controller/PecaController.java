package com.clinicar.backend.controller;

import com.clinicar.backend.dto.PecaRequest;
import com.clinicar.backend.dto.PecaResponse;
import com.clinicar.backend.mapper.PecaMapper;
import com.clinicar.backend.model.Peca;
import com.clinicar.backend.service.PecaService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/peca")
@CrossOrigin(origins = "http://localhost:4200", allowCredentials = "true")
public class PecaController {

    private final PecaService pecaService;
    private final PecaMapper pecaMapper;

    public PecaController(
            PecaService pecaService,
            PecaMapper pecaMapper
    ) {
        this.pecaService = pecaService;
        this.pecaMapper = pecaMapper;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public PecaResponse criar(@RequestBody PecaRequest request) {
        Peca salva = pecaService.criar(request);
        return pecaMapper.toResponse(salva);
    }

    @GetMapping
    public List<PecaResponse> listar() {
        return pecaMapper.toResponseList(
                pecaService.listarTodos()
        );
    }

    @GetMapping("/{id}")
    public PecaResponse buscarPorId(@PathVariable Long id) {
        return pecaMapper.toResponse(
                pecaService.buscarPorId(id)
        );
    }

    @PutMapping("/{id}")
    public PecaResponse atualizar(
            @PathVariable Long id,
            @RequestBody PecaRequest request
    ) {
        Peca atualizada = pecaService.atualizar(id, request);
        return pecaMapper.toResponse(atualizada);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void excluir(@PathVariable Long id) {
        pecaService.excluir(id);
    }
}