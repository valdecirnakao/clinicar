package com.clinicar.backend.controller;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;
@RestController @RequestMapping("/api/painel-operacional")
public class PainelOperacionalController {
    private final JdbcTemplate jdbc;
    public PainelOperacionalController(JdbcTemplate jdbc){this.jdbc=jdbc;}
    @GetMapping public Map<String,Object> consultar(){
        return Map.of("agendamentos",contar("SELECT COUNT(*) FROM agendamento WHERE status_agendamento='AGENDADO'"),
            "atendimentos",contar("SELECT COUNT(*) FROM atendimento WHERE status_atendimento IN ('ABERTO','EM_EXECUCAO')"),
            "estoqueCritico",contar("SELECT COUNT(*) FROM estoque_peca WHERE ativo=TRUE AND status_estoque IN ('CRITICO','ZERADO')"),
            "notificacoesPendentes",contar("SELECT COUNT(*) FROM notificacao_outbox WHERE estado IN ('PENDENTE','TENTAR_NOVAMENTE','PROCESSANDO')"),
            "notificacoesComFalha",contar("SELECT COUNT(*) FROM notificacao_outbox WHERE estado IN ('ERRO','INDETERMINADO')"),
            "cadastrosPendentes",jdbc.queryForList("SELECT id,tipo,titulo,rota,contexto FROM cadastro_continuidade WHERE usuario_id=? AND estado='PENDENTE' ORDER BY atualizado_em DESC LIMIT 20",usuario().getId()));
    }
    private long contar(String sql){return jdbc.queryForObject(sql,Long.class);}
    private com.clinicar.backend.dto.UsuarioResponse usuario(){return (com.clinicar.backend.dto.UsuarioResponse)((org.springframework.web.context.request.ServletRequestAttributes)org.springframework.web.context.request.RequestContextHolder.currentRequestAttributes()).getRequest().getAttribute("usuarioLogado");}
}
