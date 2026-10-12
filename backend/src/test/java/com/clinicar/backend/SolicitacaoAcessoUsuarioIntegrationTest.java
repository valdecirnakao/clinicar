package com.clinicar.backend;

import com.clinicar.backend.dto.*;
import com.clinicar.backend.model.*;
import com.clinicar.backend.repository.*;
import com.clinicar.backend.service.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.*;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.server.ResponseStatusException;
import jakarta.servlet.http.Cookie;
import java.util.*;
import java.util.concurrent.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest @AutoConfigureMockMvc @ActiveProfiles("test")
class SolicitacaoAcessoUsuarioIntegrationTest {
    @Autowired SolicitacaoAcessoUsuarioService service;
    @Autowired UsuarioService usuarioService;
    @Autowired PeriodoAcessoUsuarioService periodos;
    @Autowired UsuarioExclusaoService exclusaoService;
    @Autowired UsuarioRepository usuarios;
    @Autowired AuthSessionRepository sessoes;
    @Autowired SessionService sessions;
    @Autowired MockMvc mvc;
    @MockitoSpyBean SolicitacaoAcessoUsuarioRepository solicitacoes;
    @MockitoBean WhatsAppService whatsapp;
    Usuario admin, cliente, colaborador;
    final String motivo = "Não preciso mais utilizar o acesso neste momento.";
    @BeforeEach void preparar() { admin = criar("ADMINISTRADOR"); cliente = criar("CLIENTE"); colaborador = criar("COLABORADOR"); }
    Usuario criar(String perfil) {
        var u = new Usuario(); u.setNome("Usuário de teste " + perfil); u.setEmail(UUID.randomUUID() + "@example.com");
        u.setTipo_do_acesso(perfil); u.setStatus("ATIVO"); u.setSenha("hash-ficticio-de-teste");
        u.setMfaAtivo(true); u.setMfaTipo("TOTP"); u.setMfaSecret("segredo-ficticio-de-teste");
        return usuarios.saveAndFlush(u);
    }
    @AfterEach void limpar() {
        reset(solicitacoes);
        var ids = Set.of(admin.getId(), cliente.getId(), colaborador.getId());
        solicitacoes.findAll().stream().filter(s -> ids.contains(s.getUsuarioId())).forEach(solicitacoes::delete);
        sessoes.findAll().stream().filter(s -> ids.contains(s.getUsuarioId())).forEach(sessoes::delete);
        ids.forEach(usuarios::deleteById);
    }
    Cookie cookie(Usuario u) {
        var cookie = sessions.criarSessaoCookie(u.getId()); return new Cookie(cookie.getName(), cookie.getValue());
    }
    SolicitacaoAcessoResponse criarPedido(Usuario u, String tipo) { return service.criar(u.getId(), new SolicitacaoAcessoRequest(tipo, motivo)); }

    @Test void clienteEColaboradorSolicitamSemModificarStatusOuSessoes() {
        for (Usuario u : List.of(cliente, colaborador)) {
            var token = sessions.criarSessaoCookie(u.getId()).getValue();
            var s = criarPedido(u, "ENCERRAMENTO");
            assertEquals("PENDENTE", s.status()); assertEquals(u.getId(), s.usuarioId());
            assertEquals("ATIVO", usuarios.findById(u.getId()).orElseThrow().getStatus());
            assertTrue(sessions.validarSessao(token).isPresent());
            var pagina = service.minhas(u.getId(), 0, 10);
            assertEquals(1, pagina.total()); assertEquals(1, pagina.pendentes());
            assertTrue(pagina.itens().stream().allMatch(p -> p.usuarioId().equals(u.getId())));
            assertTrue(exclusaoService.usuariosComVinculos().contains(u.getId()));
        }
    }
    @Test void aprovarRevogaTodasSessoesRegistraResponsavelENaoPermiteNovaDecisao() {
        var token1 = sessions.criarSessaoCookie(cliente.getId()).getValue();
        var token2 = sessions.criarSessaoCookie(cliente.getId()).getValue();
        var s = criarPedido(cliente, "INATIVACAO");
        var resposta = service.decidir(s.id(), admin.getId(), new DecisaoSolicitacaoAcessoRequest("APROVAR", "  Solicitação confirmada com o cliente.  "));
        assertEquals("APROVADA", resposta.status()); assertEquals(admin.getNome(), resposta.administradorNome());
        assertEquals("Solicitação confirmada com o cliente.", resposta.motivoDecisao()); assertNotNull(resposta.decididoEm());
        assertEquals("INATIVO", usuarios.findById(cliente.getId()).orElseThrow().getStatus());
        assertTrue(sessions.validarSessao(token1).isEmpty()); assertTrue(sessions.validarSessao(token2).isEmpty());
        assertEquals(admin.getId(), solicitacoes.findById(s.id()).orElseThrow().getAdministradorId());
        assertNull(solicitacoes.findById(s.id()).orElseThrow().getPendenciaUsuarioId());
        assertEquals(409, assertThrows(ResponseStatusException.class,
                () -> service.decidir(s.id(), admin.getId(), new DecisaoSolicitacaoAcessoRequest("RECUSAR", motivo))).getStatusCode().value());
    }
    @Test void recusaMantemAcessoEPermiteNovaSolicitacaoPreservandoHistorico() {
        var token = sessions.criarSessaoCookie(colaborador.getId()).getValue();
        var s = criarPedido(colaborador, "ENCERRAMENTO");
        var resposta = service.decidir(s.id(), admin.getId(), new DecisaoSolicitacaoAcessoRequest("RECUSAR", motivo));
        assertEquals("RECUSADA", resposta.status()); assertTrue(sessions.validarSessao(token).isPresent());
        criarPedido(colaborador, "INATIVACAO");
        assertEquals(2, service.minhas(colaborador.getId(), 0, 10).total());
        assertEquals(1, service.minhas(colaborador.getId(), 0, 10).pendentes());
        assertTrue(exclusaoService.usuariosComVinculos().contains(admin.getId()));
    }
    @Test void exigeMotivosTipoValidoERecusaDuplicidade() {
        for (String texto : new String[]{null, " ", "curto", "x".repeat(1001)}) {
            assertThrows(IllegalArgumentException.class, () -> service.criar(cliente.getId(), new SolicitacaoAcessoRequest("INATIVACAO", texto)));
        }
        assertThrows(IllegalArgumentException.class, () -> service.criar(cliente.getId(), new SolicitacaoAcessoRequest("REATIVACAO", motivo)));
        var s = criarPedido(cliente, "INATIVACAO");
        assertEquals(409, assertThrows(ResponseStatusException.class, () -> criarPedido(cliente, "ENCERRAMENTO")).getStatusCode().value());
        assertThrows(IllegalArgumentException.class, () -> service.decidir(s.id(), admin.getId(), new DecisaoSolicitacaoAcessoRequest("APROVAR", " ")));
        assertEquals("PENDENTE", solicitacoes.findById(s.id()).orElseThrow().getStatus());
    }
    @Test void restringeAdministradorEImpedeClienteDeAnalisarPedidosDeTerceiros() throws Exception {
        var s = criarPedido(colaborador, "INATIVACAO");
        assertEquals(403, assertThrows(ResponseStatusException.class, () -> criarPedido(admin, "INATIVACAO")).getStatusCode().value());
        mvc.perform(get("/api/usuario/solicitacoes-acesso").cookie(cookie(cliente))).andExpect(status().isForbidden());
        mvc.perform(put("/api/usuario/solicitacoes-acesso/" + s.id() + "/decisao").cookie(cookie(cliente))
                .contentType("application/json").content("{\"decisao\":\"APROVAR\",\"justificativa\":\"Solicitação confirmada com o usuário.\"}"))
                .andExpect(status().isForbidden());
        mvc.perform(get("/api/usuario/solicitacoes-acesso/minhas")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/usuario/solicitacoes-acesso/minhas").cookie(cookie(cliente)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.total").value(0)).andExpect(header().string("Cache-Control", "no-store"));
    }
    @Test void donoVemDaSessaoMesmoQueJsonInformeOutroUsuario() throws Exception {
        mvc.perform(post("/api/usuario/solicitacoes-acesso/minhas").cookie(cookie(cliente)).header("Origin", "http://localhost:4200").contentType("application/json")
                .content("{\"tipo\":\"INATIVACAO\",\"justificativa\":\"Não preciso mais utilizar este acesso.\",\"usuarioId\":" + colaborador.getId() + "}"))
                .andExpect(status().isCreated()).andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:4200"))
                .andExpect(jsonPath("$.usuarioId").value(cliente.getId().intValue()));
        assertEquals(0, service.minhas(colaborador.getId(), 0, 10).total());
    }
    @Test void clienteEColaboradorNaoPodemAlterarProprioStatusOuPerfilNemExcluirConta() throws Exception {
        for (Usuario u : List.of(cliente, colaborador)) {
            for (String campo : List.of("{\"status\":\"INATIVO\"}", "{\"status\":\"ATIVO\"}", "{\"tipo_do_acesso\":\"ADMINISTRADOR\"}")) {
                mvc.perform(put("/api/usuario/" + u.getId()).cookie(cookie(u)).contentType("application/json").content(campo))
                        .andExpect(status().isForbidden());
            }
            mvc.perform(delete("/api/usuario/" + u.getId()).cookie(cookie(u)).contentType("application/json")
                    .content("{\"justificativa\":\"Quero encerrar meu acesso ao sistema.\"}"))
                    .andExpect(status().isForbidden());
            assertEquals("ATIVO", usuarios.findById(u.getId()).orElseThrow().getStatus());
        }
    }
    @Test void perfilAlteradoImpedeAprovacaoEReativacaoNaoRecuperaSessoesAntigas() {
        var s = criarPedido(cliente, "ENCERRAMENTO"); cliente.setTipo_do_acesso("ADMINISTRADOR"); usuarios.saveAndFlush(cliente);
        assertEquals(409, assertThrows(ResponseStatusException.class,
                () -> service.decidir(s.id(), admin.getId(), new DecisaoSolicitacaoAcessoRequest("APROVAR", motivo))).getStatusCode().value());
        service.decidir(s.id(), admin.getId(), new DecisaoSolicitacaoAcessoRequest("RECUSAR", motivo));
        cliente.setTipo_do_acesso("CLIENTE"); usuarios.saveAndFlush(cliente);
        var token = sessions.criarSessaoCookie(cliente.getId()).getValue(); var novo = criarPedido(cliente, "INATIVACAO");
        service.decidir(novo.id(), admin.getId(), new DecisaoSolicitacaoAcessoRequest("APROVAR", motivo));
        var pedido = new UsuarioRequest(); pedido.setNome(cliente.getNome()); pedido.setEmail(cliente.getEmail());
        pedido.setStatus("ATIVO"); pedido.setTipo_do_acesso("CLIENTE");
        usuarioService.atualizarPorAdministrador(cliente.getId(), pedido, admin.getId());
        assertTrue(sessions.validarSessao(token).isEmpty());
        assertTrue(sessions.validarSessao(sessions.criarSessaoCookie(cliente.getId()).getValue()).isPresent());
    }
    @Test void falhaNaDecisaoReverteInativacaoERevogacaoDeSessoes() {
        var token = sessions.criarSessaoCookie(cliente.getId()).getValue(); var s = criarPedido(cliente, "INATIVACAO");
        doThrow(new org.springframework.dao.DataIntegrityViolationException("Falha simulada na decisão"))
                .when(solicitacoes).saveAndFlush(any(SolicitacaoAcessoUsuario.class));
        assertThrows(org.springframework.dao.DataIntegrityViolationException.class,
                () -> service.decidir(s.id(), admin.getId(), new DecisaoSolicitacaoAcessoRequest("APROVAR", motivo)));
        assertEquals("PENDENTE", solicitacoes.findById(s.id()).orElseThrow().getStatus());
        assertEquals("ATIVO", usuarios.findById(cliente.getId()).orElseThrow().getStatus());
        assertTrue(sessions.validarSessao(token).isPresent());
        verifyNoInteractions(whatsapp);
    }
    @Test void pedidosConcorrentesMantemSomenteUmaPendencia() throws Exception {
        var inicio = new CountDownLatch(1);
        try (var executor = Executors.newFixedThreadPool(2)) {
            Callable<Integer> tarefa = () -> { inicio.await(); try { criarPedido(cliente, "INATIVACAO"); return 201; }
                catch (ResponseStatusException ex) { return ex.getStatusCode().value(); } };
            var a = executor.submit(tarefa); var b = executor.submit(tarefa); inicio.countDown();
            var resultados = List.of(a.get(30, TimeUnit.SECONDS), b.get(30, TimeUnit.SECONDS));
            assertTrue(resultados.contains(201)); assertTrue(resultados.contains(409));
            assertEquals(1, service.minhas(cliente.getId(), 0, 10).total());
        }
    }
    @Test void paginacaoESnapshotsPreservamHistorico() {
        var s = criarPedido(cliente, "INATIVACAO");
        service.decidir(s.id(), admin.getId(), new DecisaoSolicitacaoAcessoRequest("RECUSAR", motivo));
        var segundo = criarPedido(cliente, "ENCERRAMENTO");
        String nomeAnterior = cliente.getNome(); cliente.setNome("Nome atualizado"); usuarios.saveAndFlush(cliente);
        var pagina = service.minhas(cliente.getId(), 0, 1);
        assertEquals(2, pagina.total()); assertEquals(2, pagina.totalPaginas()); assertEquals(segundo.id(), pagina.itens().getFirst().id());
        assertEquals(nomeAnterior, pagina.itens().getFirst().usuarioNome());
        assertThrows(IllegalArgumentException.class, () -> service.listar(admin.getId(), "TODAS", -1, 10));
        assertThrows(IllegalArgumentException.class, () -> service.minhas(cliente.getId(), 0, 51));
    }

    java.time.LocalDate hoje() { return java.time.LocalDate.now(PeriodoAcessoUsuarioService.FUSO); }
    SolicitacaoAcessoResponse temporaria(java.time.LocalDate inicio, java.time.LocalDate fim) {
        return service.criar(colaborador.getId(), new SolicitacaoAcessoRequest("TEMPORARIA", "Férias programadas do colaborador.", inicio, fim));
    }
    void aprovar(SolicitacaoAcessoResponse pedido) { service.decidir(pedido.id(), admin.getId(), new DecisaoSolicitacaoAcessoRequest("APROVAR", "Férias aprovadas pela administração.")); }
    @Test void periodoFuturoSoSuspendeNaDataIncluiUltimoDiaERetornaUmaVez() {
        var token = sessions.criarSessaoCookie(colaborador.getId()).getValue();
        var inicio = hoje().plusDays(2); var fim = inicio.plusDays(5);
        var pedido = temporaria(inicio, fim); aprovar(pedido);
        assertEquals("ATIVO", usuarios.findById(colaborador.getId()).orElseThrow().getStatus());
        assertEquals("AGENDADA", solicitacoes.findById(pedido.id()).orElseThrow().getSituacaoPeriodo());
        assertTrue(sessions.validarSessao(token).isPresent());
        periodos.processar(pedido.id(), inicio.minusDays(1));
        assertEquals("ATIVO", usuarios.findById(colaborador.getId()).orElseThrow().getStatus());
        periodos.processar(pedido.id(), inicio);
        assertEquals("INATIVO", usuarios.findById(colaborador.getId()).orElseThrow().getStatus());
        assertTrue(sessions.validarSessao(token).isEmpty());
        var suspensao = solicitacoes.findById(pedido.id()).orElseThrow().getInativadoEm(); assertNotNull(suspensao);
        periodos.processar(pedido.id(), fim);
        assertEquals("INATIVO", usuarios.findById(colaborador.getId()).orElseThrow().getStatus());
        periodos.processar(pedido.id(), fim.plusDays(1));
        assertEquals("ATIVO", usuarios.findById(colaborador.getId()).orElseThrow().getStatus());
        var retorno = solicitacoes.findById(pedido.id()).orElseThrow().getReativadoEm(); assertNotNull(retorno);
        assertEquals("CONCLUIDA", solicitacoes.findById(pedido.id()).orElseThrow().getSituacaoPeriodo());
        periodos.processar(pedido.id(), fim.plusDays(2));
        assertEquals(retorno, solicitacoes.findById(pedido.id()).orElseThrow().getReativadoEm());
        assertTrue(sessions.validarSessao(token).isEmpty());
        assertTrue(sessions.validarSessao(sessions.criarSessaoCookie(colaborador.getId()).getValue()).isPresent());
    }
    @Test void periodoHojeSuspendeImediatamenteERecusaNaoPrograma() {
        var pedido = temporaria(hoje(), hoje()); aprovar(pedido);
        assertEquals("EM_CURSO", solicitacoes.findById(pedido.id()).orElseThrow().getSituacaoPeriodo());
        assertEquals("INATIVO", usuarios.findById(colaborador.getId()).orElseThrow().getStatus());
        periodos.processar(pedido.id(), hoje().plusDays(1));
        var outro = temporaria(hoje().plusDays(2), hoje().plusDays(3));
        service.decidir(outro.id(), admin.getId(), new DecisaoSolicitacaoAcessoRequest("RECUSAR", motivo));
        periodos.processar(outro.id(), hoje().plusDays(2));
        assertEquals("ATIVO", usuarios.findById(colaborador.getId()).orElseThrow().getStatus());
        assertNull(solicitacoes.findById(outro.id()).orElseThrow().getSituacaoPeriodo());
    }
    @Test void validaPerfilDatasENaoPermiteOutraSolicitacaoDurantePeriodoAprovado() {
        assertEquals(403, assertThrows(ResponseStatusException.class, () -> service.criar(cliente.getId(), new SolicitacaoAcessoRequest("TEMPORARIA", motivo, hoje(), hoje()))).getStatusCode().value());
        for (var pedido : List.of(new SolicitacaoAcessoRequest("TEMPORARIA", motivo, null, hoje()),
                new SolicitacaoAcessoRequest("TEMPORARIA", motivo, hoje().minusDays(1), hoje()),
                new SolicitacaoAcessoRequest("TEMPORARIA", motivo, hoje().plusDays(1), hoje()),
                new SolicitacaoAcessoRequest("INATIVACAO", motivo, hoje(), hoje()))) {
            assertThrows(IllegalArgumentException.class, () -> service.criar(colaborador.getId(), pedido));
        }
        var pedido = temporaria(hoje().plusDays(1), hoje().plusDays(2)); aprovar(pedido);
        assertThrows(ResponseStatusException.class, () -> criarPedido(colaborador, "ENCERRAMENTO"));
    }
    @Test void inativacaoAdministrativaPosteriorImpedeRetornoAutomatico() {
        var pedido = temporaria(hoje(), hoje().plusDays(2)); aprovar(pedido);
        usuarioService.inativarPorAdministrador(colaborador.getId(), admin.getId());
        periodos.processar(pedido.id(), hoje().plusDays(3));
        assertEquals("INATIVO", usuarios.findById(colaborador.getId()).orElseThrow().getStatus());
        var registro = solicitacoes.findById(pedido.id()).orElseThrow();
        assertEquals("INTERROMPIDA", registro.getSituacaoPeriodo()); assertNotNull(registro.getInterrompidoEm()); assertNull(registro.getReativadoEm());
    }
    @Test void alteracaoAdministrativaDeStatusOuPerfilCancelaAgendamento() {
        var pedido = temporaria(hoje().plusDays(1), hoje().plusDays(2)); aprovar(pedido);
        var alteracao = new UsuarioRequest(); alteracao.setStatus("ATIVO"); alteracao.setTipo_do_acesso("COLABORADOR"); alteracao.setEmail(colaborador.getEmail()); alteracao.setNome(colaborador.getNome());
        usuarioService.atualizarPorAdministrador(colaborador.getId(), alteracao, admin.getId());
        periodos.processar(pedido.id(), hoje().plusDays(1));
        assertEquals("ATIVO", usuarios.findById(colaborador.getId()).orElseThrow().getStatus());
        assertEquals("INTERROMPIDA", solicitacoes.findById(pedido.id()).orElseThrow().getSituacaoPeriodo());
    }
    @Test void reinicioAposPeriodoNaoSuspendeRetroativamenteERecuperaSuspensaoEmCurso() {
        var pedido = temporaria(hoje().plusDays(1), hoje().plusDays(2)); aprovar(pedido);
        periodos.processar(pedido.id(), hoje().plusDays(4));
        assertEquals("ATIVO", usuarios.findById(colaborador.getId()).orElseThrow().getStatus());
        assertEquals("CONCLUIDA", solicitacoes.findById(pedido.id()).orElseThrow().getSituacaoPeriodo());
        assertNull(solicitacoes.findById(pedido.id()).orElseThrow().getInativadoEm());
        var outro = temporaria(hoje(), hoje()); aprovar(outro);
        periodos.processar(outro.id(), hoje().plusDays(10));
        assertEquals("ATIVO", usuarios.findById(colaborador.getId()).orElseThrow().getStatus());
        assertNotNull(solicitacoes.findById(outro.id()).orElseThrow().getReativadoEm());
    }
    @Test void falhaNoRegistroDoRetornoReverteStatusEMantemPeriodoParaNovaTentativa() {
        var pedido = temporaria(hoje(), hoje()); aprovar(pedido);
        doThrow(new org.springframework.dao.DataIntegrityViolationException("falha simulada")).when(solicitacoes).saveAndFlush(any(SolicitacaoAcessoUsuario.class));
        assertThrows(org.springframework.dao.DataIntegrityViolationException.class, () -> periodos.processar(pedido.id(), hoje().plusDays(1)));
        reset(solicitacoes);
        assertEquals("INATIVO", usuarios.findById(colaborador.getId()).orElseThrow().getStatus());
        assertEquals("EM_CURSO", solicitacoes.findById(pedido.id()).orElseThrow().getSituacaoPeriodo());
        assertNull(solicitacoes.findById(pedido.id()).orElseThrow().getReativadoEm());
        periodos.processar(pedido.id(), hoje().plusDays(1));
        assertEquals("ATIVO", usuarios.findById(colaborador.getId()).orElseThrow().getStatus());
    }
    @Test void doisProcessamentosConcorrentesNaoDuplicamSuspensaoNemInterrompemPeriodo() throws Exception {
        var inicio = hoje().plusDays(1);
        var pedido = temporaria(inicio, inicio); aprovar(pedido);
        var executor = Executors.newFixedThreadPool(2);
        var partida = new CountDownLatch(1);
        try {
            var tarefas = new ArrayList<Future<?>>();
            for (int i = 0; i < 2; i++) tarefas.add(executor.submit(() -> {
                try { partida.await(); periodos.processar(pedido.id(), inicio); }
                catch (InterruptedException e) { Thread.currentThread().interrupt(); throw new RuntimeException(e); }
            }));
            partida.countDown(); for (var tarefa : tarefas) tarefa.get(15, TimeUnit.SECONDS);
            assertEquals("EM_CURSO", solicitacoes.findById(pedido.id()).orElseThrow().getSituacaoPeriodo());
            assertEquals("INATIVO", usuarios.findById(colaborador.getId()).orElseThrow().getStatus());
            assertNull(solicitacoes.findById(pedido.id()).orElseThrow().getInterrompidoEm());
        } finally { executor.shutdownNow(); }
    }
    @Test void mudancaDePerfilImpedeReativacaoAutomatica() {
        var pedido = temporaria(hoje(), hoje()); aprovar(pedido);
        var alteracao = new UsuarioRequest(); alteracao.setTipo_do_acesso("CLIENTE");
        alteracao.setEmail(colaborador.getEmail()); alteracao.setNome(colaborador.getNome());
        usuarioService.atualizarPorAdministrador(colaborador.getId(), alteracao, admin.getId());
        periodos.processar(pedido.id(), hoje().plusDays(1));
        assertEquals("INATIVO", usuarios.findById(colaborador.getId()).orElseThrow().getStatus());
        assertEquals("INTERROMPIDA", solicitacoes.findById(pedido.id()).orElseThrow().getSituacaoPeriodo());
    }
}
