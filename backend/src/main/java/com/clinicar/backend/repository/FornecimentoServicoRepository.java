package com.clinicar.backend.repository;

import com.clinicar.backend.model.FornecimentoServico;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface FornecimentoServicoRepository extends JpaRepository<FornecimentoServico, Long> {

    Optional<FornecimentoServico> findByFornecedor_IdAndServico_Id(
            Long fornecedorId,
            Long servicoId
    );

    List<FornecimentoServico> findByAtivoTrue();

    List<FornecimentoServico> findByFornecedor_Id(Long fornecedorId);

    List<FornecimentoServico> findByServico_Id(Long servicoId);
}