package com.clinicar.backend.controller;

import com.clinicar.backend.model.*;
import com.clinicar.backend.service.AlertaManutencaoService;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/configuracao-alerta-manutencao")
public class ConfiguracaoAlertaManutencaoController {
    private final AlertaManutencaoService service;
    public ConfiguracaoAlertaManutencaoController(AlertaManutencaoService service) { this.service = service; }
    @GetMapping public ConfiguracaoAlertaManutencao consultar() { return service.consultar(); }
    @PutMapping public ConfiguracaoAlertaManutencao salvar(@RequestBody ConfiguracaoAlertaManutencao entrada) {
        return service.salvar(entrada);
    }
    @GetMapping("/historico") public List<EnvioAlertaManutencao> historico() { return service.historico(); }
    @PostMapping("/historico/{id}/conciliar") public void conciliar(@PathVariable Long id, @RequestBody Conciliacao entrada) {
        if (entrada.enviado() == null) throw new IllegalArgumentException("Informe se o envio foi confirmado.");
        service.conciliar(id, entrada.enviado());
    }
    public record Conciliacao(Boolean enviado) {}
}
