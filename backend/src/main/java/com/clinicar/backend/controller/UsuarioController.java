package com.clinicar.backend.controller;

import com.clinicar.backend.dto.LoginResponse;
import com.clinicar.backend.dto.UsuarioRequest;
import com.clinicar.backend.dto.UsuarioResponse;
import com.clinicar.backend.mapper.UsuarioMapper;
import com.clinicar.backend.model.Usuario;
import com.clinicar.backend.repository.UsuarioRepository;
import com.clinicar.backend.service.MfaService;
import com.clinicar.backend.service.UsuarioService;
import com.clinicar.backend.service.SessionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@Slf4j
@RestController
@RequestMapping("/api/usuario")
@CrossOrigin(origins = "http://localhost:4200", allowCredentials = "true")
@RequiredArgsConstructor
public class UsuarioController {

    private final UsuarioRepository usuarioRepository;
    private final UsuarioService usuarioService;
    private final MfaService mfaService;
    private final UsuarioMapper usuarioMapper;
    private final SessionService sessionService;

    @PostMapping
    public ResponseEntity<UsuarioResponse> criarUsuario(
            @RequestBody UsuarioRequest request,
            @CookieValue(name = "${clinicar.session.cookie-name}", required = false) String tokenSessao
    ) {
        UsuarioResponse salvo;
        if (tokenSessao != null && !tokenSessao.isBlank()) {
            Optional<UsuarioResponse> solicitante = sessionService.validarSessao(tokenSessao);
            if (solicitante.isEmpty() || !"ATIVO".equalsIgnoreCase(solicitante.get().getStatus())) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
            }

            // O perfil administrativo vem da sessão validada, nunca do JSON de cadastro.
            if ("ADMINISTRADOR".equalsIgnoreCase(solicitante.get().getTipo_do_acesso())) {
                salvo = usuarioService.criarPorAdministrador(request);
            } else {
                salvo = usuarioService.criar(request);
            }
        } else {
            salvo = usuarioService.criar(request);
        }

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(salvo);
    }

    @PostMapping("/login")
    public ResponseEntity<Object> login(
            @RequestBody Map<String, String> loginData
    ) {
        String email = loginData.get("email");
        String senha = loginData.get("senha");

        Optional<Usuario> usuarioOpt = usuarioService.autenticar(email, senha);

        if (usuarioOpt.isEmpty()) {
            return ResponseEntity
                    .status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("mensagem", "E-mail ou senha inválidos."));
        }

        Usuario usuario = usuarioOpt.get();

        /*
         * Como todos os usuários usam MFA/TOTP, o login não devolve usuário direto.
         * Ele devolve um desafio MFA.
         */
        LoginResponse response = mfaService.prepararSegundoFator(usuario);

        return ResponseEntity.ok(response);
    }

    @GetMapping("/email/{email}")
    public ResponseEntity<UsuarioResponse> buscarPorEmail(
            @PathVariable String email,
            @RequestAttribute(name = "usuarioLogado", required = false) UsuarioResponse solicitante
    ) {
        HttpStatus bloqueio = verificarAcesso(solicitante, false);
        if (bloqueio != null) {
            return ResponseEntity.status(bloqueio).build();
        }
        if (email == null || email.isBlank()) {
            return ResponseEntity.badRequest().build();
        }

        if (!administrador(solicitante)
                && !email.trim().equalsIgnoreCase(solicitante.getEmail())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        Optional<Usuario> usuario = usuarioRepository.findByEmailIgnoreCase(email.trim());

        if (usuario.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }

        if (!administrador(solicitante) && !solicitante.getId().equals(usuario.get().getId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        return ResponseEntity.ok(usuarioMapper.toResponse(usuario.get()));
    }

    @GetMapping
    public ResponseEntity<List<UsuarioResponse>> listarTodos(
            @RequestAttribute(name = "usuarioLogado", required = false) UsuarioResponse solicitante
    ) {
        HttpStatus bloqueio = verificarAcesso(solicitante, true);
        if (bloqueio != null) {
            return ResponseEntity.status(bloqueio).build();
        }
        List<UsuarioResponse> usuarios = usuarioRepository.findAll()
                .stream()
                .map(usuarioMapper::toResponse)
                .toList();

        return ResponseEntity.ok(usuarios);
    }

    @PutMapping("/{id}")
    public ResponseEntity<UsuarioResponse> atualizarUsuario(
            @PathVariable Long id,
            @RequestBody UsuarioRequest request,
            @RequestAttribute(name = "usuarioLogado", required = false) UsuarioResponse solicitante
    ) {
        HttpStatus bloqueio = verificarAcesso(solicitante, false);
        if (bloqueio != null) {
            return ResponseEntity.status(bloqueio).build();
        }
        if (!administrador(solicitante) && !solicitante.getId().equals(id)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        log.info("Recebida solicitação para atualizar usuário ID {}.", id);

        /*
         * IMPORTANTE:
         *
         * Não atualizar o usuário diretamente pelo repository aqui.
         * A atualização precisa passar pelo UsuarioService
         * para validar e-mail único, detectar alteração cadastral e publicar
         * o evento que dispara o WhatsApp.
         */
        UsuarioResponse atualizado = administrador(solicitante)
                ? usuarioService.atualizarPorAdministrador(id, request)
                : usuarioService.atualizarProprio(solicitante.getId(), request);

        return ResponseEntity.ok(atualizado);
    }

    @PutMapping("/{id}/resetar-mfa")
    public ResponseEntity<Map<String, String>> resetarMfaUsuario(
            @PathVariable Long id,
            @RequestAttribute(name = "usuarioLogado", required = false) UsuarioResponse solicitante
    ) {
        HttpStatus bloqueio = verificarAcesso(solicitante, true);
        if (bloqueio != null) {
            return ResponseEntity.status(bloqueio).build();
        }
        log.info("Recebida solicitação para resetar MFA do usuário ID {}.", id);

        mfaService.resetarMfaUsuario(id);

        return ResponseEntity.ok(
                Map.of("mensagem", "Autenticação em duas etapas resetada com sucesso.")
        );
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> removerUsuario(
            @PathVariable Long id,
            @RequestAttribute(name = "usuarioLogado", required = false) UsuarioResponse solicitante
    ) {
        HttpStatus bloqueio = verificarAcesso(solicitante, true);
        if (bloqueio != null) {
            return ResponseEntity.status(bloqueio).build();
        }
        if (!usuarioRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }

        usuarioRepository.deleteById(id);

        return ResponseEntity.noContent().build();
    }

    private HttpStatus verificarAcesso(UsuarioResponse solicitante, boolean exigeAdministrador) {
        if (solicitante == null || solicitante.getId() == null
                || !"ATIVO".equalsIgnoreCase(solicitante.getStatus())) {
            return HttpStatus.UNAUTHORIZED;
        }
        if (exigeAdministrador && !administrador(solicitante)) {
            return HttpStatus.FORBIDDEN;
        }
        return null;
    }

    private boolean administrador(UsuarioResponse solicitante) {
        return "ADMINISTRADOR".equalsIgnoreCase(solicitante.getTipo_do_acesso());
    }
}