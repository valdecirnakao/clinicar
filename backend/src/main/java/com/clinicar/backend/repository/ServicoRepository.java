package com.clinicar.backend.repository;

import com.clinicar.backend.model.Servico;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface ServicoRepository extends JpaRepository<Servico, Long> {
    Optional<Servico> findById(Number id);
    Optional<Servico> findByDescricao(String descricao);
}