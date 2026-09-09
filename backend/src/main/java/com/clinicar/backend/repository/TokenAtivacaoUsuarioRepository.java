package com.clinicar.backend.repository;

import com.clinicar.backend.model.TokenAtivacaoUsuario;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TokenAtivacaoUsuarioRepository
        extends JpaRepository<TokenAtivacaoUsuario, Long> {

    Optional<TokenAtivacaoUsuario> findByTokenHashAndRevogadoFalse(
            String tokenHash
    );

    List<TokenAtivacaoUsuario>
    findByUsuario_IdAndTipoAndRevogadoFalseAndUsadoEmIsNull(
            Long usuarioId,
            String tipo
    );
}