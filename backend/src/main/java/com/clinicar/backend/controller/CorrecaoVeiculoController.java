package com.clinicar.backend.controller;

import com.clinicar.backend.dto.UsuarioResponse;
import com.clinicar.backend.model.SolicitacaoCorrecaoVeiculo;
import com.clinicar.backend.service.CorrecaoVeiculoService;
import com.clinicar.backend.service.CorrecaoVeiculoService.DadosSolicitados;
import com.clinicar.backend.service.CorrecaoVeiculoService.Decisao;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.util.List;

@RestController
public class CorrecaoVeiculoController {
    private final CorrecaoVeiculoService service;
    public CorrecaoVeiculoController(CorrecaoVeiculoService service) { this.service = service; }

    @GetMapping("/api/cliente/veiculos/edicao")
    public List<CorrecaoVeiculoService.Edicao> dadosEdicao(@RequestAttribute("usuarioLogado") UsuarioResponse usuario) {
        return service.edicaoDoCliente(cliente(usuario));
    }
    @PostMapping("/api/cliente/veiculos/{id}/correcoes")
    @ResponseStatus(HttpStatus.CREATED)
    public SolicitacaoCorrecaoVeiculo solicitar(@RequestAttribute("usuarioLogado") UsuarioResponse usuario,
            @PathVariable Long id, @RequestBody DadosSolicitados dados) {
        return service.solicitar(cliente(usuario), id, dados);
    }
    @GetMapping("/api/veiculo/solicitacoes-correcao")
    public Page<SolicitacaoCorrecaoVeiculo> pendentes(@RequestAttribute("usuarioLogado") UsuarioResponse usuario,
            @RequestParam(defaultValue = "0") int pagina, @RequestParam(defaultValue = "10") int tamanho) {
        administrador(usuario);
        return service.listar(pagina, tamanho);
    }
    @PostMapping("/api/veiculo/solicitacoes-correcao/{id}/decisao")
    public SolicitacaoCorrecaoVeiculo decidir(@RequestAttribute("usuarioLogado") UsuarioResponse usuario,
            @PathVariable Long id, @RequestBody Decisao decisao) {
        return service.decidir(id, administrador(usuario), decisao);
    }
    private Long cliente(UsuarioResponse usuario) {
        if (usuario == null || !"CLIENTE".equalsIgnoreCase(usuario.getTipo_do_acesso())
                || !"ATIVO".equalsIgnoreCase(usuario.getStatus()))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        return usuario.getId();
    }
    private Long administrador(UsuarioResponse usuario) {
        if (usuario == null || !"ADMINISTRADOR".equalsIgnoreCase(usuario.getTipo_do_acesso())
                || !"ATIVO".equalsIgnoreCase(usuario.getStatus()))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        return usuario.getId();
    }
}
