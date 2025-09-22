package com.clinicar.backend.controller;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import com.clinicar.backend.model.Usuario;
import com.clinicar.backend.repository.UsuarioRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/usuarios")
@CrossOrigin(origins = "http://localhost:4200") // Libera requisições do Angular
public class UsuarioController {

  @Autowired
  private UsuarioRepository usuarioRepository;

  @PostMapping
  public ResponseEntity<Usuario> criarUsuario(@RequestBody Usuario usuario) {
    Usuario salvo = usuarioRepository.save(usuario);
    return ResponseEntity.status(201).body(salvo);
  }

  @PostMapping("/login")
  public ResponseEntity<?> login(@RequestBody Map<String, String> loginData) {
    String email = loginData.get("email");
    String senha = loginData.get("senha");

    Usuario usuario = usuarioRepository.findByEmailAndSenha(email, senha);

    if (usuario != null) {
      return ResponseEntity.ok(usuario);
    }
    return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Email ou senha inválidos.");
  }

  @GetMapping("/email/{email}")
  public ResponseEntity<Usuario> buscarPorEmail(@PathVariable String email) {
    Optional<Usuario> usuario = usuarioRepository.findByEmail(email);
    return usuario.map(ResponseEntity::ok).orElse(ResponseEntity.status(HttpStatus.NOT_FOUND).build());
  }

  @GetMapping
  public ResponseEntity<List<Usuario>> listarTodos() {
    List<Usuario> usuarios = usuarioRepository.findAll();
    return ResponseEntity.ok(usuarios);
  }

  @PutMapping("/{id}")
public ResponseEntity<Usuario> atualizarUsuario(@PathVariable Long id, @RequestBody Usuario usuarioAtualizado) {
    Optional<Usuario> usuarioOptional = usuarioRepository.findById(id);
    if (usuarioOptional.isPresent()) {
        Usuario usuario = usuarioOptional.get();
        // Atualize todos os campos necessários
        usuario.setNome(usuarioAtualizado.getNome());
        usuario.setEmail(usuarioAtualizado.getEmail());
        usuario.setSenha(usuarioAtualizado.getSenha());
        usuario.setCpf(usuarioAtualizado.getCpf());
        usuario.setWhatsapp(usuarioAtualizado.getWhatsapp());
        usuario.setWhatsappapikey(usuarioAtualizado.getWhatsappapikey());
        usuario.setCep(usuarioAtualizado.getCep());
        usuario.setLogradouro(usuarioAtualizado.getLogradouro());
        usuario.setBairro(usuarioAtualizado.getBairro());
        usuario.setCidade(usuarioAtualizado.getCidade());
        usuario.setEstado(usuarioAtualizado.getEstado());
        usuario.setComplementoEndereco(usuarioAtualizado.getComplementoEndereco());
        usuario.setNumeroEndereco(usuarioAtualizado.getNumeroEndereco());
        usuarioRepository.save(usuario);
        return ResponseEntity.ok(usuario);
    } else {
        return ResponseEntity.notFound().build();
    }
}

@DeleteMapping("/{id}")
public ResponseEntity<Void> removerUsuario(@PathVariable Long id) {
    if (!usuarioRepository.existsById(id)) {
        return ResponseEntity.notFound().build();
    }
    usuarioRepository.deleteById(id);
    return ResponseEntity.noContent().build();
}

}
