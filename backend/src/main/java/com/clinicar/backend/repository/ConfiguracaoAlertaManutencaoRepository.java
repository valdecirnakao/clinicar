package com.clinicar.backend.repository;
import com.clinicar.backend.model.ConfiguracaoAlertaManutencao;
import org.springframework.data.jpa.repository.*;
import jakarta.persistence.LockModeType;
import java.util.Optional;
public interface ConfiguracaoAlertaManutencaoRepository extends JpaRepository<ConfiguracaoAlertaManutencao, Long> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select c from ConfiguracaoAlertaManutencao c where c.id = 1")
    Optional<ConfiguracaoAlertaManutencao> bloquear();
}
