package com.clinicar.backend.repository;

import com.clinicar.backend.model.PrevisaoManutencaoVeiculo;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PrevisaoManutencaoVeiculoRepository
        extends JpaRepository<PrevisaoManutencaoVeiculo, Long> {

    List<PrevisaoManutencaoVeiculo> findByVeiculo_IdAndGrupoManutencaoAndStatusPrevisaoIn(
            Long veiculoId,
            String grupoManutencao,
            List<String> statusPrevisao
    );
}