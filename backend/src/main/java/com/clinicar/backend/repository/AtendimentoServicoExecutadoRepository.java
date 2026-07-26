package com.clinicar.backend.repository;

import com.clinicar.backend.model.AtendimentoServicoExecutado;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.util.List;

public interface AtendimentoServicoExecutadoRepository extends JpaRepository<AtendimentoServicoExecutado, Long> {

    List<AtendimentoServicoExecutado> findByAtendimento_IdOrderByCriadoEmAsc(Long atendimentoId);

    @Query("""
            SELECT COALESCE(SUM(i.valorMaoObra), 0)
            FROM AtendimentoServicoExecutado i
            WHERE i.atendimento.id = :atendimentoId
              AND i.statusItem <> 'CANCELADO'
            """)
    BigDecimal somarMaoObraPorAtendimento(@Param("atendimentoId") Long atendimentoId);

    @Query("""
            SELECT COALESCE(SUM(i.valorTerceiro), 0)
            FROM AtendimentoServicoExecutado i
            WHERE i.atendimento.id = :atendimentoId
              AND i.statusItem <> 'CANCELADO'
            """)
    BigDecimal somarTerceirosPorAtendimento(@Param("atendimentoId") Long atendimentoId);

    long countByAtendimento_Id(Long atendimentoId);
}