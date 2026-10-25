package com.clinicar.backend.controller;

import com.clinicar.backend.model.*;
import com.clinicar.backend.dto.UsuarioResponse;
import com.clinicar.backend.repository.UsuarioRepository;
import com.clinicar.backend.repository.EnvioAlertaManutencaoRepository;
import com.clinicar.backend.service.AlertaManutencaoService;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/configuracao-alerta-manutencao")
public class ConfiguracaoAlertaManutencaoController {
    private final AlertaManutencaoService service;
    private final UsuarioRepository usuarios;
    private final EnvioAlertaManutencaoRepository envios;
    public ConfiguracaoAlertaManutencaoController(AlertaManutencaoService service, UsuarioRepository usuarios,
            EnvioAlertaManutencaoRepository envios) { this.service = service; this.usuarios = usuarios; this.envios = envios; }
    @GetMapping("/clientes") public org.springframework.data.domain.Page<AlertaManutencaoService.ClienteConfiguracao> clientes(
            @RequestParam(defaultValue = "") String busca, @RequestParam(defaultValue = "0") int pagina,
            @RequestParam(defaultValue = "10") int tamanho, @RequestParam(defaultValue = "nome") String ordenar,
            @RequestParam(defaultValue = "false") boolean decrescente) {
        return service.listarClientes(busca, pagina, tamanho, ordenar, decrescente);
    }
    @GetMapping public ConfiguracaoAlertaManutencao consultar(@RequestParam Long usuarioId, @RequestAttribute(name="usuarioLogado", required=false) UsuarioResponse solicitante) {
        validarAcessoCliente(usuarioId, solicitante); return service.consultar(usuarioId);
    }
    @PutMapping public ConfiguracaoAlertaManutencao salvar(@RequestParam Long usuarioId, @RequestBody ConfiguracaoAlertaManutencao entrada,
            @RequestAttribute(name="usuarioLogado", required=false) UsuarioResponse solicitante) {
        validarAcessoCliente(usuarioId, solicitante);
        return service.salvar(usuarioId, entrada);
    }
    @GetMapping("/historico") public List<EnvioAlertaManutencao> historico(@RequestParam Long usuarioId,
            @RequestAttribute(name="usuarioLogado", required=false) UsuarioResponse solicitante) {
        validarAcessoCliente(usuarioId, solicitante);
        return service.historico(usuarioId);
    }
    @PostMapping("/historico/{id}/conciliar") public void conciliar(@PathVariable Long id, @RequestBody Conciliacao entrada,
            @RequestAttribute(name="usuarioLogado", required=false) UsuarioResponse solicitante) {
        Long proprietarioId = envios.buscarProprietario(id)
                .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.NOT_FOUND, "Envio não encontrado."));
        validarAcessoCliente(proprietarioId, solicitante);
        if (entrada.enviado() == null) throw new IllegalArgumentException("Informe se o envio foi confirmado.");
        service.conciliar(id, entrada.enviado());
    }
    public record Conciliacao(Boolean enviado) {}

    private void validarAcessoCliente(Long usuarioId, UsuarioResponse solicitante) {
        if (solicitante == null || !"ATIVO".equalsIgnoreCase(solicitante.getStatus()))
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.UNAUTHORIZED,"Sessão inválida.");
        if ("ADMINISTRADOR".equalsIgnoreCase(solicitante.getTipo_do_acesso())) return;
        if (!"COLABORADOR".equalsIgnoreCase(solicitante.getTipo_do_acesso()))
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.FORBIDDEN,"Acesso não autorizado.");
        var cliente=usuarios.findById(usuarioId).orElseThrow(() -> new IllegalArgumentException("Cliente não encontrado."));
        if (!"CLIENTE".equalsIgnoreCase(cliente.getTipo_do_acesso()))
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.FORBIDDEN,"A configuração deve pertencer a um cliente.");
    }
}
