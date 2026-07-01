package com.clinicar.backend.repository;

import com.clinicar.backend.model.MfaChallenge;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface MfaChallengeRepository extends JpaRepository<MfaChallenge, Long> {

    Optional<MfaChallenge> findByTokenHashAndUsadoFalse(String tokenHash);

    List<MfaChallenge> findByUsuarioIdAndUsadoFalse(Long usuarioId);
}