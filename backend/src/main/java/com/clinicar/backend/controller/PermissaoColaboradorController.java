package com.clinicar.backend.controller;

import com.clinicar.backend.dto.UsuarioResponse;
import com.clinicar.backend.model.PermissaoColaborador;
import com.clinicar.backend.service.PermissaoColaboradorService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/colaborador/permissoes")
public class PermissaoColaboradorController {
    private final PermissaoColaboradorService service;
    public PermissaoColaboradorController(PermissaoColaboradorService service) { this.service = service; }
    public record Alteracao(Boolean podeMecanica, Boolean podeEstoque) {}
    @GetMapping("/minhas") public PermissaoColaborador minhas(
            @RequestAttribute("usuarioLogado") UsuarioResponse sessao) {
        if (sessao == null || !"ATIVO".equalsIgnoreCase(sessao.getStatus())
                || !"COLABORADOR".equalsIgnoreCase(sessao.getTipo_do_acesso()))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Acesso exclusivo do colaborador.");
        return service.consultar(sessao.getId());
    }
    @GetMapping("/{id}") public PermissaoColaborador consultar(@PathVariable Long id,
            @RequestAttribute("usuarioLogado") UsuarioResponse sessao) {
        administrador(sessao); return service.consultar(id);
    }
    @PutMapping("/{id}") public PermissaoColaborador salvar(@PathVariable Long id, @RequestBody Alteracao alteracao,
            @RequestAttribute("usuarioLogado") UsuarioResponse sessao) {
        administrador(sessao);
        if (alteracao == null || alteracao.podeMecanica() == null || alteracao.podeEstoque() == null)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Informe as duas permissões.");
        return service.salvar(id, alteracao.podeMecanica(), alteracao.podeEstoque());
    }
    private void administrador(UsuarioResponse sessao) {
        if (sessao == null || !"ATIVO".equalsIgnoreCase(sessao.getStatus())
                || !"ADMINISTRADOR".equalsIgnoreCase(sessao.getTipo_do_acesso()))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Somente um administrador pode alterar permissões.");
    }
}
