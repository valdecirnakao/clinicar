package com.clinicar.backend.repository;

import com.clinicar.backend.model.ConfiguracaoAlertaEstoque;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ConfiguracaoAlertaEstoqueRepository extends JpaRepository<ConfiguracaoAlertaEstoque, Long> {

    Optional<ConfiguracaoAlertaEstoque> findFirstByAtivoTrueOrderByIdAsc();
}