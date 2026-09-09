package com.clinicar.backend.repository;
import com.clinicar.backend.model.AuthSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import jakarta.persistence.LockModeType;
import java.util.Optional;

public interface AuthSessionRepository extends JpaRepository<AuthSession, Long> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<AuthSession> findByTokenHashAndRevogadoFalse(String tokenHash);
}
