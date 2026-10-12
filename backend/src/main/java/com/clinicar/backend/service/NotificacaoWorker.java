package com.clinicar.backend.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.client.*;

/** Claim atômico e timeout limitado. Falhas ambíguas não são reenviadas automaticamente. */
@Component
@ConditionalOnProperty(name="clinicar.notificacoes.worker-enabled", havingValue="true", matchIfMissing=true)
public class NotificacaoWorker {
    private final JdbcTemplate jdbc;
    private final ObjectMapper json;
    private final RestTemplate http;
    @org.springframework.beans.factory.annotation.Autowired private org.springframework.mail.javamail.JavaMailSender mail;
    @org.springframework.beans.factory.annotation.Autowired private MfaCryptoService crypto;
    @Value("${clinicar.mail.remetente}") private String remetente;
    @Value("${whatsapp.api-url:https://graph.facebook.com/v25.0}") private String api;
    @Value("${whatsapp.phone-number-id:}") private String phone;
    @Value("${whatsapp.access-token:}") private String token;
    public NotificacaoWorker(JdbcTemplate jdbc, ObjectMapper json) {
        this.jdbc=jdbc; this.json=json;
        var factory=new org.springframework.http.client.SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(5000); factory.setReadTimeout(10000); http=new RestTemplate(factory);
    }
    @Scheduled(fixedDelayString="${clinicar.notificacoes.intervalo-ms:5000}")
    public void processar() {
        var now=Timestamp.from(Instant.now());
        // Após uma queda durante a chamada, a Meta pode ter recebido a mensagem. Exige conferência.
        jdbc.update("UPDATE notificacao_outbox SET estado='INDETERMINADO',ultimo_erro='Processamento interrompido. Confira no provedor antes de reenviar.' WHERE estado='PROCESSANDO' AND reservado_ate<?",now);
        jdbc.update("UPDATE notificacao_outbox SET estado='EXPIRADA',parametros='',atualizado_em=? WHERE canal='EMAIL' AND expira_em<? AND estado IN ('PENDENTE','TENTAR_NOVAMENTE')",now,now);
        jdbc.update("UPDATE notificacao_outbox n JOIN alerta_estoque_peca a ON a.id=n.registro_origem_id SET n.estado='CANCELADA',n.atualizado_em=? WHERE n.origem='ESTOQUE' AND a.status_alerta<>'ABERTO' AND n.estado IN ('PENDENTE','TENTAR_NOVAMENTE')",now);
        jdbc.update("UPDATE notificacao_outbox SET estado='CANCELADA',atualizado_em=? WHERE origem='ESTOQUE' AND estado IN ('PENDENTE','TENTAR_NOVAMENTE') AND NOT EXISTS (SELECT 1 FROM configuracao_alerta_estoque c WHERE c.ativo=TRUE)",now);
        jdbc.update("UPDATE notificacao_outbox n JOIN envio_alerta_manutencao e ON e.id=n.registro_origem_id JOIN previsao_manutencao_veiculo p ON p.id=e.previsao_id JOIN veiculo v ON v.id=p.id_veiculo JOIN usuario u ON u.id=e.proprietario_id LEFT JOIN configuracao_alerta_manutencao_usuario c ON c.id=e.proprietario_id SET n.estado='CANCELADA',n.atualizado_em=? WHERE n.origem='MANUTENCAO' AND n.estado IN ('PENDENTE','TENTAR_NOVAMENTE') AND (COALESCE(c.ativo,FALSE)=FALSE OR u.status<>'ATIVO' OR v.id_proprietario<>e.proprietario_id OR p.status_previsao NOT IN ('PENDENTE','PROXIMA','VENCIDA'))",now);
        jdbc.update("UPDATE envio_alerta_manutencao e JOIN notificacao_outbox n ON n.origem='MANUTENCAO' AND n.registro_origem_id=e.id SET e.status='CANCELADO',e.finalizado_em=?,e.detalhe='Envio cancelado após atualização da manutenção ou configuração.' WHERE n.estado='CANCELADA' AND e.status='PENDENTE'",now);
        boolean whatsappConfigurado=!phone.isBlank()&&!token.isBlank();
        if(!whatsappConfigurado) {
            jdbc.update("UPDATE notificacao_outbox SET ultimo_erro='Aguardando configuração de acesso à API do WhatsApp.',atualizado_em=? WHERE canal='WHATSAPP' AND estado IN ('PENDENTE','TENTAR_NOVAMENTE') AND (ultimo_erro IS NULL OR ultimo_erro<>'Aguardando configuração de acesso à API do WhatsApp.')",now);
        }
        var ids=jdbc.queryForList("SELECT id FROM notificacao_outbox WHERE estado IN ('PENDENTE','TENTAR_NOVAMENTE') AND proxima_tentativa_em<=? AND (canal='EMAIL' OR ?) ORDER BY id LIMIT 10",Long.class,now,whatsappConfigurado);
        for (Long id:ids) {
            int claimed=jdbc.update("UPDATE notificacao_outbox SET estado='PROCESSANDO',reservado_ate=?,tentativas=tentativas+1,atualizado_em=? WHERE id=? AND estado IN ('PENDENTE','TENTAR_NOVAMENTE') AND proxima_tentativa_em<=?",
                Timestamp.from(Instant.now().plusSeconds(60)),now,id,now);
            if(claimed!=1) continue;
            var row=jdbc.queryForMap("SELECT canal,destinatario,template,parametros,tentativas,origem,registro_origem_id FROM notificacao_outbox WHERE id=?",id);
            try {
                if("EMAIL".equals(row.get("canal"))) {
                    var payload=json.readTree(crypto.descriptografar((String)row.get("parametros")));
                    var message=mail.createMimeMessage();
                    var helper=new org.springframework.mail.javamail.MimeMessageHelper(message,true,java.nio.charset.StandardCharsets.UTF_8.name());
                    helper.setFrom(remetente); helper.setTo((String)row.get("destinatario")); helper.setSubject((String)row.get("template"));
                    if(payload.path("html").asText().isBlank()) helper.setText(payload.path("texto").asText());
                    else helper.setText(payload.path("texto").asText(),payload.path("html").asText());
                    mail.send(message); finalizar(id,"ACEITA",null,null);
                    jdbc.update("UPDATE notificacao_outbox SET parametros='' WHERE id=?",id); continue;
                }
                var headers=new HttpHeaders(); headers.setContentType(MediaType.APPLICATION_JSON); headers.setBearerAuth(token);
                String response=http.postForObject(api+"/"+phone+"/messages",new HttpEntity<>(row.get("parametros"),headers),String.class);
                String providerId=json.readTree(response).path("messages").path(0).path("id").asText("");
                if(providerId.isBlank()) { finalizar(id,"INDETERMINADO","Provedor não retornou o identificador da mensagem.",null); continue; }
                finalizar(id,"ACEITA",null,providerId);
                if("ERRO".equals(jdbc.queryForObject("SELECT estado FROM notificacao_outbox WHERE id=?",String.class,id)))
                    atualizarAlerta(row,null,"Provedor informou falha na entrega.");
                else atualizarAlerta(row,providerId,null);
            } catch(HttpStatusCodeException error) {
                int attempts=((Number)row.get("tentativas")).intValue();
                boolean retry=error.getStatusCode().value()==429 && attempts<6;
                String message="Provedor recusou o envio (HTTP "+error.getStatusCode().value()+").";
                finalizar(id,retry?"TENTAR_NOVAMENTE":"ERRO",message,null);
                if(retry) jdbc.update("UPDATE notificacao_outbox SET proxima_tentativa_em=? WHERE id=?",Timestamp.from(Instant.now().plusSeconds(Math.min(3600,60L*(1L<<attempts)))),id);
                atualizarAlerta(row,null,message);
            } catch(ResourceAccessException error) {
                finalizar(id,"INDETERMINADO","Sem confirmação do provedor. Confira o envio antes de tentar novamente.",null);
                atualizarAlerta(row,null,"Envio sem confirmação. Confira no provedor antes de reenviar.");
            } catch(org.springframework.mail.MailException error) {
                finalizar(id,"INDETERMINADO","Envio de e-mail sem confirmação. Gere um novo link se necessário.",null);
            } catch(Exception error) {
                finalizar(id,"ERRO","Não foi possível processar a notificação. Consulte o responsável pelo sistema.",null);
            }
        }
    }
    private void finalizar(Long id,String estado,String erro,String provider) {
        jdbc.update("UPDATE notificacao_outbox SET estado=?,ultimo_erro=?,provider_id=COALESCE(?,provider_id),reservado_ate=NULL,atualizado_em=? WHERE id=?",estado,erro,provider,Timestamp.from(Instant.now()),id);
        if(provider!=null)jdbc.update("UPDATE notificacao_outbox n JOIN notificacao_callback c ON c.provider_id=n.provider_id SET n.estado=c.estado,n.ultimo_erro=CASE WHEN c.estado='ERRO' THEN 'Provedor informou falha na entrega.' ELSE NULL END,n.atualizado_em=CURRENT_TIMESTAMP(6) WHERE n.id=? AND n.estado NOT IN ('LIDA','ENTREGUE')",id);
    }
    private void atualizarAlerta(Map<String,Object> row,String provider,String error) {
        if("MANUTENCAO".equals(row.get("origem")) && row.get("registro_origem_id")!=null) {
            jdbc.update("UPDATE envio_alerta_manutencao SET status=?,detalhe=?,finalizado_em=? WHERE id=?",provider==null?"ERRO":"ENVIADO",provider==null?error:"Aceito pela API; entrega depende da confirmação do provedor.",Timestamp.from(Instant.now()),row.get("registro_origem_id"));
            return;
        }
        if(!"ESTOQUE".equals(row.get("origem")) || row.get("registro_origem_id")==null) return;
        jdbc.update("UPDATE alerta_estoque_peca SET whatsapp_enviado=?,whatsapp_message_id=COALESCE(?,whatsapp_message_id),whatsapp_enviado_em=?,ultimo_erro=? WHERE id=?",
            provider!=null,provider,provider==null?null:Timestamp.from(Instant.now()),error,row.get("registro_origem_id"));
    }
}
