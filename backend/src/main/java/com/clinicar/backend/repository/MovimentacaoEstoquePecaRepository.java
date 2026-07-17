package com.clinicar.backend.repository;

import com.clinicar.backend.model.MovimentacaoEstoquePeca;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MovimentacaoEstoquePecaRepository extends JpaRepository<MovimentacaoEstoquePeca, Long> {

    List<MovimentacaoEstoquePeca> findByEstoquePeca_IdOrderByCriadoEmDesc(Long estoquePecaId);

    List<MovimentacaoEstoquePeca> findByPeca_IdOrderByCriadoEmDesc(Long pecaId);
}