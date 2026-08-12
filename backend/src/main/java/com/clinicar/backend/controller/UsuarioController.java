package com.clinicar.backend.controller;

import com.clinicar.backend.dto.LoginResponse;
import com.clinicar.backend.dto.UsuarioRequest;
import com.clinicar.backend.dto.UsuarioResponse;
import com.clinicar.backend.mapper.UsuarioMapper;
import com.clinicar.backend.model.Usuario;
import com.clinicar.backend.repository.UsuarioRepository;
import com.clinicar.backend.service.MfaService;
import com.clinicar.backend.service.UsuarioService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
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

    @PostMapping
    public ResponseEntity<UsuarioResponse> criarUsuario(
            @RequestBody UsuarioRequest request
    ) {
        UsuarioResponse salvo = usuarioService.criar(request);

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
            @PathVariable String email
    ) {
        if (email == null || email.isBlank()) {
            return ResponseEntity.badRequest().build();
        }

        Optional<Usuario> usuario = usuarioRepository.findByEmailIgnoreCase(email.trim());

        if (usuario.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }

        return ResponseEntity.ok(usuarioMapper.toResponse(usuario.get()));
    }

    @GetMapping
    public ResponseEntity<List<UsuarioResponse>> listarTodos() {
        List<UsuarioResponse> usuarios = usuarioRepository.findAll()
                .stream()
                .map(usuarioMapper::toResponse)
                .toList();

        return ResponseEntity.ok(usuarios);
    }

    @PutMapping("/{id}")
    public ResponseEntity<UsuarioResponse> atualizarUsuario(
            @PathVariable Long id,
            @RequestBody UsuarioRequest request
    ) {
        log.info("Recebida solicitação para atualizar usuário ID {}.", id);

        /*
         * IMPORTANTE:
         *
         * Não atualizar o usuário diretamente pelo repository aqui.
         * A atualização precisa passar pelo UsuarioService.atualizar(...)
         * para validar e-mail único, detectar alteração cadastral e publicar
         * o evento que dispara o WhatsApp.
         */
        UsuarioResponse atualizado = usuarioService.atualizar(id, request);

        return ResponseEntity.ok(atualizado);
    }

    @PutMapping("/{id}/resetar-mfa")
    public ResponseEntity<Map<String, String>> resetarMfaUsuario(
            @PathVariable Long id
    ) {
        log.info("Recebida solicitação para resetar MFA do usuário ID {}.", id);

        mfaService.resetarMfaUsuario(id);

        return ResponseEntity.ok(
                Map.of("mensagem", "Autenticação em duas etapas resetada com sucesso.")
        );
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> removerUsuario(
            @PathVariable Long id
    ) {
        if (!usuarioRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }

        usuarioRepository.deleteById(id);

        return ResponseEntity.noContent().build();
    }
}