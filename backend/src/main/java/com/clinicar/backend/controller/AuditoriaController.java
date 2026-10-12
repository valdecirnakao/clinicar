package com.clinicar.backend.controller;

import com.clinicar.backend.dto.UsuarioResponse;
import com.clinicar.backend.service.AuditoriaConsultaService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDate;

@RestController @RequestMapping("/api/auditoria") @RequiredArgsConstructor
public class AuditoriaController {
    private final AuditoriaConsultaService service;
    @GetMapping
    public ResponseEntity<?> consultar(@RequestAttribute(name="usuarioLogado",required=false) UsuarioResponse ator,
            @RequestParam(required=false) LocalDate inicio, @RequestParam(required=false) LocalDate fim,
            @RequestParam(defaultValue="") String busca, @RequestParam(defaultValue="") String componente,
            @RequestParam(defaultValue="") String operacao, @RequestParam(required=false) Long responsavelId,
            @RequestParam(required=false) Long registroId, @RequestParam(defaultValue="0") int pagina,
            @RequestParam(defaultValue="10") int tamanho, @RequestParam(defaultValue="dataHora") String ordenar,
            @RequestParam(defaultValue="true") boolean decrescente) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(service.consultar(ator,
            new AuditoriaConsultaService.Filtro(inicio,fim,busca,componente,operacao,responsavelId,registroId,pagina,tamanho,ordenar,decrescente)));
    }
    @GetMapping("/{origem}/{id}")
    public ResponseEntity<?> detalhe(@RequestAttribute(name="usuarioLogado",required=false) UsuarioResponse ator,
            @PathVariable String origem,@PathVariable long id) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(service.detalhe(ator,origem,id));
    }
    @GetMapping("/exportar")
    public ResponseEntity<String> exportar(@RequestAttribute(name="usuarioLogado",required=false) UsuarioResponse ator,
            @RequestParam(required=false) LocalDate inicio,@RequestParam(required=false) LocalDate fim,
            @RequestParam(defaultValue="") String busca,@RequestParam(defaultValue="") String componente,
            @RequestParam(defaultValue="") String operacao,@RequestParam(required=false) Long responsavelId,
            @RequestParam(required=false) Long registroId) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore())
            .header(HttpHeaders.CONTENT_DISPOSITION,"attachment; filename=auditoria-clinicar.csv")
            .contentType(MediaType.parseMediaType("text/csv;charset=UTF-8"))
            .body(service.exportar(ator,new AuditoriaConsultaService.Filtro(inicio,fim,busca,componente,operacao,
                responsavelId,registroId,0,100,"dataHora",true)));
    }
}
