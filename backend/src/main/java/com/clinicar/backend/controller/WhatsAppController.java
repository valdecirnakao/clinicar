package com.clinicar.backend.controller;
import com.clinicar.backend.dto.WhatsAppCadastroUsuarioDTO;
import com.clinicar.backend.dto.WhatsAppRequestDTO;
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

    @PostMapping("/teste")
    public ResponseEntity<String> enviarTeste() {
        String resposta = whatsAppService.enviarMensagemTemplate(
                "5511966063558"
        );

        return ResponseEntity.ok(resposta);
    }

    @PostMapping("/enviar")
    public ResponseEntity<String> enviarMensagem(
            @RequestBody WhatsAppRequestDTO request
    ) {
        String resposta = whatsAppService.enviarMensagemTemplate(
                request.getTelefone()
        );

        return ResponseEntity.ok(resposta);
    }

    @PostMapping("/cadastro-usuario")
    public ResponseEntity<String> enviarCadastroUsuario(@RequestBody WhatsAppCadastroUsuarioDTO request) {
        String resposta = whatsAppService.enviarMensagemCadastroUsuario(
            request.getTelefone(),
            request.getNome()
        );
        return ResponseEntity.ok(resposta);
    }
}