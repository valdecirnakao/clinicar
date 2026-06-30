package com.clinicar.backend.controller;

import com.clinicar.backend.dto.EsqueciSenhaRequest;
import com.clinicar.backend.dto.RedefinirSenhaRequest;
import com.clinicar.backend.service.RecuperacaoSenhaService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "http://localhost:4200")
public class AuthController {

    private final RecuperacaoSenhaService recuperacaoSenhaService;

    public AuthController(RecuperacaoSenhaService recuperacaoSenhaService) {
        this.recuperacaoSenhaService = recuperacaoSenhaService;
    }

    @PostMapping("/esqueci-senha")
    public ResponseEntity<String> esqueciSenha(
            @RequestBody EsqueciSenhaRequest request
    ) {
        recuperacaoSenhaService.solicitarRedefinicaoSenha(request.getEmail());

        /*
         * Mensagem genérica de propósito.
         * Não informa se o e-mail existe ou não no sistema.
         */
        return ResponseEntity.ok(
                "Se este e-mail estiver cadastrado, enviaremos instruções para redefinir sua senha."
        );
    }

    @PostMapping("/redefinir-senha")
    public ResponseEntity<String> redefinirSenha(
            @RequestBody RedefinirSenhaRequest request
    ) {
        recuperacaoSenhaService.redefinirSenha(
                request.getToken(),
                request.getNovaSenha(),
                request.getConfirmarSenha()
        );

        return ResponseEntity.ok("Senha redefinida com sucesso.");
    }
}