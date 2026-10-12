package com.clinicar.backend.repository;
import com.clinicar.backend.model.EnvioAlertaManutencao;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface EnvioAlertaManutencaoRepository extends JpaRepository<EnvioAlertaManutencao, Long> {
    List<EnvioAlertaManutencao> findByPrevisaoIdOrderByCriadoEmDesc(Long previsaoId);
    List<EnvioAlertaManutencao> findTop100ByOrderByCriadoEmDesc();
}
