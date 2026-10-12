package com.clinicar.backend.repository;

import com.clinicar.backend.model.Veiculo;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface VeiculoRepository extends JpaRepository<Veiculo, Long> {
    @org.springframework.data.jpa.repository.Query("select (count(v) > 0) from Veiculo v where upper(replace(replace(trim(v.placa), '-', ''), ' ', '')) = :placa and (:ignorarId is null or v.id <> :ignorarId)")
    boolean placaCadastrada(@org.springframework.data.repository.query.Param("placa") String placa,
        @org.springframework.data.repository.query.Param("ignorarId") Long ignorarId);
    Optional<Veiculo> findByPlaca(String placa);
}
