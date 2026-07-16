package com.clinicar.backend.repository;

import com.clinicar.backend.model.Servico;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ServicoRepository extends JpaRepository<Servico, Long> {

    Optional<Servico> findByNomeIgnoreCaseAndCategoriaIgnoreCase(
            String nome,
            String categoria
    );

    boolean existsByNomeIgnoreCaseAndCategoriaIgnoreCase(
            String nome,
            String categoria
    );

    List<Servico> findByAtivoTrue();
}