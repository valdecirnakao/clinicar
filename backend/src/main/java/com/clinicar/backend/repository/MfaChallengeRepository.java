package com.clinicar.backend.repository;

import com.clinicar.backend.model.MfaChallenge;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import jakarta.persistence.LockModeType;

import java.util.List;
import java.util.Optional;

public interface MfaChallengeRepository extends JpaRepository<MfaChallenge, Long> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<MfaChallenge> findByTokenHashAndUsadoFalse(String tokenHash);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    List<MfaChallenge> findByUsuarioIdAndUsadoFalse(Long usuarioId);
}