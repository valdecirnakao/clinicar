package com.clinicar.backend.repository;

import com.clinicar.backend.model.HistoricoQuilometragemVeiculo;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface HistoricoQuilometragemVeiculoRepository
        extends JpaRepository<HistoricoQuilometragemVeiculo, Long> {

    List<HistoricoQuilometragemVeiculo> findByVeiculo_IdAndValidoParaCalculoTrueOrderByDataRegistroDesc(
            Long veiculoId,
            Pageable pageable
    );

    Optional<HistoricoQuilometragemVeiculo> findByAtendimento_Id(Long atendimentoId);

    default List<HistoricoQuilometragemVeiculo> buscarUltimosRegistrosValidos(
            Long veiculoId,
            int limite
    ) {
        int tamanho = limite > 0 ? limite : 8;
        return findByVeiculo_IdAndValidoParaCalculoTrueOrderByDataRegistroDesc(
                veiculoId,
                PageRequest.of(0, tamanho)
        );
    }
}
