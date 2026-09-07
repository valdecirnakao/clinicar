package com.clinicar.backend.repository;

import com.clinicar.backend.model.AgendamentoPecaPrevista;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface AgendamentoPecaPrevistaRepository
        extends JpaRepository<AgendamentoPecaPrevista, Long> {

    List<AgendamentoPecaPrevista> findByAgendamento_Id(Long agendamentoId);

    List<AgendamentoPecaPrevista> findByAgendamento_IdAndStatusReserva(
            Long agendamentoId,
            String statusReserva
    );

    @Modifying(flushAutomatically = true, clearAutomatically = false)
    @Query("""
            delete from AgendamentoPecaPrevista item
            where item.agendamento.id = :agendamentoId
            """)
    void deleteByAgendamento_Id(@Param("agendamentoId") Long agendamentoId);
}