package com.clinicar.backend;

import com.clinicar.backend.model.*;
import com.clinicar.backend.repository.*;
import com.clinicar.backend.service.UsuarioExclusaoService;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.server.ResponseStatusException;
import java.time.*;
import java.util.UUID;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@SpringBootTest
@ActiveProfiles("test")
class UsuarioExclusaoIntegrationTest {
    @Autowired UsuarioExclusaoService service;
    @Autowired UsuarioRepository usuarios;
    @Autowired EntityManager em;
    @Autowired PlatformTransactionManager manager;
    @MockitoSpyBean AuditoriaExclusaoUsuarioRepository auditoria;
    Usuario admin, alvo;
    final String motivo = "Cadastro duplicado criado por engano durante o teste.";

    void transacao(Runnable acao) { new TransactionTemplate(manager).executeWithoutResult(tx -> acao.run()); }
    @BeforeEach void preparar() {
        admin = usuario("Administrador responsável", "ADMINISTRADOR");
        alvo = usuario("Cadastro sem uso", "CLIENTE");
    }
    Usuario usuario(String nome, String perfil) {
        var u = new Usuario(); u.setNome(nome); u.setEmail(UUID.randomUUID() + "@example.com");
        u.setStatus("ATIVO"); u.setTipo_do_acesso(perfil);
        return usuarios.saveAndFlush(u);
    }
    @AfterEach void limpar() {
        reset(auditoria);
        transacao(() -> {
            for (String tabela : new String[]{"veiculo", "auth_session", "password_reset_token", "auditoria_reset_mfa"}) {
                String coluna = tabela.equals("veiculo") ? "id_proprietario" : "usuario_id";
                em.createNativeQuery("DELETE FROM " + tabela + " WHERE " + coluna + " = :id")
                        .setParameter("id", alvo.getId()).executeUpdate();
            }
            em.createNativeQuery("DELETE FROM auditoria_exclusao_usuario WHERE administrador_id = :id")
                    .setParameter("id", admin.getId()).executeUpdate();
            usuarios.findById(alvo.getId()).ifPresent(usuarios::delete);
            usuarios.findById(admin.getId()).ifPresent(usuarios::delete);
        });
    }
    @Test void excluiSomenteCadastroSemVinculosEPreservaAuditoriaSemDadosDeAutenticacao() {
        assertTrue(service.podeExcluir(alvo, admin.getId(), service.usuariosComVinculos()));
        Instant inicio = Instant.now();
        service.excluir(alvo.getId(), admin.getId(), "  " + motivo + "  ");
        assertFalse(usuarios.existsById(alvo.getId()));
        var registro = auditoria.findAll().stream().filter(a -> a.getUsuarioId().equals(alvo.getId())).findFirst().orElseThrow();
        assertEquals(motivo, registro.getJustificativa());
        assertEquals(admin.getId(), registro.getAdministradorId());
        assertEquals("Cadastro sem uso", registro.getUsuarioNome());
        assertEquals("Administrador responsável", registro.getAdministradorNome());
        assertFalse(registro.getRealizadoEm().isBefore(inicio.minusMillis(1)));
        assertTrue(service.usuariosComVinculos().contains(admin.getId()));
        assertEquals(404, assertThrows(ResponseStatusException.class,
                () -> service.excluir(alvo.getId(), admin.getId(), motivo)).getStatusCode().value());
        assertEquals(1, auditoria.findAll().stream().filter(a -> a.getUsuarioId().equals(alvo.getId())).count());
    }
    @Test void revalidaVeiculoCriadoDepoisDaConsultaEPreservaCadastro() {
        assertTrue(service.podeExcluir(alvo, admin.getId(), service.usuariosComVinculos()));
        transacao(() -> {
            var v = new Veiculo(); v.setPlaca("TST1A23"); v.setFabricante("Teste"); v.setModelo("Teste");
            v.setCor("Azul"); v.setAnoModeloCombustivel("2026"); v.setIdProprietario(alvo.getId()); em.persist(v);
        });
        bloqueado();
    }
    @Test void sessaoExpiradaERevogadaTambemRepresentaHistorico() {
        transacao(() -> {
            var s = new AuthSession(); s.setUsuarioId(alvo.getId()); s.setTokenHash(UUID.randomUUID().toString());
            s.setExpiraEm(LocalDateTime.now().minusDays(1)); s.setRevogado(true); em.persist(s);
        });
        bloqueado();
    }
    @Test void tokenDeRecuperacaoJaUtilizadoImpedeExclusao() {
        transacao(() -> {
            var t = new PasswordResetToken(); t.setUsuarioId(alvo.getId()); t.setTokenHash(UUID.randomUUID().toString());
            t.setExpiraEm(LocalDateTime.now().minusDays(1)); t.setUsado(true); em.persist(t);
        });
        bloqueado();
    }
    @Test void auditoriaSemChaveEstrangeiraTambemImpedeExclusao() {
        transacao(() -> {
            var a = new AuditoriaResetMfa(); a.setUsuarioId(alvo.getId()); a.setUsuarioNome(alvo.getNome());
            a.setAdministradorId(admin.getId()); a.setAdministradorNome(admin.getNome());
            a.setJustificativa(motivo); a.setRealizadoEm(Instant.now()); em.persist(a);
        });
        bloqueado();
    }
    void bloqueado() {
        assertFalse(service.podeExcluir(alvo, admin.getId(), service.usuariosComVinculos()));
        var erro = assertThrows(ResponseStatusException.class, () -> service.excluir(alvo.getId(), admin.getId(), motivo));
        assertEquals(409, erro.getStatusCode().value());
        assertTrue(erro.getReason().contains("Inativar"));
        assertTrue(usuarios.existsById(alvo.getId()));
        assertTrue(auditoria.findAll().stream().noneMatch(a -> a.getUsuarioId().equals(alvo.getId())));
    }
    @Test void recusaMotivoInvalidoAutoexclusaoENaoAdministrador() {
        for (String texto : new String[]{null, "   ", "curto", "x".repeat(1001)}) {
            assertThrows(IllegalArgumentException.class, () -> service.excluir(alvo.getId(), admin.getId(), texto));
        }
        assertEquals(409, assertThrows(ResponseStatusException.class,
                () -> service.excluir(admin.getId(), admin.getId(), motivo)).getStatusCode().value());
        assertEquals(403, assertThrows(ResponseStatusException.class,
                () -> service.excluir(admin.getId(), alvo.getId(), motivo)).getStatusCode().value());
        alvo.setMfaAtivo(true); usuarios.saveAndFlush(alvo);
        assertEquals(409, assertThrows(ResponseStatusException.class,
                () -> service.excluir(alvo.getId(), admin.getId(), motivo)).getStatusCode().value());
        assertTrue(usuarios.existsById(alvo.getId()));
    }
    @Test void falhaAoGravarAuditoriaPreservaUsuario() {
        doThrow(new org.springframework.dao.DataIntegrityViolationException("Falha simulada de auditoria"))
                .when(auditoria).saveAndFlush(any(AuditoriaExclusaoUsuario.class));
        assertThrows(org.springframework.dao.DataIntegrityViolationException.class,
                () -> service.excluir(alvo.getId(), admin.getId(), motivo));
        assertTrue(usuarios.existsById(alvo.getId()));
        assertTrue(auditoria.findAll().stream().noneMatch(a -> a.getUsuarioId().equals(alvo.getId())));
    }

    @Test void vinculoInseridoAposRevalidacaoFazBancoRecusarExclusaoEReverterAuditoria() {
        // Simula outro produtor de vínculos entre a conferência e o DELETE.
        doAnswer(invocacao -> {
            AuditoriaExclusaoUsuario registro = invocacao.getArgument(0);
            em.persist(registro);
            em.createNativeQuery("INSERT INTO configuracao_sistema (id, estado_setup, administrador_inicial_id) "
                    + "VALUES (987654321, 'CONCLUIDO', :id)")
                    .setParameter("id", alvo.getId()).executeUpdate();
            em.flush(); return registro;
        }).when(auditoria).saveAndFlush(any(AuditoriaExclusaoUsuario.class));
        assertEquals(409, assertThrows(ResponseStatusException.class,
                () -> service.excluir(alvo.getId(), admin.getId(), motivo)).getStatusCode().value());
        assertTrue(usuarios.existsById(alvo.getId()));
        assertTrue(auditoria.findAll().stream().noneMatch(a -> a.getUsuarioId().equals(alvo.getId())));
        transacao(() -> assertNull(em.find(ConfiguracaoSistema.class, 987654321L)));
    }
}
