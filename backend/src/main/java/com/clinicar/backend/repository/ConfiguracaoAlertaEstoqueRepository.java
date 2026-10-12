package com.clinicar.backend.repository;

import com.clinicar.backend.model.ConfiguracaoAlertaEstoque;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ConfiguracaoAlertaEstoqueRepository extends JpaRepository<ConfiguracaoAlertaEstoque, Long> {

    Optional<ConfiguracaoAlertaEstoque> findFirstByAtivoTrueOrderByIdAsc();
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("select c from ConfiguracaoAlertaEstoque c where c.id = 1")
    Optional<ConfiguracaoAlertaEstoque> bloquear();}