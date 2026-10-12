package com.clinicar.backend;

import com.clinicar.backend.dto.UsuarioRequest;
import com.clinicar.backend.model.*;
import com.clinicar.backend.repository.*;
import com.clinicar.backend.service.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.web.server.ResponseStatusException;
import java.util.*;
import java.util.concurrent.*;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
class ProtecaoAdministrativaIntegrationTest {
    @Autowired UsuarioService service;
    @Autowired UsuarioRepository usuarios;
    @Autowired AuthSessionRepository sessoes;
    @Autowired SessionService sessionService;
    @MockitoBean WhatsAppService whatsapp;
    Usuario admin, outro;

    @BeforeEach void preparar() {
        admin = criar("Administrador A"); outro = criar("Administrador B");
    }
    Usuario criar(String nome) {
        var u = new Usuario(); u.setNome(nome); u.setEmail(UUID.randomUUID() + "@example.com");
        u.setTipo_do_acesso("ADMINISTRADOR"); u.setStatus("ATIVO"); u.setSenha("hash-ficticio-de-teste");
        u.setMfaAtivo(true); u.setMfaTipo("TOTP"); u.setMfaSecret("segredo-ficticio-de-teste");
        return usuarios.saveAndFlush(u);
    }
    UsuarioRequest pedido(Usuario u, String status, String perfil) {
        var r = new UsuarioRequest(); r.setNome(u.getNome()); r.setEmail(u.getEmail());
        r.setStatus(status); r.setTipo_do_acesso(perfil); return r;
    }
    @AfterEach void limpar() {
        sessoes.findAll().stream().filter(s -> s.getUsuarioId().equals(admin.getId()) || s.getUsuarioId().equals(outro.getId()))
                .forEach(sessoes::delete);
        usuarios.deleteById(outro.getId()); usuarios.deleteById(admin.getId());
    }
    @Test void bloqueiaAutoInativacaoMesmoComOutroAdministradorConfigurado() {
        String token = sessionService.criarSessaoCookie(admin.getId()).getValue();
        var erro = assertThrows(ResponseStatusException.class,
                () -> service.atualizarPorAdministrador(admin.getId(), pedido(admin, "INATIVO", "ADMINISTRADOR"), admin.getId()));
        assertEquals(409, erro.getStatusCode().value()); assertTrue(erro.getReason().contains("próprio"));
        assertEquals("ATIVO", usuarios.findById(admin.getId()).orElseThrow().getStatus());
        assertTrue(sessionService.validarSessao(token).isPresent());
    }
    @Test void bloqueiaUltimoAcessoQuandoOutroAdministradorNaoConcluiuMfa() {
        outro.setMfaAtivo(false); outro.setMfaSecret(null); outro.setMfaTipo(null); usuarios.saveAndFlush(outro);
        for (var r : List.of(pedido(admin, "INATIVO", "ADMINISTRADOR"), pedido(admin, "ATIVO", "CLIENTE"))) {
            assertEquals(409, assertThrows(ResponseStatusException.class,
                    () -> service.atualizarPorAdministrador(admin.getId(), r, outro.getId())).getStatusCode().value());
        }
        assertEquals("ADMINISTRADOR", usuarios.findById(admin.getId()).orElseThrow().getTipo_do_acesso());
        assertEquals("ATIVO", usuarios.findById(admin.getId()).orElseThrow().getStatus());
    }
    @Test void revogaTodasAsSessoesEReativacaoNaoRecuperaTokensAntigos() {
        String token1 = sessionService.criarSessaoCookie(outro.getId()).getValue();
        String token2 = sessionService.criarSessaoCookie(outro.getId()).getValue();
        String tokenAdmin = sessionService.criarSessaoCookie(admin.getId()).getValue();
        service.atualizarPorAdministrador(outro.getId(), pedido(outro, "INATIVO", "ADMINISTRADOR"), admin.getId());
        assertTrue(sessoes.findAll().stream().filter(s -> s.getUsuarioId().equals(outro.getId())).allMatch(AuthSession::getRevogado));
        assertTrue(sessionService.validarSessao(token1).isEmpty()); assertTrue(sessionService.validarSessao(token2).isEmpty());
        assertTrue(sessionService.validarSessao(tokenAdmin).isPresent());
        service.atualizarPorAdministrador(outro.getId(), pedido(outro, "ATIVO", "ADMINISTRADOR"), admin.getId());
        assertTrue(sessionService.validarSessao(token1).isEmpty()); assertTrue(sessionService.validarSessao(token2).isEmpty());
        String novoToken = sessionService.criarSessaoCookie(outro.getId()).getValue();
        assertTrue(sessionService.validarSessao(novoToken).isPresent());
    }
    @Test void naoPermiteAtorInativoAlterarUsuario() {
        admin.setStatus("INATIVO"); usuarios.saveAndFlush(admin);
        assertEquals(403, assertThrows(ResponseStatusException.class,
                () -> service.atualizarPorAdministrador(outro.getId(), pedido(outro, "INATIVO", "ADMINISTRADOR"), admin.getId())).getStatusCode().value());
        assertEquals("ATIVO", usuarios.findById(outro.getId()).orElseThrow().getStatus());
    }
    @Test void mudancasSimultaneasDePerfilPreservamUmAdministradorConfigurado() throws Exception {
        var inicio = new CountDownLatch(1);
        try (var executor = Executors.newFixedThreadPool(2)) {
            var a = executor.submit(() -> alterarPerfil(admin, inicio));
            var b = executor.submit(() -> alterarPerfil(outro, inicio));
            inicio.countDown();
            var resultados = List.of(a.get(30, TimeUnit.SECONDS), b.get(30, TimeUnit.SECONDS));
            assertEquals(1, resultados.stream().filter(c -> c == 200).count());
            assertEquals(1, usuarios.findAll().stream().filter(u -> u.getId().equals(admin.getId()) || u.getId().equals(outro.getId()))
                    .filter(ProtecaoAdministrativaService::aptoParaAcesso).count());
        }
    }
    int alterarPerfil(Usuario u, CountDownLatch inicio) throws Exception {
        inicio.await();
        try { service.atualizarPorAdministrador(u.getId(), pedido(u, "ATIVO", "CLIENTE"), u.getId()); return 200; }
        catch (ResponseStatusException ex) { return ex.getStatusCode().value(); }
    }
}
