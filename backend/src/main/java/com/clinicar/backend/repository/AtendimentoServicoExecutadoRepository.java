package com.clinicar.backend.repository;

import com.clinicar.backend.model.AtendimentoServicoExecutado;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

public interface AtendimentoServicoExecutadoRepository extends JpaRepository<AtendimentoServicoExecutado, Long> {

    List<AtendimentoServicoExecutado> findByAtendimento_IdOrderByCriadoEmAsc(Long atendimentoId);

    Optional<AtendimentoServicoExecutado> findFirstByAtendimento_IdAndServico_IdOrderByCriadoEmAsc(
            Long atendimentoId,
            Long servicoId
    );

    @Query("""
            SELECT i
            FROM AtendimentoServicoExecutado i
            JOIN FETCH i.atendimento a
            JOIN FETCH i.servico s
            LEFT JOIN FETCH i.responsavel r
            LEFT JOIN FETCH i.fornecedor f
            WHERE a.id = :atendimentoId
            ORDER BY i.criadoEm ASC
            """)
    List<AtendimentoServicoExecutado> buscarPorAtendimentoComRelacionamentos(
            @Param("atendimentoId") Long atendimentoId
    );

    @Query("""
            SELECT i
            FROM AtendimentoServicoExecutado i
            JOIN FETCH i.atendimento a
            JOIN FETCH i.servico s
            LEFT JOIN FETCH i.responsavel r
            LEFT JOIN FETCH i.fornecedor f
            WHERE i.id = :id
            """)
    Optional<AtendimentoServicoExecutado> buscarPorIdComRelacionamentos(
            @Param("id") Long id
    );

    @Query("""
            SELECT CASE WHEN COUNT(i) > 0 THEN true ELSE false END
            FROM AtendimentoServicoExecutado i
            WHERE i.atendimento.id = :atendimentoId
              AND i.servico.id = :servicoId
              AND UPPER(COALESCE(i.statusItem, '')) <> 'CANCELADO'
            """)
    boolean existsServicoAtivoNoAtendimento(
            @Param("atendimentoId") Long atendimentoId,
            @Param("servicoId") Long servicoId
    );

    @Query("""
            SELECT COALESCE(SUM(COALESCE(i.valorMaoObra, 0) * COALESCE(i.quantidade, 1)), 0)
            FROM AtendimentoServicoExecutado i
            WHERE i.atendimento.id = :atendimentoId
              AND UPPER(COALESCE(i.statusItem, '')) <> 'CANCELADO'
            """)
    BigDecimal somarMaoObraPorAtendimento(@Param("atendimentoId") Long atendimentoId);

    @Query("""
            SELECT COALESCE(SUM(COALESCE(i.valorTerceiro, 0)), 0)
            FROM AtendimentoServicoExecutado i
            WHERE i.atendimento.id = :atendimentoId
              AND UPPER(COALESCE(i.statusItem, '')) <> 'CANCELADO'
            """)
    BigDecimal somarTerceirosPorAtendimento(@Param("atendimentoId") Long atendimentoId);

    @Query("""
            SELECT COALESCE(SUM(COALESCE(i.desconto, 0)), 0)
            FROM AtendimentoServicoExecutado i
            WHERE i.atendimento.id = :atendimentoId
              AND UPPER(COALESCE(i.statusItem, '')) <> 'CANCELADO'
            """)
    BigDecimal somarDescontosPorAtendimento(@Param("atendimentoId") Long atendimentoId);

    @Query("""
            SELECT COALESCE(SUM(COALESCE(i.valorTotal, 0)), 0)
            FROM AtendimentoServicoExecutado i
            WHERE i.atendimento.id = :atendimentoId
              AND UPPER(COALESCE(i.statusItem, '')) <> 'CANCELADO'
            """)
    BigDecimal somarValorTotalServicosPorAtendimento(@Param("atendimentoId") Long atendimentoId);

    long countByAtendimento_Id(Long atendimentoId);

    @Query("""
            SELECT COUNT(i)
            FROM AtendimentoServicoExecutado i
            WHERE i.atendimento.id = :atendimentoId
              AND UPPER(COALESCE(i.statusItem, '')) <> 'CANCELADO'
            """)
    long contarServicosAtivosPorAtendimento(@Param("atendimentoId") Long atendimentoId);
}
