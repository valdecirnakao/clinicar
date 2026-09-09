package com.clinicar.backend.controller;
import com.clinicar.backend.dto.MfaValidarRequest;
import com.clinicar.backend.dto.UsuarioResponse;
import com.clinicar.backend.service.MfaService;
import com.clinicar.backend.dto.EsqueciSenhaRequest;
import com.clinicar.backend.dto.RedefinirSenhaRequest;
import com.clinicar.backend.service.RecuperacaoSenhaService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import com.clinicar.backend.service.SessionService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "http://localhost:4200", allowCredentials = "true")
public class AuthController {

    private final RecuperacaoSenhaService recuperacaoSenhaService;
    private final MfaService mfaService;
    private final SessionService sessionService;
    public AuthController(
        RecuperacaoSenhaService recuperacaoSenhaService,
        MfaService mfaService,
        SessionService sessionService
    ) {
        this.recuperacaoSenhaService = recuperacaoSenhaService;
        this.mfaService = mfaService;
        this.sessionService = sessionService;
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

    @PostMapping("/mfa/validar")
        public ResponseEntity<UsuarioResponse> validarMfa(
            @RequestBody MfaValidarRequest request
        ) {
        UsuarioResponse usuario = mfaService.validarMfa(
            request.getMfaToken(),
            request.getCodigo()
        );
        ResponseCookie cookie = sessionService.criarSessaoCookie(usuario.getId());
        return ResponseEntity
            .ok()
            .header(HttpHeaders.SET_COOKIE, cookie.toString())
            .body(usuario);
    }

    @GetMapping("/me")
        public ResponseEntity<UsuarioResponse> me(
        @CookieValue(name = "${clinicar.session.cookie-name}", required = false) String token
    ) {
        return sessionService.validarSessao(token)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.status(401).build());
    }

    @PostMapping("/logout")
    public ResponseEntity<String> logout(
        @CookieValue(name = "${clinicar.session.cookie-name}", required = false) String token
    ) {
        sessionService.revogarSessao(token);
        ResponseCookie cookieLimpo = sessionService.limparCookie();
        return ResponseEntity
            .ok()
            .header(HttpHeaders.SET_COOKIE, cookieLimpo.toString())
            .body("Logout realizado com sucesso.");
    }
}