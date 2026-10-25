package com.clinicar.backend.repository;

import com.clinicar.backend.model.Agendamento;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface AgendamentoRepository extends JpaRepository<Agendamento, Long> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT a FROM Agendamento a WHERE a.id = :id")
    Optional<Agendamento> buscarParaCancelamento(@Param("id") Long id);

    @Query("SELECT a.id FROM Agendamento a WHERE a.statusAgendamento = 'CONFIRMADO' "
            + "AND a.lembreteEnviado = false AND a.dataHoraInicio > :agora "
            + "AND a.dataHoraInicio <= :limite ORDER BY a.dataHoraInicio")
    List<Long> buscarLembretesPendentes(@Param("agora") LocalDateTime agora,
                                        @Param("limite") LocalDateTime limite,
                                        org.springframework.data.domain.Pageable pagina);

    boolean existsByVeiculo_Id(Long veiculoId);

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
              AND a.statusAgendamento IN ('CONFIRMADO', 'EM_ATENDIMENTO')
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
