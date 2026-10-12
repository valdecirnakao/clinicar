package com.clinicar.backend.config;

import com.clinicar.backend.dto.UsuarioResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.charset.StandardCharsets;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.Arrays;
import java.util.HexFormat;
import java.util.Map;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.*;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.annotation.Order;
import org.springframework.http.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.context.request.*;

/** A operação e sua resposta são confirmadas na mesma transação. */
@Aspect @Component @Order(10)
@ConditionalOnProperty(name="clinicar.operacoes.confiaveis-enabled",havingValue="true",matchIfMissing=true)
public class OperacaoConfiavelAspect {
    private final JdbcTemplate jdbc;
    private final ObjectMapper json;
    private final TransactionTemplate tx;
    public OperacaoConfiavelAspect(JdbcTemplate jdbc,ObjectMapper json,PlatformTransactionManager manager) {this.jdbc=jdbc;this.json=json;tx=new TransactionTemplate(manager);}
    @Around("@within(org.springframework.web.bind.annotation.RestController) && execution(public * com.clinicar.backend.controller.*.*(..))")
    public Object executar(ProceedingJoinPoint call) throws Throwable {
        if(!(RequestContextHolder.getRequestAttributes() instanceof ServletRequestAttributes attrs)) return call.proceed();
        var request=attrs.getRequest();
        if(!java.util.Set.of("POST","PUT","PATCH","DELETE").contains(request.getMethod())) return call.proceed();
        if(!(request.getAttribute("usuarioLogado") instanceof UsuarioResponse user)) return call.proceed();
        if (request.getRequestURI().startsWith("/api/auth/") || request.getRequestURI().startsWith("/api/setup/")) return call.proceed();
        String key=request.getHeader("Idempotency-Key");
        boolean estoque=request.getRequestURI().matches("/api/estoque-pecas/\\d+/(entrada|saida|ajuste)");
        if(key==null || key.isBlank()) {
            if(estoque) throw new org.springframework.web.server.ResponseStatusException(HttpStatus.BAD_REQUEST,"Atualize a página para registrar a movimentação com proteção contra repetição.");
            key=java.util.UUID.randomUUID().toString();
        }
        if(!key.matches("[A-Za-z0-9_-]{16,64}")) throw new org.springframework.web.server.ResponseStatusException(HttpStatus.BAD_REQUEST,"Identificador de operação inválido.");
        final String operationKey=key;
        Object[] arguments=Arrays.stream(call.getArgs()).filter(arg -> !(arg instanceof jakarta.servlet.ServletRequest || arg instanceof jakarta.servlet.ServletResponse)).toArray();
        String digest=HexFormat.of().formatHex(java.security.MessageDigest.getInstance("SHA-256").digest((request.getMethod()+request.getRequestURI()+json.writeValueAsString(arguments)).getBytes(StandardCharsets.UTF_8)));
        try {
            return tx.execute(status -> {
                try {
                    jdbc.update("INSERT INTO requisicao_idempotente (usuario_id,chave,impressao,estado,criado_em) VALUES (?,?,?,'PROCESSANDO',?)",user.getId(),operationKey,digest,Timestamp.from(Instant.now()));
                } catch(org.springframework.dao.DuplicateKeyException duplicate) {
                    var previous=jdbc.queryForMap("SELECT impressao,estado,resposta_status,resposta FROM requisicao_idempotente WHERE usuario_id=? AND chave=?",user.getId(),operationKey);
                    if(!digest.equals(previous.get("impressao"))) throw new org.springframework.web.server.ResponseStatusException(HttpStatus.CONFLICT,"Este identificador já foi usado para outra operação.");
                    if(!"CONCLUIDA".equals(previous.get("estado"))) throw new org.springframework.web.server.ResponseStatusException(HttpStatus.CONFLICT,"A operação está em processamento. Aguarde a confirmação.");
                    try {
                        var method=((org.aspectj.lang.reflect.MethodSignature)call.getSignature()).getMethod();
                        var saved=json.readTree((String)previous.get("resposta"));
                        if(ResponseEntity.class.isAssignableFrom(method.getReturnType()))
                            return ResponseEntity.status(((Number)previous.get("resposta_status")).intValue()).body(saved);
                        return json.convertValue(saved,json.getTypeFactory().constructType(method.getGenericReturnType()));
                    }
                    catch(Exception error){throw new IllegalStateException("Não foi possível recuperar a confirmação da operação.",error);}
                }
                final Object result;
                var match=java.util.regex.Pattern.compile("^/api/([^/]+)/(\\d+)(?:/[^/]+)?$").matcher(request.getRequestURI());
                if (java.util.Set.of("PUT","PATCH","DELETE").contains(request.getMethod()) && match.matches() && VersaoCadastroAdvice.RECURSOS.contains(match.group(1))) {
                    String revision=request.getHeader("If-Match");
                    if(revision==null || !revision.matches("\"[0-9]+\"")) { status.setRollbackOnly(); throw new org.springframework.web.server.ResponseStatusException(HttpStatus.PRECONDITION_REQUIRED,"Recarregue o registro antes de salvar ou excluir."); }
                    String resource=match.group(1);long record=Long.parseLong(match.group(2));long expected=Long.parseLong(revision.substring(1,revision.length()-1));
                    jdbc.update("INSERT IGNORE INTO registro_versao (recurso,registro_id,versao) VALUES (?,?,0)",resource,record);
                    if(jdbc.update("UPDATE registro_versao SET versao=versao+1 WHERE recurso=? AND registro_id=? AND versao=?",resource,record,expected)!=1) {status.setRollbackOnly(); throw new org.springframework.web.server.ResponseStatusException(HttpStatus.CONFLICT,"Este registro foi alterado por outro usuário. Recarregue os dados antes de continuar.");}
                }
                try {result=call.proceed();}
                catch(Throwable error){throw new FalhaOperacao(error);}
                int code=result instanceof ResponseEntity<?> entity?entity.getStatusCode().value():200;
                if(code>=400) {status.setRollbackOnly();return result;}
                Object body=result instanceof ResponseEntity<?> entity?entity.getBody():result;
                try {
                    // Captura depois dos listeners de negócio: a confirmação preserva a revisão e o estado final.
                    org.springframework.transaction.support.TransactionSynchronizationManager.registerSynchronization(new org.springframework.transaction.support.TransactionSynchronization(){
                        @Override public void beforeCommit(boolean readOnly) {
                            try {
                                var resposta=json.valueToTree(body);String[] caminho=request.getRequestURI().split("/");
                                if(caminho.length>=3 && caminho.length<=4 && VersaoCadastroAdvice.RECURSOS.contains(caminho[2]) && resposta instanceof com.fasterxml.jackson.databind.node.ObjectNode registro && registro.path("id").isIntegralNumber()) {
                                    var versoes=jdbc.queryForList("SELECT versao FROM registro_versao WHERE recurso=? AND registro_id=?",Long.class,caminho[2],registro.path("id").longValue());
                                    registro.put("controleVersao",versoes.isEmpty()?0:versoes.getFirst());
                                }
                                jdbc.update("UPDATE requisicao_idempotente SET estado='CONCLUIDA',resposta_status=?,resposta_tipo='application/json',resposta=? WHERE usuario_id=? AND chave=?",code,json.writeValueAsString(resposta),user.getId(),operationKey);
                            }catch(Exception error){throw new IllegalStateException("Não foi possível preservar a confirmação da operação.",error);}
                        }
                    });
                    if(code>=200 && code<300 && !request.getRequestURI().startsWith("/api/auth/")) {
                        String component=call.getTarget().getClass().getSimpleName().replace("Controller","").toUpperCase(java.util.Locale.ROOT);
                        if (component.equals("USUARIO")) component="USUARIOS";
                        var record=json.valueToTree(body); Long id=record.has("id") && record.get("id").canConvertToLong()?record.get("id").longValue():null;
                        if(id==null && match.matches()) id=Long.parseLong(match.group(2));
                        jdbc.update("INSERT INTO auditoria_evento (usuario_id,usuario_nome,componente,operacao,registro_id,descricao,realizado_em) VALUES (?,?,?,?,?,?,?)",user.getId(),user.getNome(),component,request.getMethod(),id,"Operação realizada em "+request.getRequestURI(),Timestamp.from(Instant.now()));
                    }
                    return result;
                } catch(Exception error){throw new IllegalStateException("Não foi possível confirmar a operação.",error);}
            });
        } catch(FalhaOperacao failure){throw failure.getCause();}
    }
    private static class FalhaOperacao extends RuntimeException { FalhaOperacao(Throwable cause){super(cause);} }
}
