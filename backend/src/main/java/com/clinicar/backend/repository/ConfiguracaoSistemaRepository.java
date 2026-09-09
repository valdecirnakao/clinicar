package com.clinicar.backend.repository;

import com.clinicar.backend.model.ConfiguracaoSistema;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ConfiguracaoSistemaRepository
        extends JpaRepository<ConfiguracaoSistema, Long> {

    /**
     * Busca o registro responsável por controlar o estado
     * da configuração inicial do CliniCar.
     *
     * O lock pessimista de escrita impede que duas
     * transações alterem simultaneamente o estado do setup.
     *
     * Isso é especialmente importante durante a criação
     * do primeiro administrador.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            SELECT c
            FROM ConfiguracaoSistema c
            WHERE c.id = 1
            """)
    Optional<ConfiguracaoSistema> buscarParaAtualizacao();

}