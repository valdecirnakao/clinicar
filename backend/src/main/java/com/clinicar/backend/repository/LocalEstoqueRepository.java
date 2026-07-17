package com.clinicar.backend.repository;

import com.clinicar.backend.model.LocalEstoque;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface LocalEstoqueRepository extends JpaRepository<LocalEstoque, Long> {

    Optional<LocalEstoque> findByNomeIgnoreCase(String nome);

    List<LocalEstoque> findByAtivoTrue();
}