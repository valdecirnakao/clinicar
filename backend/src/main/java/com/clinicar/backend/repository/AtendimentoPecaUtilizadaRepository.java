package com.clinicar.backend.repository;

import com.clinicar.backend.model.AtendimentoPecaUtilizada;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.util.List;

public interface AtendimentoPecaUtilizadaRepository extends JpaRepository<AtendimentoPecaUtilizada, Long> {

    List<AtendimentoPecaUtilizada> findByAtendimento_IdOrderByCriadoEmAsc(Long atendimentoId);

    @Query("""
            SELECT COALESCE(SUM(i.valorTotal), 0)
            FROM AtendimentoPecaUtilizada i
            WHERE i.atendimento.id = :atendimentoId
            """)
    BigDecimal somarValorTotalPorAtendimento(@Param("atendimentoId") Long atendimentoId);

    long countByAtendimento_Id(Long atendimentoId);
}