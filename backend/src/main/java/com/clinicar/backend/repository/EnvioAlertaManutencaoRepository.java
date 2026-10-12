package com.clinicar.backend.repository;
import com.clinicar.backend.model.EnvioAlertaManutencao;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface EnvioAlertaManutencaoRepository extends JpaRepository<EnvioAlertaManutencao, Long> {
    @org.springframework.data.jpa.repository.Query("select e.proprietarioId from EnvioAlertaManutencao e where e.id = :id")
    java.util.Optional<Long> buscarProprietario(@org.springframework.data.repository.query.Param("id") Long id);
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("select e from EnvioAlertaManutencao e where e.id = :id")
    java.util.Optional<EnvioAlertaManutencao> buscarParaAtualizacao(@org.springframework.data.repository.query.Param("id") Long id);
    List<EnvioAlertaManutencao> findByPrevisaoIdOrderByCriadoEmDesc(Long previsaoId);
    List<EnvioAlertaManutencao> findTop100ByOrderByCriadoEmDesc();
    List<EnvioAlertaManutencao> findTop100ByProprietarioIdOrderByCriadoEmDesc(Long proprietarioId);
    List<EnvioAlertaManutencao> findByPrevisaoIdAndProprietarioIdOrderByCriadoEmDesc(Long previsaoId, Long proprietarioId);
}
