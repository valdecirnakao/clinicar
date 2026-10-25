package com.clinicar.backend;

import com.clinicar.backend.model.Usuario;
import com.clinicar.backend.repository.UsuarioRepository;
import com.clinicar.backend.service.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.Cookie;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** Executar somente contra um banco MySQL descartável, nunca contra os dados da oficina. */
@SpringBootTest(properties={"spring.datasource.url=${CLINICAR_TEST_MYSQL_URL}","spring.datasource.username=root",
    "spring.datasource.password=${CLINICAR_TEST_MYSQL_PASSWORD}","spring.jpa.hibernate.ddl-auto=validate",
    "spring.jpa.show-sql=false","clinicar.notificacoes.worker-enabled=false","clinicar.manutencao.whatsapp.habilitado=false",
    "clinicar.security.rate-limit-enabled=false","clinicar.mfa.encryption-key=AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
    "clinicar.security.csrf-enabled=true","clinicar.operacoes.confiaveis-enabled=true"})
@AutoConfigureMockMvc
class ModernizacaoMySqlIT {
    @Autowired JdbcTemplate jdbc; @Autowired NotificacaoOutboxService outbox;
    @Autowired PlatformTransactionManager manager; @Autowired MockMvc mvc;
    @Autowired UsuarioRepository users; @Autowired SessionService sessions; @Autowired ObjectMapper json;
    @Test @org.springframework.transaction.annotation.Transactional
    void historicoPaginadoPreservaSaldoDeRecebimentoComDevolucaoCorrigida() throws Exception {
        var user=new Usuario();user.setNome("Administrador histórico teste");user.setEmail(UUID.randomUUID()+"@example.test");user.setSenha("hash-teste");user.setStatus("ATIVO");user.setTipo_do_acesso("ADMINISTRADOR");user.setMfaAtivo(true);user.setMfaTipo("TOTP");user.setMfaSecret("teste");user=users.saveAndFlush(user);
        var cookie=sessions.criarSessaoCookie(user.getId());var auth=new Cookie(cookie.getName(),cookie.getValue());
        String nome="Peça histórico "+UUID.randomUUID(),local="Local histórico "+UUID.randomUUID();
        jdbc.update("INSERT INTO peca (nome,fabricante,tipo,unidade,criado_em) VALUES (?,'Teste','Peça Automotiva','Unidade',CURRENT_TIMESTAMP)",nome);
        long peca=jdbc.queryForObject("SELECT id FROM peca WHERE nome=?",Long.class,nome);
        jdbc.update("INSERT INTO local_estoque (nome,ativo,criado_em) VALUES (?,TRUE,CURRENT_TIMESTAMP)",local);long localId=jdbc.queryForObject("SELECT id FROM local_estoque WHERE nome=?",Long.class,local);
        jdbc.update("INSERT INTO estoque_peca (id_peca,id_local_estoque,quantidade_atual,custo_medio) VALUES (?,?,100,30)",peca,localId);long estoque=jdbc.queryForObject("SELECT id FROM estoque_peca WHERE id_peca=?",Long.class,peca);
        long recebimento=movimentoHistorico(estoque,peca,"ENTRADA","COMPRA",10,null);
        long devolucao=movimentoHistorico(estoque,peca,"SAIDA","DEVOLUCAO_FORNECEDOR",4,recebimento);
        movimentoHistorico(estoque,peca,"AJUSTE_ENTRADA","CORRECAO_LANCAMENTO",1,devolucao);
        movimentoHistorico(estoque,peca,"AJUSTE_ENTRADA","CORRECAO_LANCAMENTO",2,recebimento);
        for(int i=0;i<21;i++)movimentoHistorico(estoque,peca,"ENTRADA","BONIFICACAO",1,null);
        String base="/api/estoque-pecas/"+estoque+"/movimentacoes";
        mvc.perform(get(base+"/pagina").cookie(auth).param("tamanho","5")).andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(25)).andExpect(jsonPath("$.content.length()").value(5));
        var resposta=mvc.perform(get(base+"/"+recebimento).cookie(auth)).andExpect(status().isOk()).andReturn().getResponse();
        assertEquals(0,new java.math.BigDecimal("9").compareTo(json.readTree(resposta.getContentAsString()).path("quantidadeDisponivelOriginal").decimalValue()));
        var retorno=mvc.perform(get(base+"/"+devolucao).cookie(auth)).andExpect(status().isOk()).andReturn().getResponse();
        assertEquals(0,new java.math.BigDecimal("9").compareTo(json.readTree(retorno.getContentAsString()).path("quantidadeDisponivelRecebimento").decimalValue()));
        assertEquals(0,new java.math.BigDecimal("100").compareTo(jdbc.queryForObject("SELECT quantidade_atual FROM estoque_peca WHERE id=?",java.math.BigDecimal.class,estoque)));
    }
    private long movimentoHistorico(long estoque,long peca,String tipo,String origem,int quantidade,Long original){
        jdbc.update("INSERT INTO movimentacao_estoque_peca (id_estoque_peca,id_peca,tipo_movimento,origem,quantidade,saldo_anterior,saldo_posterior,valor_unitario,id_movimentacao_origem,criado_em) VALUES (?,?,?,?,?,100,90,30,?,CURRENT_TIMESTAMP)",estoque,peca,tipo,origem,quantidade,original);
        return jdbc.queryForObject("SELECT MAX(id) FROM movimentacao_estoque_peca WHERE id_estoque_peca=?",Long.class,estoque);
    }
    @Test @org.springframework.transaction.annotation.Transactional
    void confirmacoesAssinadasNaoRegridemEntregaOuLeitura() throws Exception {
        String chave=UUID.randomUUID().toString(),provider="mensagem-teste-"+chave;
        String fila=outbox.enfileirar(chave,"5511999999999","teste","pt_BR",Map.of("teste",true),null,null);
        long id=Long.parseLong(fila.substring(5));jdbc.update("UPDATE notificacao_outbox SET provider_id=?,estado='ACEITA' WHERE id=?",provider,id);
        var webhook=new com.clinicar.backend.controller.WhatsAppWebhookController(jdbc,json);
        String secret="segredo-sintetico-apenas-teste";
        org.springframework.test.util.ReflectionTestUtils.setField(webhook,"secret",secret);
        String[] estados={"failed","sent","delivered","sent","read","failed"};
        String[] esperados={"ERRO","ERRO","ENTREGUE","ENTREGUE","LIDA","LIDA"};
        for(int indice=0;indice<estados.length;indice++) {
            String estado=estados[indice];
            byte[] body=json.writeValueAsBytes(Map.of("entry",java.util.List.of(Map.of("changes",java.util.List.of(Map.of("value",Map.of("statuses",java.util.List.of(Map.of("id",provider,"status",estado)))))))));
            var mac=javax.crypto.Mac.getInstance("HmacSHA256");mac.init(new javax.crypto.spec.SecretKeySpec(secret.getBytes(java.nio.charset.StandardCharsets.UTF_8),"HmacSHA256"));
            assertEquals(200,webhook.receber(body,"sha256="+java.util.HexFormat.of().formatHex(mac.doFinal(body))).getStatusCode().value());
            assertEquals(esperados[indice],jdbc.queryForObject("SELECT estado FROM notificacao_outbox WHERE id=?",String.class,id));
        }
        String precoce="retorno-precoce-"+chave;
        byte[] body=json.writeValueAsBytes(Map.of("entry",java.util.List.of(Map.of("changes",java.util.List.of(Map.of("value",Map.of("statuses",java.util.List.of(Map.of("id",precoce,"status","delivered")))))))));
        var mac=javax.crypto.Mac.getInstance("HmacSHA256");mac.init(new javax.crypto.spec.SecretKeySpec(secret.getBytes(java.nio.charset.StandardCharsets.UTF_8),"HmacSHA256"));
        webhook.receber(body,"sha256="+java.util.HexFormat.of().formatHex(mac.doFinal(body)));
        long novoId=Long.parseLong(outbox.enfileirar(UUID.randomUUID().toString(),"5511999999999","teste","pt_BR",Map.of("teste",true),null,null).substring(5));
        org.springframework.test.util.ReflectionTestUtils.invokeMethod(new NotificacaoWorker(jdbc,json),"finalizar",novoId,"ACEITA",null,precoce);
        assertEquals("ENTREGUE",jdbc.queryForObject("SELECT estado FROM notificacao_outbox WHERE id=?",String.class,novoId));
        assertEquals(403,webhook.receber("{}".getBytes(java.nio.charset.StandardCharsets.UTF_8),"sha256=00").getStatusCode().value());
    }
    @Test void duasTentativasSimultaneasDaMesmaEntradaAlteramSaldoSomenteUmaVez() throws Exception {
        Usuario user=new Usuario();user.setNome("Administrador concorrência");user.setCpf(Long.toString(java.util.concurrent.ThreadLocalRandom.current().nextLong(10000000000L,99999999999L)));user.setEmail(UUID.randomUUID()+"@example.test");user.setSenha("hash-teste");user.setStatus("ATIVO");user.setTipo_do_acesso("ADMINISTRADOR");user.setMfaAtivo(true);user.setMfaTipo("TOTP");user.setMfaSecret("segredo-teste");user=users.saveAndFlush(user);
        var session=sessions.criarSessaoCookie(user.getId());var auth=new Cookie(session.getName(),session.getValue());
        var csrf=mvc.perform(get("/api/auth/csrf")).andExpect(status().isOk()).andReturn().getResponse();
        String token=json.readTree(csrf.getContentAsString()).path("token").asText();Cookie tokenCookie=csrf.getCookie("XSRF-TOKEN");assertNotNull(tokenCookie);
        String nome="Peça concorrência "+UUID.randomUUID(),local="Local concorrência "+UUID.randomUUID();
        jdbc.update("INSERT INTO peca (nome,fabricante,tipo,unidade,criado_em) VALUES (?,'Teste','Peça Automotiva','Unidade',CURRENT_TIMESTAMP)",nome);
        long peca=jdbc.queryForObject("SELECT id FROM peca WHERE nome=?",Long.class,nome);
        jdbc.update("INSERT INTO local_estoque (nome,ativo,criado_em) VALUES (?,TRUE,CURRENT_TIMESTAMP)",local);
        long localId=jdbc.queryForObject("SELECT id FROM local_estoque WHERE nome=?",Long.class,local);
        jdbc.update("INSERT INTO estoque_peca (id_peca,id_local_estoque,quantidade_atual,custo_medio) VALUES (?,?,10,30)",peca,localId);
        long estoque=jdbc.queryForObject("SELECT id FROM estoque_peca WHERE id_peca=?",Long.class,peca);
        String chave=UUID.randomUUID().toString(),body="{\"quantidade\":\"5\",\"origem\":\"BONIFICACAO\",\"motivo\":\"Entrada de teste\"}";
        var inicio=new java.util.concurrent.CountDownLatch(1);
        try(var pool=java.util.concurrent.Executors.newVirtualThreadPerTaskExecutor()) {
            java.util.concurrent.Callable<Integer> enviar=()->{inicio.await();return mvc.perform(post("/api/estoque-pecas/"+estoque+"/entrada").cookie(auth,tokenCookie).header("X-XSRF-TOKEN",token).header("Idempotency-Key",chave).contentType("application/json").content(body)).andReturn().getResponse().getStatus();};
            var primeira=pool.submit(enviar);var segunda=pool.submit(enviar);inicio.countDown();
            assertEquals(200,primeira.get(20,java.util.concurrent.TimeUnit.SECONDS));assertEquals(200,segunda.get(20,java.util.concurrent.TimeUnit.SECONDS));
        }
        assertEquals(0,new java.math.BigDecimal("15").compareTo(jdbc.queryForObject("SELECT quantidade_atual FROM estoque_peca WHERE id=?",java.math.BigDecimal.class,estoque)));
        assertEquals(1,jdbc.queryForObject("SELECT COUNT(*) FROM movimentacao_estoque_peca WHERE id_estoque_peca=?",Integer.class,estoque));
        mvc.perform(get("/api/estoque-pecas/por-peca").cookie(auth).param("pecaId",Long.toString(peca)))
                .andExpect(status().isOk()).andExpect(jsonPath("$[0].id").value(estoque)).andExpect(jsonPath("$[0].controleVersao").value(1));
        mvc.perform(put("/api/estoque-pecas/"+estoque).cookie(auth,tokenCookie).header("X-XSRF-TOKEN",token)
                .header("Idempotency-Key",UUID.randomUUID().toString()).header("If-Match","\"0\"").contentType("application/json").content("{}"))
                .andExpect(status().isConflict());
        assertEquals(0,new java.math.BigDecimal("15").compareTo(jdbc.queryForObject("SELECT quantidade_atual FROM estoque_peca WHERE id=?",java.math.BigDecimal.class,estoque)));
        assertEquals(user.getId(),jdbc.queryForObject("SELECT id_usuario FROM movimentacao_estoque_peca WHERE id_estoque_peca=?",Long.class,estoque));
    }
    @Test void paginacaoLimitaRegistrosEContagemIndependeDaPagina() throws Exception {
        Usuario user=new Usuario();user.setNome("Administrador paginação");user.setCpf(Long.toString(java.util.concurrent.ThreadLocalRandom.current().nextLong(10000000000L,99999999999L)));user.setEmail(UUID.randomUUID()+"@example.test");user.setSenha("hash-teste");user.setStatus("ATIVO");user.setTipo_do_acesso("ADMINISTRADOR");user.setMfaAtivo(true);user.setMfaTipo("TOTP");user.setMfaSecret("segredo-teste");user=users.saveAndFlush(user);
        var session=sessions.criarSessaoCookie(user.getId());var auth=new Cookie(session.getName(),session.getValue());
        for(String recurso:java.util.List.of("local-estoque","usuario","fornecedor","peca","servico","veiculo","estoque-pecas","fornecimento-pecas","fornecimento-servicos","agendamento","atendimento","regra-manutencao-preventiva")) {
            var seletor=mvc.perform(get("/api/"+recurso+"/pagina").cookie(auth).param("tamanho","5").param("selecao","true")).andExpect(status().isOk()).andReturn().getResponse();
            var limitado=json.readTree(seletor.getContentAsString());assertTrue(limitado.path("content").size()<=5,recurso);assertEquals(0,limitado.path("resumo").size(),recurso);assertEquals(0,limitado.path("opcoes").size(),recurso);
            var resposta=mvc.perform(get("/api/"+recurso+"/pagina").cookie(auth).param("tamanho","2").param("ordenar","id")).andExpect(status().isOk()).andReturn().getResponse();
            var pagina=json.readTree(resposta.getContentAsString());assertTrue(pagina.path("content").isArray(),recurso);assertTrue(pagina.path("content").size()<=2,recurso);
            assertTrue(pagina.path("totalElements").longValue()>=pagina.path("content").size(),recurso);
            var vazia=mvc.perform(get("/api/"+recurso+"/pagina").cookie(auth).param("tamanho","2").param("pagina","99999")).andExpect(status().isOk()).andReturn().getResponse();
            assertEquals(0,json.readTree(vazia.getContentAsString()).path("content").size(),recurso);
            assertEquals(pagina.path("totalElements"),json.readTree(vazia.getContentAsString()).path("totalElements"),recurso);
        }
        mvc.perform(get("/api/usuario/pagina").cookie(auth).param("tamanho","101")).andExpect(status().isBadRequest());
        mvc.perform(get("/api/usuario/pagina")).andExpect(status().isUnauthorized());
    }
    @Test void migracoesCriamEstruturaEOutboxParticipaDoRollback() {
        assertTrue(jdbc.queryForObject("SELECT COUNT(*) FROM flyway_schema_history WHERE version='21' AND success=TRUE",Long.class)>0);
        assertEquals(3,jdbc.queryForObject("SELECT COUNT(*) FROM flyway_schema_history WHERE version IN ('21','22','23') AND success=TRUE",Integer.class));
        assertEquals(3,jdbc.queryForObject("SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema=DATABASE() AND table_name='atendimento' AND index_name='idx_atendimento_cliente_criado_id'",Integer.class));
        String key=UUID.randomUUID().toString();
        new TransactionTemplate(manager).execute(status->{outbox.enfileirar(key,"5511999999999","teste","pt_BR",Map.of("teste",true),null,null);status.setRollbackOnly();return null;});
        assertEquals(0,jdbc.queryForObject("SELECT COUNT(*) FROM notificacao_outbox WHERE chave_evento=?",Integer.class,key));
        String first=outbox.enfileirar(key,"5511999999999","teste","pt_BR",Map.of("teste",true),null,null);
        assertEquals(first,outbox.enfileirar(key,"5511999999999","teste","pt_BR",Map.of("teste",true),null,null));
    }
    @Test @org.springframework.transaction.annotation.Transactional
    void emailProtegidoEhProcessadoUmaVezELinksExpiradosNaoSaoEnviados() {
        var crypto=new MfaCryptoService("AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=");
        var mail=org.mockito.Mockito.mock(org.springframework.mail.javamail.JavaMailSender.class);
        org.mockito.Mockito.when(mail.createMimeMessage()).thenAnswer(invocation->new jakarta.mail.internet.MimeMessage((jakarta.mail.Session)null));
        var worker=new NotificacaoWorker(jdbc,json);
        org.springframework.test.util.ReflectionTestUtils.setField(worker,"mail",mail);
        org.springframework.test.util.ReflectionTestUtils.setField(worker,"crypto",crypto);
        org.springframework.test.util.ReflectionTestUtils.setField(worker,"remetente","teste@example.test");
        org.springframework.test.util.ReflectionTestUtils.setField(worker,"phone","");
        org.springframework.test.util.ReflectionTestUtils.setField(worker,"token","");
        String destinatario=UUID.randomUUID()+"@example.test";
        outbox.enfileirarEmail(destinatario,"Teste","Link privado de teste",null,java.time.Instant.now().plusSeconds(600));
        outbox.enfileirarEmail(destinatario,"Expirado","Link expirado",null,java.time.Instant.now().minusSeconds(1));
        String protegido=jdbc.queryForObject("SELECT parametros FROM notificacao_outbox WHERE destinatario=? AND template='Teste'",String.class,destinatario);
        assertFalse(protegido.contains("Link privado"));
        // Este schema contém somente mensagens sintéticas; isola a seleção do lote desta verificação.
        jdbc.update("UPDATE notificacao_outbox SET proxima_tentativa_em=DATE_ADD(CURRENT_TIMESTAMP,INTERVAL 1 DAY) WHERE destinatario<>? AND estado IN ('PENDENTE','TENTAR_NOVAMENTE')",destinatario);
        worker.processar();worker.processar();
        org.mockito.Mockito.verify(mail,org.mockito.Mockito.times(1)).send(org.mockito.ArgumentMatchers.any(jakarta.mail.internet.MimeMessage.class));
        assertEquals("ACEITA",jdbc.queryForObject("SELECT estado FROM notificacao_outbox WHERE destinatario=? AND template='Teste'",String.class,destinatario));
        assertEquals("",jdbc.queryForObject("SELECT parametros FROM notificacao_outbox WHERE destinatario=? AND template='Teste'",String.class,destinatario));
        assertEquals("EXPIRADA",jdbc.queryForObject("SELECT estado FROM notificacao_outbox WHERE destinatario=? AND template='Expirado'",String.class,destinatario));
    }
    @Test void idempotenciaConfirmaUmaVezERecusaOutraOperacaoNaMesmaChave() throws Exception {
        Usuario user=new Usuario();user.setNome("Administrador integração");user.setCpf(Long.toString(java.util.concurrent.ThreadLocalRandom.current().nextLong(10000000000L,99999999999L)));user.setEmail(UUID.randomUUID()+"@example.test");user.setSenha("hash-teste");user.setStatus("ATIVO");user.setTipo_do_acesso("ADMINISTRADOR");user=users.saveAndFlush(user);
        user.setMfaAtivo(true);user.setMfaTipo("TOTP");user.setMfaSecret("segredo-teste");user=users.saveAndFlush(user);
        var session=sessions.criarSessaoCookie(user.getId());var auth=new Cookie(session.getName(),session.getValue());
        var csrf=mvc.perform(get("/api/auth/csrf")).andExpect(status().isOk()).andReturn().getResponse();
        String token=json.readTree(csrf.getContentAsString()).path("token").asText();Cookie tokenCookie=csrf.getCookie("XSRF-TOKEN");assertNotNull(tokenCookie);
        String cnpj=Long.toString(java.util.concurrent.ThreadLocalRandom.current().nextLong(10000000000000L,99999999999999L));
        String key=UUID.randomUUID().toString();String body="{\"cnpj\":\"90909090909090\",\"razaoSocial\":\"Fornecedor integração\",\"email\":\"fornecedor-integracao@example.test\"}".replace("90909090909090",cnpj).replace("fornecedor-integracao@example.test",UUID.randomUUID()+"@example.test");
        var first=mvc.perform(post("/api/fornecedor").cookie(auth,tokenCookie).header("X-XSRF-TOKEN",token).header("Idempotency-Key",key).contentType("application/json").content(body)).andExpect(status().isCreated()).andReturn().getResponse();
        var repeated=mvc.perform(post("/api/fornecedor").cookie(auth,tokenCookie).header("X-XSRF-TOKEN",token).header("Idempotency-Key",key).contentType("application/json").content(body)).andExpect(status().isCreated()).andReturn().getResponse();
        assertEquals(json.readTree(first.getContentAsString()),json.readTree(repeated.getContentAsString()));
        assertEquals(1,jdbc.queryForObject("SELECT COUNT(*) FROM fornecedor WHERE cnpj=?",Integer.class,cnpj));
        assertEquals(1,jdbc.queryForObject("SELECT COUNT(*) FROM auditoria_evento WHERE usuario_id=? AND componente='FORNECEDOR'",Integer.class,user.getId()));
        mvc.perform(post("/api/fornecedor").cookie(auth,tokenCookie).header("X-XSRF-TOKEN",token).header("Idempotency-Key",key).contentType("application/json").content(body.replace(cnpj,"80808080808080"))).andExpect(status().isConflict());
        mvc.perform(post("/api/fornecedor").cookie(auth).contentType("application/json").content(body)).andExpect(status().isForbidden());
        long id=json.readTree(first.getContentAsString()).path("id").longValue();
        mvc.perform(put("/api/fornecedor/"+id).cookie(auth,tokenCookie).header("X-XSRF-TOKEN",token).header("Idempotency-Key",UUID.randomUUID().toString()).header("If-Match","\"0\"").contentType("application/json").content(body)).andExpect(status().isOk());
        var replayAposEdicao=mvc.perform(post("/api/fornecedor").cookie(auth,tokenCookie).header("X-XSRF-TOKEN",token).header("Idempotency-Key",key).contentType("application/json").content(body)).andExpect(status().isCreated()).andReturn().getResponse();
        assertEquals(json.readTree(first.getContentAsString()),json.readTree(replayAposEdicao.getContentAsString()),"A confirmação original deve manter sua revisão mesmo após outra edição.");
        mvc.perform(put("/api/fornecedor/"+id).cookie(auth,tokenCookie).header("X-XSRF-TOKEN",token).header("Idempotency-Key",UUID.randomUUID().toString()).header("If-Match","\"0\"").contentType("application/json").content(body.replace("Fornecedor integração","Alteração concorrente"))).andExpect(status().isConflict());
        assertEquals("Fornecedor integração",jdbc.queryForObject("SELECT razao_social FROM fornecedor WHERE id=?",String.class,id));
    }
}
