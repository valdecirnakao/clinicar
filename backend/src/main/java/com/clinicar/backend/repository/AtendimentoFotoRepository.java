package com.clinicar.backend.repository;

import com.clinicar.backend.model.AtendimentoFoto;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface AtendimentoFotoRepository extends JpaRepository<AtendimentoFoto, Long> {
    @org.springframework.data.jpa.repository.Query("select f.id, f.nomeArquivo, f.tipoMime, f.tamanhoBytes, f.autorId, f.registradoEm from AtendimentoFoto f where f.atendimentoId=:id order by f.registradoEm, f.id")
    List<Object[]> listarMetadados(@org.springframework.data.repository.query.Param("id") Long atendimentoId);
    long countByAtendimentoId(Long atendimentoId);
    Optional<AtendimentoFoto> findByIdAndAtendimentoId(Long id, Long atendimentoId);
}
