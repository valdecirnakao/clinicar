package com.clinicar.backend.repository;

import com.clinicar.backend.model.AtendimentoOrcamento;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.EntityGraph;
import java.util.List;
import java.util.Optional;

public interface AtendimentoOrcamentoRepository extends JpaRepository<AtendimentoOrcamento, Long> {
    Optional<AtendimentoOrcamento> findFirstByAtendimento_IdOrderByVersaoDesc(Long atendimentoId);
    @EntityGraph(attributePaths = {"atendimento", "decisor"})
    List<AtendimentoOrcamento> findTop50ByAtendimento_Cliente_IdOrderByCriadoEmDesc(Long clienteId);
    @EntityGraph(attributePaths = {"atendimento", "decisor"})
    List<AtendimentoOrcamento> findByAtendimento_IdOrderByVersaoDesc(Long atendimentoId);
}
