package com.clinicar.backend.repository;

import com.clinicar.backend.model.AlertaEstoquePeca;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface AlertaEstoquePecaRepository
        extends JpaRepository<AlertaEstoquePeca, Long> {

    List<AlertaEstoquePeca> findAllByOrderByCriadoEmDesc();

    List<AlertaEstoquePeca> findByStatusAlertaOrderByCriadoEmDesc(
            String statusAlerta
    );

    Optional<AlertaEstoquePeca> findFirstByEstoquePeca_IdAndNivelAlertaAndStatusAlertaOrderByCriadoEmDesc(
            Long estoquePecaId,
            String nivelAlerta,
            String statusAlerta
    );

    Optional<AlertaEstoquePeca> findFirstByEstoquePeca_IdAndStatusAlertaOrderByCriadoEmDesc(
            Long estoquePecaId,
            String statusAlerta
    );

    List<AlertaEstoquePeca> findByEstoquePeca_IdAndStatusAlerta(
            Long estoquePecaId,
            String statusAlerta
    );
}