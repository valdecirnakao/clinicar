package com.clinicar.backend.repository;

import com.clinicar.backend.model.MovimentacaoEstoquePeca;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.Lock;
import jakarta.persistence.LockModeType;
import org.springframework.data.repository.query.Param;
import java.math.BigDecimal;

import java.util.List;

public interface MovimentacaoEstoquePecaRepository extends JpaRepository<MovimentacaoEstoquePeca, Long> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    List<MovimentacaoEstoquePeca> findByIdMovimentacaoOrigem(Long idMovimentacaoOrigem);
    @Query("select m from MovimentacaoEstoquePeca m where m.idAtendimento = :id or (m.idAtendimento is null and :codigo is not null and m.documentoReferencia = :codigo) order by m.criadoEm desc")
    List<MovimentacaoEstoquePeca> findByIdAtendimentoOrDocumentoReferenciaOrderByCriadoEmDesc(@Param("id") Long idAtendimento, @Param("codigo") String documentoReferencia);
    @Query("select sum(m.quantidade) from MovimentacaoEstoquePeca m where m.idMovimentacaoOrigem = :id")
    BigDecimal quantidadeDevolvida(@Param("id") Long id);

    List<MovimentacaoEstoquePeca> findByEstoquePeca_IdOrderByCriadoEmDesc(Long estoquePecaId);

    List<MovimentacaoEstoquePeca> findByPeca_IdOrderByCriadoEmDesc(Long pecaId);
}
