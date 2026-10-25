package com.clinicar.backend.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.sql.Statement;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** O registro participa da transação de negócio; a rede é acessada somente pelo worker. */
@Service
public class NotificacaoOutboxService {
    private final JdbcTemplate jdbc;
    private final ObjectMapper json;
    @org.springframework.beans.factory.annotation.Autowired private MfaCryptoService crypto;
    public NotificacaoOutboxService(JdbcTemplate jdbc, ObjectMapper json) { this.jdbc = jdbc; this.json = json; }

    @Transactional public void enfileirarEmail(String destinatario,String assunto,String texto,String html,Instant expiraEm) {
        final String payload;
        try { payload=crypto.criptografar(json.writeValueAsString(Map.of("texto",texto,"html",html==null?"":html))); }
        catch(Exception error){throw new com.clinicar.backend.exception.NotificacaoPersistenciaException("Não foi possível preparar o e-mail com segurança.",error);}
        var now=Timestamp.from(Instant.now());
        jdbc.update("INSERT INTO notificacao_outbox (chave_evento,canal,destinatario,template,idioma,parametros,proxima_tentativa_em,criado_em,atualizado_em,expira_em) VALUES (?,'EMAIL',?,?,'pt_BR',?,?,?,?,?)",UUID.randomUUID().toString(),destinatario,assunto,payload,now,now,now,Timestamp.from(expiraEm));
    }

    @Transactional public void vincular(String referencia, String origem, Long registro) {
        if (referencia == null || !referencia.startsWith("fila:")) throw new IllegalStateException("Notificação não foi registrada na fila.");
        jdbc.update("UPDATE notificacao_outbox SET origem=?,registro_origem_id=? WHERE id=?", origem, registro, Long.parseLong(referencia.substring(5)));
    }

    @Transactional
    public void cancelarPendentes(String origem, Long registro) {
        jdbc.update("UPDATE notificacao_outbox SET estado='CANCELADA',atualizado_em=? "
                + "WHERE origem=? AND registro_origem_id=? AND estado IN ('PENDENTE','TENTAR_NOVAMENTE')",
                Timestamp.from(Instant.now()), origem, registro);
    }

    @Transactional
    public void cancelarAvisosServicoDestinatario(String telefone) {
        if (telefone == null) return;
        jdbc.update("UPDATE notificacao_outbox SET estado='CANCELADA',atualizado_em=? "
                + "WHERE destinatario=? AND origem IN ('AGENDAMENTO','ORCAMENTO','ATENDIMENTO') "
                + "AND estado IN ('PENDENTE','TENTAR_NOVAMENTE')",
                Timestamp.from(Instant.now()), telefone.replaceAll("\\D", ""));
    }

    @Transactional
    public String enfileirar(String destinatario, String template, String idioma, Map<String, Object> body) {
        return enfileirar(UUID.randomUUID().toString(), destinatario, template, idioma, body, null, null);
    }

    @Transactional
    public String enfileirar(String chave, String destinatario, String template, String idioma,
                            Map<String, Object> body, String origem, Long registro) {
        if("ESTOQUE".equals(origem) && registro!=null) {
            var anteriores=jdbc.queryForList("SELECT id,estado FROM notificacao_outbox WHERE origem='ESTOQUE' AND registro_origem_id=? AND estado IN ('PENDENTE','TENTAR_NOVAMENTE','PROCESSANDO','INDETERMINADO') ORDER BY id DESC LIMIT 1",registro);
            if(!anteriores.isEmpty()) {
                var anterior=anteriores.getFirst();
                if("INDETERMINADO".equals(anterior.get("estado"))) throw new IllegalStateException("O envio anterior não teve confirmação. Confira no provedor antes de reenviar.");
                return "fila:"+anterior.get("id");
            }
        }
        var existente = jdbc.queryForList("SELECT id FROM notificacao_outbox WHERE chave_evento=?", Long.class, chave);
        if (!existente.isEmpty()) return "fila:" + existente.getFirst();
        final String payload;
        try { payload = json.writeValueAsString(body); }
        catch (Exception error) { throw new com.clinicar.backend.exception.NotificacaoPersistenciaException("Não foi possível preparar a notificação.", error); }
        var key = new GeneratedKeyHolder();
        var now = Timestamp.from(Instant.now());
        jdbc.update(connection -> {
            var statement = connection.prepareStatement("INSERT INTO notificacao_outbox "
                + "(chave_evento,canal,destinatario,template,idioma,parametros,proxima_tentativa_em,criado_em,atualizado_em,origem,registro_origem_id) "
                + "VALUES (?,'WHATSAPP',?,?,?,?,?,?,?,?,?)", Statement.RETURN_GENERATED_KEYS);
            statement.setString(1, chave); statement.setString(2, destinatario); statement.setString(3, template);
            statement.setString(4, idioma); statement.setString(5, payload); statement.setTimestamp(6, now);
            statement.setTimestamp(7, now); statement.setTimestamp(8, now); statement.setString(9, origem);
            statement.setObject(10, registro); return statement;
        }, key);
        return "fila:" + key.getKey().longValue();
    }
}
