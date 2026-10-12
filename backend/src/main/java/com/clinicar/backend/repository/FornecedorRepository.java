package com.clinicar.backend.repository;
import com.clinicar.backend.model.Fornecedor;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FornecedorRepository extends JpaRepository<Fornecedor, Long> {
    Optional<Fornecedor> findByCnpj(String cnpj);
    @org.springframework.data.jpa.repository.Query("select count(f) > 0 from Fornecedor f where lower(trim(f.email)) = :email and (:idIgnorado is null or f.id <> :idIgnorado)")
    boolean emailCadastrado(@org.springframework.data.repository.query.Param("email") String email,
                           @org.springframework.data.repository.query.Param("idIgnorado") Long idIgnorado);
 }
