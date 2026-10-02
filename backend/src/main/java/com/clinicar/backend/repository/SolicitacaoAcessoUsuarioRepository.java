package com.clinicar.backend.repository;

import com.clinicar.backend.model.SolicitacaoAcessoUsuario;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;
import java.util.Optional;

public interface SolicitacaoAcessoUsuarioRepository extends JpaRepository<SolicitacaoAcessoUsuario, Long> {
    @Query("select s.usuarioId from SolicitacaoAcessoUsuario s where s.id = :id")
    Optional<Long> buscarUsuarioId(@Param("id") Long id);
    boolean existsByPendenciaUsuarioId(Long id);
    long countByStatus(String status);
    long countByUsuarioIdAndStatus(Long id, String status);
    Page<SolicitacaoAcessoUsuario> findByUsuarioId(Long id, Pageable pagina);
    Page<SolicitacaoAcessoUsuario> findByStatus(String status, Pageable pagina);
    boolean existsByUsuarioIdAndSituacaoPeriodoIn(Long id, java.util.Collection<String> situacoes);
    java.util.List<SolicitacaoAcessoUsuario> findByUsuarioIdAndSituacaoPeriodoIn(Long id, java.util.Collection<String> situacoes);
    @Query("select s.id from SolicitacaoAcessoUsuario s where s.situacaoPeriodo in ('AGENDADA','EM_CURSO') order by s.id")
    java.util.List<Long> periodosParaProcessar();
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select s from SolicitacaoAcessoUsuario s where s.id = :id")
    Optional<SolicitacaoAcessoUsuario> buscarParaDecisao(@Param("id") Long id);
}
