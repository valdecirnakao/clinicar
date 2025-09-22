package com.clinicar.backend.repository;

import com.clinicar.backend.model.Usuario;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface UsuarioRepository extends JpaRepository<Usuario, Long> {
    Optional<Usuario> findByEmail(String email);
    Usuario findByEmailAndSenha(String email, String senha);
}