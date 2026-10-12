package com.clinicar.backend.service;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/** Movimentações também invalidam formulários antigos do controle de estoque. */
@Service
@ConditionalOnProperty(name="clinicar.operacoes.confiaveis-enabled",havingValue="true",matchIfMissing=true)
public class VersaoEstoqueService {
    private final JdbcTemplate jdbc;
    public VersaoEstoqueService(JdbcTemplate jdbc){this.jdbc=jdbc;}
    @Transactional(propagation=Propagation.MANDATORY)
    public void bloquear(Long id) {
        jdbc.update("INSERT IGNORE INTO registro_versao (recurso,registro_id,versao) VALUES ('estoque-pecas',?,0)",id);
        jdbc.queryForObject("SELECT versao FROM registro_versao WHERE recurso='estoque-pecas' AND registro_id=? FOR UPDATE",Long.class,id);
    }
    @Transactional(propagation=Propagation.MANDATORY)
    public void registrarAlteracao(Long id) {
        bloquear(id);
        jdbc.update("UPDATE registro_versao SET versao=versao+1 WHERE recurso='estoque-pecas' AND registro_id=?",id);
    }
}
