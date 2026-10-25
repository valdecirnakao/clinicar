package com.clinicar.backend.repository;

import com.clinicar.backend.model.ConfiguracaoAlertaEstoque;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ConfiguracaoAlertaEstoqueRepository extends JpaRepository<ConfiguracaoAlertaEstoque, Long> {

    Optional<ConfiguracaoAlertaEstoque> findFirstByAtivoTrueOrderByIdAsc();
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("select c from ConfiguracaoAlertaEstoque c where c.id = 1")
    Optional<ConfiguracaoAlertaEstoque> bloquear();

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query(value = """
            INSERT IGNORE INTO configuracao_alerta_estoque
                (id, ativo, telefone_administrador, template_whatsapp, idioma_template,
                 reenviar_alerta_apos_horas, criado_em, versao)
            VALUES (1, FALSE, '', 'alerta_estoque_peca', 'pt_BR', 24, NOW(), 0)
            """, nativeQuery = true)
    void criarPadraoSeAusente();
}
