package com.clinicar.backend.repository;

import com.clinicar.backend.model.Agendamento;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface AgendamentoRepository extends JpaRepository<Agendamento, Long> {

    List<Agendamento> findAllByOrderByDataHoraInicioDesc();

    List<Agendamento> findByStatusAgendamentoOrderByDataHoraInicioAsc(
            String statusAgendamento
    );

    List<Agendamento> findByCliente_IdOrderByDataHoraInicioDesc(
            Long clienteId
    );

    List<Agendamento> findByVeiculo_IdOrderByDataHoraInicioDesc(
            Long veiculoId
    );

    List<Agendamento> findByDataHoraInicioBetweenOrderByDataHoraInicioAsc(
            LocalDateTime inicio,
            LocalDateTime fim
    );

    @Query("""
            SELECT COUNT(a)
            FROM Agendamento a
            WHERE a.veiculo.id = :veiculoId
              AND a.statusAgendamento NOT IN ('CANCELADO', 'CONCLUIDO', 'NAO_COMPARECEU')
              AND (:ignorarId IS NULL OR a.id <> :ignorarId)
              AND a.dataHoraInicio < :fim
              AND a.dataHoraFim > :inicio
            """)
    long contarSobreposicaoVeiculo(
            @Param("veiculoId") Long veiculoId,
            @Param("inicio") LocalDateTime inicio,
            @Param("fim") LocalDateTime fim,
            @Param("ignorarId") Long ignorarId
    );

    @Query("""
            SELECT COUNT(a)
            FROM Agendamento a
            WHERE a.responsavel.id = :responsavelId
              AND a.statusAgendamento NOT IN ('CANCELADO', 'CONCLUIDO', 'NAO_COMPARECEU')
              AND (:ignorarId IS NULL OR a.id <> :ignorarId)
              AND a.dataHoraInicio < :fim
              AND a.dataHoraFim > :inicio
            """)
    long contarSobreposicaoResponsavel(
            @Param("responsavelId") Long responsavelId,
            @Param("inicio") LocalDateTime inicio,
            @Param("fim") LocalDateTime fim,
            @Param("ignorarId") Long ignorarId
    );
}