package com.clinicar.backend.repository;
import com.clinicar.backend.model.AuthSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import jakarta.persistence.LockModeType;
import java.util.Optional;

public interface AuthSessionRepository extends JpaRepository<AuthSession, Long> {
    @org.springframework.data.jpa.repository.Modifying(flushAutomatically = true)
    @org.springframework.data.jpa.repository.Query("update AuthSession s set s.revogado = true where s.usuarioId = :id and s.revogado = false")
    int revogarTodasDoUsuario(@org.springframework.data.repository.query.Param("id") Long id);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<AuthSession> findByTokenHashAndRevogadoFalse(String tokenHash);
}
