package com.clinicar.backend.repository;

import com.clinicar.backend.model.EstoquePeca;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface EstoquePecaRepository extends JpaRepository<EstoquePeca, Long> {

    Optional<EstoquePeca> findByPeca_IdAndLocalEstoque_Id(
            Long pecaId,
            Long localEstoqueId
    );

    List<EstoquePeca> findByAtivoTrue();

    List<EstoquePeca> findByStatusEstoqueIn(List<String> status);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT e FROM EstoquePeca e WHERE e.id = :id")
    Optional<EstoquePeca> buscarComLockPorId(@Param("id") Long id);
}