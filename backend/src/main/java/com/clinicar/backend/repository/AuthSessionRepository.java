package com.clinicar.backend.repository;
import com.clinicar.backend.model.AuthSession;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface AuthSessionRepository extends JpaRepository<AuthSession, Long> {
    Optional<AuthSession> findByTokenHashAndRevogadoFalse(String tokenHash);
}
