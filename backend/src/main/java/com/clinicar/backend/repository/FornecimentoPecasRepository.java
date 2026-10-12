package com.clinicar.backend.repository;

import com.clinicar.backend.model.FornecimentoPecas;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FornecimentoPecasRepository
        extends JpaRepository<FornecimentoPecas, Long> {
    boolean existsByFornecedor_IdAndPeca_IdAndIdNot(Long fornecedorId, Long pecaId, Long id);

}