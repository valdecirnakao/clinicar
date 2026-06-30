package com.clinicar.backend.controller;

import com.clinicar.backend.dto.WhatsAppCadastroVeiculoRequest;
import com.clinicar.backend.service.WhatsAppService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/whatsapp")
@CrossOrigin(origins = "http://localhost:4200")
public class WhatsAppController {

    private final WhatsAppService whatsAppService;

    public WhatsAppController(WhatsAppService whatsAppService) {
        this.whatsAppService = whatsAppService;
    }

    @PostMapping("/cadastro-veiculo")
    public ResponseEntity<String> enviarMensagemCadastroVeiculo(
            @RequestBody WhatsAppCadastroVeiculoRequest request
    ) {
        String resposta = whatsAppService.enviarMensagemCadastroVeiculo(
                request.getTelefone(),
                request.getTemplate(),
                request.getLanguageCode(),
                request.getParametrosBody()
        );

        return ResponseEntity.ok(resposta);
    }
}