package com.clinicar.backend.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

/** Retorno da Meta: autenticidade verificada sobre os bytes exatos do corpo. */
@RestController
@RequestMapping("/api/webhooks/whatsapp")
public class WhatsAppWebhookController {
    private final JdbcTemplate jdbc;
    private final ObjectMapper json;
    @Value("${clinicar.whatsapp.webhook.app-secret:}") private String secret;
    @Value("${clinicar.whatsapp.webhook.verify-token:}") private String verifyToken;
    public WhatsAppWebhookController(JdbcTemplate jdbc,ObjectMapper json){this.jdbc=jdbc;this.json=json;}
    @GetMapping public ResponseEntity<String> verificar(@RequestParam("hub.mode") String mode,
        @RequestParam("hub.verify_token") String token,@RequestParam("hub.challenge") String challenge) {
        boolean valid=!verifyToken.isBlank() && "subscribe".equals(mode) && MessageDigest.isEqual(verifyToken.getBytes(StandardCharsets.UTF_8),token.getBytes(StandardCharsets.UTF_8));
        return valid?ResponseEntity.ok(challenge):ResponseEntity.status(403).build();
    }
    @PostMapping public ResponseEntity<Void> receber(@RequestBody byte[] body,
        @RequestHeader(value="X-Hub-Signature-256",required=false) String signature) throws Exception {
        if(!assinaturaValida(secret,body,signature)) return ResponseEntity.status(403).build();
        var root=json.readTree(body);
        for(var entry:root.path("entry")) for(var change:entry.path("changes")) for(var status:change.path("value").path("statuses")) {
            String estado=switch(status.path("status").asText()) {case "sent"->"ACEITA";case "delivered"->"ENTREGUE";case "read"->"LIDA";case "failed"->"ERRO";default->null;};
            if(estado==null) continue;
            String id=status.path("id").asText("");
            if(id.isBlank()||id.length()>180)continue;
            jdbc.update("INSERT INTO notificacao_callback (provider_id,estado) VALUES (?,?) ON DUPLICATE KEY UPDATE estado=CASE WHEN estado='LIDA' OR VALUES(estado)='LIDA' THEN 'LIDA' WHEN estado='ENTREGUE' OR VALUES(estado)='ENTREGUE' THEN 'ENTREGUE' WHEN estado='ERRO' THEN 'ERRO' ELSE VALUES(estado) END,recebido_em=CURRENT_TIMESTAMP(6)",id,estado);
            // Não regride confirmação de entrega/leitura diante de retornos fora de ordem.
            String guard="LIDA".equals(estado)?"estado<>'LIDA'":"ENTREGUE".equals(estado)?"estado NOT IN ('LIDA','ENTREGUE')":"ACEITA".equals(estado)?"estado NOT IN ('LIDA','ENTREGUE','ERRO','CANCELADA','EXPIRADA')":"estado NOT IN ('LIDA','ENTREGUE')";
            jdbc.update("UPDATE notificacao_outbox SET estado=?,atualizado_em=CURRENT_TIMESTAMP(6),ultimo_erro=? WHERE provider_id=? AND "+guard,estado,"ERRO".equals(estado)?"Provedor informou falha na entrega.":null,id);
            if("ERRO".equals(estado)) {
                jdbc.update("UPDATE alerta_estoque_peca a JOIN notificacao_outbox n ON n.origem='ESTOQUE' AND n.registro_origem_id=a.id SET a.whatsapp_enviado=FALSE,a.whatsapp_enviado_em=NULL,a.ultimo_erro='Provedor informou falha na entrega.' WHERE n.provider_id=? AND n.estado='ERRO'",id);
                jdbc.update("UPDATE envio_alerta_manutencao e JOIN notificacao_outbox n ON n.origem='MANUTENCAO' AND n.registro_origem_id=e.id SET e.status='ERRO',e.detalhe='Provedor informou falha na entrega.',e.finalizado_em=CURRENT_TIMESTAMP(6) WHERE n.provider_id=? AND n.estado='ERRO'",id);
            }
        }
        return ResponseEntity.ok().build();
    }
    public static boolean assinaturaValida(String secret,byte[] body,String signature) {
        if(secret==null || secret.isBlank() || signature==null || !signature.startsWith("sha256=")) return false;
        try {
            var mac=Mac.getInstance("HmacSHA256"); mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8),"HmacSHA256"));
            return MessageDigest.isEqual(mac.doFinal(body),java.util.HexFormat.of().parseHex(signature.substring(7)));
        } catch(Exception invalid){return false;}
    }
}
