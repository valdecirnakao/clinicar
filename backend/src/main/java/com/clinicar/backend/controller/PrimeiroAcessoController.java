package com.clinicar.backend.controller;

import com.clinicar.backend.dto.setup.AdministradorInicialRequest;
import com.clinicar.backend.dto.setup.DefinirSenhaInicialRequest;
import com.clinicar.backend.dto.setup.MensagemResponse;
import com.clinicar.backend.dto.setup.SetupStatusResponse;
import com.clinicar.backend.dto.setup.ValidarTokenResponse;
import com.clinicar.backend.service.PrimeiroAcessoService;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/setup")
@RequiredArgsConstructor
public class PrimeiroAcessoController {

    private final PrimeiroAcessoService primeiroAcessoService;

    @GetMapping("/status")
    public ResponseEntity<SetupStatusResponse> consultarStatus() {
        return responder(HttpStatus.OK, primeiroAcessoService.consultarStatus());
    }

    @PostMapping("/administrador")
    public ResponseEntity<MensagemResponse> cadastrarAdministrador(
            @RequestBody AdministradorInicialRequest request) {
        return responder(HttpStatus.CREATED, primeiroAcessoService.cadastrarAdministrador(request));
    }

    @GetMapping("/ativacao/validar")
    public ResponseEntity<ValidarTokenResponse> validarToken(
            @RequestParam(name = "token", required = false) String token) {
        if (token == null || !token.trim().matches("[A-Za-z0-9_-]{43}")) {
            return responder(HttpStatus.BAD_REQUEST,
                    new ValidarTokenResponse(false, "Link de ativação inválido.", null));
        }
        ValidarTokenResponse resposta = primeiroAcessoService.validarToken(token);
        return responder(resposta.isValido() ? HttpStatus.OK : HttpStatus.GONE, resposta);
    }

    @PostMapping("/ativacao/definir-senha")
    public ResponseEntity<MensagemResponse> definirSenha(
            @RequestBody DefinirSenhaInicialRequest request) {
        return responder(HttpStatus.OK, primeiroAcessoService.definirSenha(request));
    }

    @PostMapping("/ativacao/reenviar")
    public ResponseEntity<MensagemResponse> reenviarAtivacao() {
        return responder(HttpStatus.ACCEPTED, primeiroAcessoService.reenviarAtivacao());
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<MensagemResponse> dadosInvalidos(IllegalArgumentException erro) {
        // As validações do service usam mensagens fixas, sem valores recebidos.
        return responder(HttpStatus.BAD_REQUEST, new MensagemResponse(erro.getMessage()));
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<MensagemResponse> jsonInvalido() {
        return responder(HttpStatus.BAD_REQUEST, new MensagemResponse("Requisição inválida."));
    }

    @ExceptionHandler({IllegalStateException.class, DataIntegrityViolationException.class})
    public ResponseEntity<MensagemResponse> conflito() {
        return responder(HttpStatus.CONFLICT,
                new MensagemResponse("Não foi possível concluir a operação com os dados e o estado atual do setup."));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<MensagemResponse> falhaInterna() {
        // Não devolver nem registrar a exceção: ela pode carregar parâmetros sensíveis.
        return responder(HttpStatus.INTERNAL_SERVER_ERROR,
                new MensagemResponse("Não foi possível concluir a operação. Tente novamente mais tarde."));
    }

    private <T> ResponseEntity<T> responder(HttpStatus status, T corpo) {
        return ResponseEntity.status(status).cacheControl(CacheControl.noStore()).body(corpo);
    }
}
