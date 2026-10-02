package com.clinicar.backend;

import com.clinicar.backend.model.*;
import com.clinicar.backend.repository.*;
import com.clinicar.backend.service.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import java.time.*;
import java.util.UUID;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@SpringBootTest
@ActiveProfiles("test")
class MfaResetAuditoriaIntegrationTest {
    @Autowired MfaService service;
    @Autowired UsuarioRepository usuarios;
    @Autowired MfaChallengeRepository challenges;
    @Autowired PlatformTransactionManager manager;
    @MockitoSpyBean AuditoriaResetMfaRepository auditoria;
    @MockitoBean WhatsAppService whatsapp;
    Usuario admin, alvo;
    MfaChallenge challenge;

    @BeforeEach void preparar() {
        new TransactionTemplate(manager).executeWithoutResult(tx -> {
            admin = usuario("Administrador responsável", "ADMINISTRADOR", false);
            alvo = usuario("Usuário afetado", "CLIENTE", true);
            challenge = new MfaChallenge();
            challenge.setUsuarioId(alvo.getId());
            challenge.setTokenHash(UUID.randomUUID().toString());
            challenge.setTipo("LOGIN");
            challenge.setExpiraEm(LocalDateTime.now().plusMinutes(5));
            challenges.saveAndFlush(challenge);
        });
    }
    Usuario usuario(String nome, String perfil, boolean mfa) {
        Usuario u = new Usuario(); u.setNome(nome); u.setEmail(UUID.randomUUID() + "@example.com");
        u.setStatus("ATIVO"); u.setTipo_do_acesso(perfil); u.setMfaAtivo(mfa);
        if (mfa) { u.setMfaSecret("segredo-ficticio-de-teste"); u.setMfaTipo("TOTP"); }
        return usuarios.saveAndFlush(u);
    }
    @AfterEach void limpar() {
        reset(auditoria);
        new TransactionTemplate(manager).executeWithoutResult(tx -> {
            auditoria.findAll().stream().filter(a -> a.getUsuarioId().equals(alvo.getId())).forEach(auditoria::delete);
            challenges.deleteById(challenge.getId());
            usuarios.deleteById(alvo.getId()); usuarios.deleteById(admin.getId());
        });
    }

    @Test void gravaResponsavelMotivoDataEInvalidaChallengeEmCommit() {
        Instant inicio = Instant.now();
        service.resetarMfaUsuario(alvo.getId(), admin.getId(), "  Perda do dispositivo autenticador.  ");
        Usuario atualizado = usuarios.findById(alvo.getId()).orElseThrow();
        assertFalse(atualizado.getMfaAtivo()); assertNull(atualizado.getMfaSecret()); assertNull(atualizado.getMfaTipo());
        assertTrue(challenges.findById(challenge.getId()).orElseThrow().getUsado());
        var registros = auditoria.findAll().stream().filter(a -> a.getUsuarioId().equals(alvo.getId())).toList();
        assertEquals(1, registros.size());
        var registro = registros.getFirst();
        assertEquals(admin.getId(), registro.getAdministradorId());
        assertEquals("Administrador responsável", registro.getAdministradorNome());
        assertEquals("Usuário afetado", registro.getUsuarioNome());
        assertEquals("Perda do dispositivo autenticador.", registro.getJustificativa());
        assertFalse(registro.getRealizadoEm().isBefore(inicio.minusMillis(1)));
        verify(whatsapp).enviarAlertaRedefinicao2fa(alvo.getTelefone(), "Usuário afetado");
        assertThrows(IllegalArgumentException.class,
                () -> service.resetarMfaUsuario(alvo.getId(), admin.getId(), "Tentativa repetida de reset."));
        assertEquals(1, auditoria.findAll().stream().filter(a -> a.getUsuarioId().equals(alvo.getId())).count());
    }

    @Test void rejeitaJustificativaAusenteEAtorSemPerfilSemAlterarMfa() {
        for (String motivo : new String[]{null, "   ", "curto", "x".repeat(1001)}) {
            assertThrows(IllegalArgumentException.class,
                    () -> service.resetarMfaUsuario(alvo.getId(), admin.getId(), motivo));
        }
        assertThrows(IllegalArgumentException.class,
                () -> service.resetarMfaUsuario(alvo.getId(), alvo.getId(), "Perda do dispositivo."));
        assertTrue(usuarios.findById(alvo.getId()).orElseThrow().getMfaAtivo());
        assertFalse(challenges.findById(challenge.getId()).orElseThrow().getUsado());
        assertTrue(auditoria.findAll().stream().noneMatch(a -> a.getUsuarioId().equals(alvo.getId())));
        verifyNoInteractions(whatsapp);
    }

    @Test void falhaNaGravacaoDaAuditoriaPreservaMfaEChallenges() {
        doThrow(new org.springframework.dao.DataIntegrityViolationException("Falha simulada de auditoria"))
                .when(auditoria).saveAndFlush(any(AuditoriaResetMfa.class));
        assertThrows(org.springframework.dao.DataIntegrityViolationException.class,
                () -> service.resetarMfaUsuario(alvo.getId(), admin.getId(), "Perda do dispositivo autenticador."));
        assertTrue(usuarios.findById(alvo.getId()).orElseThrow().getMfaAtivo());
        assertEquals("segredo-ficticio-de-teste", usuarios.findById(alvo.getId()).orElseThrow().getMfaSecret());
        assertFalse(challenges.findById(challenge.getId()).orElseThrow().getUsado());
        verifyNoInteractions(whatsapp);
    }
}
