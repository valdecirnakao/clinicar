package com.clinicar.backend.controller;

import com.clinicar.backend.dto.HistoricoVeicularResponse;
import com.clinicar.backend.service.HistoricoVeicularService;
import com.clinicar.backend.service.HistoricoVeicularPdfService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDate;

@RestController
@RequestMapping("/api/veiculo/{id}/historico")
@CrossOrigin(origins = "http://localhost:4200", allowCredentials = "true")
public class HistoricoVeicularController {
    private final HistoricoVeicularService service;
    private final HistoricoVeicularPdfService pdf;
    public HistoricoVeicularController(HistoricoVeicularService service, HistoricoVeicularPdfService pdf) { this.service = service; this.pdf = pdf; }

    @GetMapping
    public ResponseEntity<HistoricoVeicularResponse> consultar(@PathVariable Long id,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate inicio,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fim,
            @RequestParam(defaultValue = "TODOS") String situacao) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(service.consultar(id, inicio, fim, situacao));
    }

    @GetMapping(value = "/pdf", produces = MediaType.APPLICATION_PDF_VALUE)
    public ResponseEntity<byte[]> exportar(@PathVariable Long id,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate inicio,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fim,
            @RequestParam(defaultValue = "TODOS") String situacao) {
        var relatorio = service.consultar(id, inicio, fim, situacao);
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment().filename("historico-veicular-" + id + ".pdf").build().toString())
                .body(pdf.gerar(relatorio));
    }
    @ExceptionHandler(org.springframework.web.method.annotation.MethodArgumentTypeMismatchException.class)
    public ResponseEntity<java.util.Map<String, String>> filtroInvalido() {
        return ResponseEntity.badRequest().body(java.util.Map.of("mensagem", "Informe um veículo válido e datas no formato ano-mês-dia."));
    }
}
