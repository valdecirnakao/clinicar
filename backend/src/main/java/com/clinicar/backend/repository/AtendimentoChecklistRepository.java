package com.clinicar.backend.repository;

import com.clinicar.backend.model.AtendimentoChecklist;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface AtendimentoChecklistRepository extends JpaRepository<AtendimentoChecklist, Long> {
    List<AtendimentoChecklist> findByAtendimentoIdOrderByItem(Long atendimentoId);
    Optional<AtendimentoChecklist> findByAtendimentoIdAndItem(Long atendimentoId, String item);
}
