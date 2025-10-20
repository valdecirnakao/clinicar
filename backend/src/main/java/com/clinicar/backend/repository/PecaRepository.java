package com.clinicar.backend.repository;

import com.clinicar.backend.model.Peca;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface PecaRepository extends JpaRepository<Peca, Long> {
    Optional<Peca> findById(Long id);
    Peca findByNomeAndTipo(String nome, String tipo);
}