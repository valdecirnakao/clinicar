package com.clinicar.backend.repository;

import com.clinicar.backend.model.SolicitacaoCorrecaoVeiculo;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;
import java.util.Optional;

public interface SolicitacaoCorrecaoVeiculoRepository extends JpaRepository<SolicitacaoCorrecaoVeiculo, Long> {
    Optional<SolicitacaoCorrecaoVeiculo> findByPendenciaVeiculoId(Long veiculoId);
    Optional<SolicitacaoCorrecaoVeiculo> findFirstByVeiculoIdAndClienteIdOrderBySolicitadoEmDesc(Long veiculoId, Long clienteId);
    Page<SolicitacaoCorrecaoVeiculo> findByStatusOrderBySolicitadoEmDesc(String status, Pageable pagina);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select s from SolicitacaoCorrecaoVeiculo s where s.id = :id")
    Optional<SolicitacaoCorrecaoVeiculo> buscarParaDecisao(@Param("id") Long id);
}
