// FornecedorRepository.java
package com.clinicar.backend.repository;

import com.clinicar.backend.model.Fornecedor;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface FornecedorRepository extends JpaRepository<Fornecedor, Long> {
    Optional<Fornecedor> findByCnpj(String cnpj);
 }
