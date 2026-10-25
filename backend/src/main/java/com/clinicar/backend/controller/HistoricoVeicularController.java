package com.clinicar.backend.controller;

import com.clinicar.backend.dto.HistoricoVeicularResponse;
import com.clinicar.backend.dto.UsuarioResponse;
import com.clinicar.backend.repository.VeiculoRepository;
import com.clinicar.backend.service.HistoricoVeicularService;
import com.clinicar.backend.service.HistoricoVeicularPdfService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.time.LocalDate;

@RestController
@RequestMapping("/api/veiculo/{id}/historico")
@CrossOrigin(origins = "http://localhost:4200", allowCredentials = "true")
public class HistoricoVeicularController {
    private final HistoricoVeicularService service;
    private final HistoricoVeicularPdfService pdf;
    private final VeiculoRepository veiculos;
    public HistoricoVeicularController(HistoricoVeicularService service, HistoricoVeicularPdfService pdf,
            VeiculoRepository veiculos) { this.service = service; this.pdf = pdf; this.veiculos = veiculos; }

    @GetMapping
    public ResponseEntity<HistoricoVeicularResponse> consultar(@PathVariable Long id,
            @RequestAttribute("usuarioLogado") UsuarioResponse usuario,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate inicio,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fim,
            @RequestParam(defaultValue = "TODOS") String situacao) {
        autorizarVeiculo(id, usuario);
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(service.consultar(id, inicio, fim, situacao));
    }

    @GetMapping(value = "/pdf", produces = MediaType.APPLICATION_PDF_VALUE)
    public ResponseEntity<byte[]> exportar(@PathVariable Long id,
            @RequestAttribute("usuarioLogado") UsuarioResponse usuario,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate inicio,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fim,
            @RequestParam(defaultValue = "TODOS") String situacao) {
        autorizarVeiculo(id, usuario);
        var relatorio = service.consultar(id, inicio, fim, situacao);
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment().filename("historico-veicular-" + id + ".pdf").build().toString())
                .body(pdf.gerar(relatorio));
    }
    private void autorizarVeiculo(Long id, UsuarioResponse usuario) {
        if (usuario == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
        if ("CLIENTE".equalsIgnoreCase(usuario.getTipo_do_acesso())
                && (!"ATIVO".equalsIgnoreCase(usuario.getStatus()) || usuario.getId() == null
                    || !veiculos.existsByIdAndIdProprietario(id, usuario.getId()))) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Histórico disponível apenas ao proprietário do veículo.");
        }
    }
    @ExceptionHandler(org.springframework.web.method.annotation.MethodArgumentTypeMismatchException.class)
    public ResponseEntity<java.util.Map<String, String>> filtroInvalido() {
        return ResponseEntity.badRequest().body(java.util.Map.of("mensagem", "Informe um veículo válido e datas no formato ano-mês-dia."));
    }
}
