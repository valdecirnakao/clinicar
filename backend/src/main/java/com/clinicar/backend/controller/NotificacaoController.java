package com.clinicar.backend.controller;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

/** A autorização administrativa é aplicada pelo interceptor de sessão. */
@RestController
@RequestMapping("/api/notificacoes")
public class NotificacaoController {
    private final JdbcTemplate jdbc;
    public NotificacaoController(JdbcTemplate jdbc) { this.jdbc=jdbc; }
    @GetMapping public Map<String,Object> listar(@RequestParam(defaultValue="0") int pagina,
        @RequestParam(defaultValue="10") int tamanho,@RequestParam(defaultValue="") String estado) {
        if(pagina<0 || tamanho<1 || tamanho>100) throw new IllegalArgumentException("Paginação inválida.");
        String filtro=estado.isBlank()?"":" WHERE estado=?";
        Object[] params=estado.isBlank()?new Object[]{}:new Object[]{estado};
        long total=jdbc.queryForObject("SELECT COUNT(*) FROM notificacao_outbox"+filtro,Long.class,params);
        var arguments=new java.util.ArrayList<Object>(java.util.List.of(params)); arguments.add(tamanho); arguments.add((long)pagina*tamanho);
        var itens=jdbc.queryForList("SELECT id,canal,template,estado,tentativas,criado_em,atualizado_em,ultimo_erro FROM notificacao_outbox"+filtro+" ORDER BY id DESC LIMIT ? OFFSET ?",arguments.toArray());
        return Map.of("itens",itens,"total",total,"pagina",pagina,"tamanho",tamanho);
    }
    @PostMapping("/{id}/reenviar") public ResponseEntity<?> reenviar(@PathVariable Long id) {
        // Aceitas/entregues/processando e envios ambíguos precisam de conferência, não de repetição automática.
        int updated=jdbc.update("UPDATE notificacao_outbox SET estado='PENDENTE',provider_id=NULL,tentativas=0,proxima_tentativa_em=?,atualizado_em=?,ultimo_erro=NULL WHERE id=? AND estado='ERRO' AND (expira_em IS NULL OR expira_em>CURRENT_TIMESTAMP)",Timestamp.from(Instant.now()),Timestamp.from(Instant.now()),id);
        if(updated!=1) return ResponseEntity.status(409).body(Map.of("mensagem","Somente notificações com falha confirmada podem ser reenviadas."));
        return ResponseEntity.ok(Map.of("mensagem","Notificação encaminhada para nova tentativa."));
    }
}
