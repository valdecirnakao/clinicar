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
    @GetMapping("/clientes") public org.springframework.data.domain.Page<AlertaManutencaoService.ClienteConfiguracao> clientes(
            @RequestParam(defaultValue = "") String busca, @RequestParam(defaultValue = "0") int pagina,
            @RequestParam(defaultValue = "10") int tamanho, @RequestParam(defaultValue = "nome") String ordenar,
            @RequestParam(defaultValue = "false") boolean decrescente) {
        return service.listarClientes(busca, pagina, tamanho, ordenar, decrescente);
    }
    @GetMapping public ConfiguracaoAlertaManutencao consultar(@RequestParam Long usuarioId) { return service.consultar(usuarioId); }
    @PutMapping public ConfiguracaoAlertaManutencao salvar(@RequestParam Long usuarioId, @RequestBody ConfiguracaoAlertaManutencao entrada) {
        return service.salvar(usuarioId, entrada);
    }
    @GetMapping("/historico") public List<EnvioAlertaManutencao> historico(@RequestParam Long usuarioId) { return service.historico(usuarioId); }
    @PostMapping("/historico/{id}/conciliar") public void conciliar(@PathVariable Long id, @RequestBody Conciliacao entrada) {
        if (entrada.enviado() == null) throw new IllegalArgumentException("Informe se o envio foi confirmado.");
        service.conciliar(id, entrada.enviado());
    }
    public record Conciliacao(Boolean enviado) {}
}
