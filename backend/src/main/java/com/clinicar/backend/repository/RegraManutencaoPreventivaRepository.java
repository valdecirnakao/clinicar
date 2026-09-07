package com.clinicar.backend.repository;

import com.clinicar.backend.model.RegraManutencaoPreventiva;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface RegraManutencaoPreventivaRepository
        extends JpaRepository<RegraManutencaoPreventiva, Long> {

    List<RegraManutencaoPreventiva> findAllByOrderByPrioridadeAscDescricaoAsc();

    List<RegraManutencaoPreventiva> findByAtivoTrueOrderByPrioridadeAsc();

    List<RegraManutencaoPreventiva> findByGrupoManutencaoAndAtivoTrueOrderByPrioridadeAsc(
            String grupoManutencao
    );

    List<RegraManutencaoPreventiva> findByOrigemOleoAndAtivoTrueOrderByPrioridadeAsc(
            String origemOleo
    );

    List<RegraManutencaoPreventiva> findByServico_IdAndAtivoTrueOrderByPrioridadeAsc(
            Long servicoId
    );

    List<RegraManutencaoPreventiva> findByPeca_IdAndAtivoTrueOrderByPrioridadeAsc(
            Long pecaId
    );

    boolean existsByGrupoManutencaoAndDescricaoIgnoreCase(
            String grupoManutencao,
            String descricao
    );

    @Query("""
            SELECT r
            FROM RegraManutencaoPreventiva r
            WHERE r.ativo = true
              AND r.grupoManutencao = :grupoManutencao
              AND r.origemOleo = :origemOleo
            ORDER BY r.prioridade ASC
            """)
    List<RegraManutencaoPreventiva> buscarRegrasAtivasPorGrupoEOrigemOleo(
            @Param("grupoManutencao") String grupoManutencao,
            @Param("origemOleo") String origemOleo
    );

    @Query("""
            SELECT r
            FROM RegraManutencaoPreventiva r
            WHERE r.ativo = true
              AND (
                    r.servico.id = :servicoId
                    OR r.peca.id = :pecaId
                    OR r.grupoManutencao = :grupoManutencao
                    OR r.origemOleo = :origemOleo
                  )
            ORDER BY r.prioridade ASC
            """)
    List<RegraManutencaoPreventiva> buscarRegrasAtivasAplicaveis(
            @Param("servicoId") Long servicoId,
            @Param("pecaId") Long pecaId,
            @Param("grupoManutencao") String grupoManutencao,
            @Param("origemOleo") String origemOleo
    );

    @Query("""
            SELECT r
            FROM RegraManutencaoPreventiva r
            WHERE r.ativo = true
              AND r.grupoManutencao = 'TROCA_OLEO'
            ORDER BY r.prioridade ASC
            """)
    List<RegraManutencaoPreventiva> buscarRegrasAtivasTrocaOleo();
}