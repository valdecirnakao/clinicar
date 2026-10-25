package com.clinicar.backend.repository;

import com.clinicar.backend.model.AtendimentoPausa;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface AtendimentoPausaRepository extends JpaRepository<AtendimentoPausa, Long> {
    Optional<AtendimentoPausa> findFirstByAtendimentoIdAndRetomadoEmIsNullOrderByPausadoEmDesc(Long atendimentoId);
    List<AtendimentoPausa> findByAtendimentoIdOrderByPausadoEmDesc(Long atendimentoId);
}
