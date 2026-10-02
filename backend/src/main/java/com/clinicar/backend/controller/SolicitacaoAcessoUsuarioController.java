package com.clinicar.backend.controller;

import com.clinicar.backend.dto.*;
import com.clinicar.backend.service.SolicitacaoAcessoUsuarioService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController @RequiredArgsConstructor
@RequestMapping("/api/usuario/solicitacoes-acesso")
@CrossOrigin(origins = "http://localhost:4200", allowCredentials = "true")
public class SolicitacaoAcessoUsuarioController {
    private final SolicitacaoAcessoUsuarioService service;
    @GetMapping("/minhas")
    public ResponseEntity<PaginaSolicitacoesAcesso> minhas(@RequestAttribute(name = "usuarioLogado", required = false) UsuarioResponse ator,
            @RequestParam(defaultValue = "0") int pagina, @RequestParam(defaultValue = "10") int tamanho) {
        return resposta(service.minhas(identificar(ator), pagina, tamanho));
    }
    @PostMapping("/minhas")
    public ResponseEntity<SolicitacaoAcessoResponse> criar(@RequestAttribute(name = "usuarioLogado", required = false) UsuarioResponse ator,
            @RequestBody(required = false) SolicitacaoAcessoRequest pedido) {
        return ResponseEntity.status(HttpStatus.CREATED).cacheControl(CacheControl.noStore()).body(service.criar(identificar(ator), pedido));
    }
    @GetMapping
    public ResponseEntity<PaginaSolicitacoesAcesso> listar(@RequestAttribute(name = "usuarioLogado", required = false) UsuarioResponse ator,
            @RequestParam(defaultValue = "PENDENTE") String status, @RequestParam(defaultValue = "0") int pagina,
            @RequestParam(defaultValue = "10") int tamanho) {
        return resposta(service.listar(identificar(ator), status, pagina, tamanho));
    }
    @PutMapping("/{id}/decisao")
    public ResponseEntity<SolicitacaoAcessoResponse> decidir(@PathVariable Long id,
            @RequestAttribute(name = "usuarioLogado", required = false) UsuarioResponse ator,
            @RequestBody(required = false) DecisaoSolicitacaoAcessoRequest pedido) {
        return resposta(service.decidir(id, identificar(ator), pedido));
    }
    private Long identificar(UsuarioResponse ator) {
        if (ator == null || ator.getId() == null || !"ATIVO".equalsIgnoreCase(ator.getStatus())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Sessão inválida ou expirada.");
        }
        return ator.getId();
    }
    private <T> ResponseEntity<T> resposta(T corpo) { return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(corpo); }
}
