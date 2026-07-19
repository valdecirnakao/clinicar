package com.clinicar.backend.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.clinicar.backend.dto.UsuarioResponse;
import com.clinicar.backend.mapper.UsuarioMapper;
import com.clinicar.backend.model.AuthSession;
import com.clinicar.backend.model.Usuario;
import com.clinicar.backend.repository.AuthSessionRepository;
import com.clinicar.backend.repository.UsuarioRepository;
import java.time.LocalDateTime;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseCookie;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class SessionServiceTest {

    @Mock
    private AuthSessionRepository authSessionRepository;

    @Mock
    private UsuarioRepository usuarioRepository;

    @Mock
    private UsuarioMapper usuarioMapper;

    @InjectMocks
    private SessionService service;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(service, "cookieName", "clinicar_session");
        ReflectionTestUtils.setField(service, "expirationHours", 6L);
        ReflectionTestUtils.setField(service, "cookieSecure", true);
        ReflectionTestUtils.setField(service, "cookieSameSite", "Lax");
    }

    @Test
    void criarSessaoCookieLancaErroQuandoUsuarioIdNulo() {
        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class,
                () -> service.criarSessaoCookie(null)
        );

        assertEquals("ID do usuário inválido para criação de sessão.", ex.getMessage());
    }

    @Test
    void criarSessaoCookiePersisteSessaoERetornaCookieConfigurado() {
        when(authSessionRepository.save(any(AuthSession.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        ResponseCookie cookie = service.criarSessaoCookie(42L);

        ArgumentCaptor<AuthSession> captor = ArgumentCaptor.forClass(AuthSession.class);
        verify(authSessionRepository).save(captor.capture());

        AuthSession session = captor.getValue();
        assertEquals(42L, session.getUsuarioId());
        assertFalse(session.getRevogado());
        assertNotNull(session.getTokenHash());
        assertNotNull(session.getCriadoEm());
        assertNotNull(session.getUltimoUsoEm());
        assertNotNull(session.getExpiraEm());
        assertTrue(session.getExpiraEm().isAfter(session.getCriadoEm()));

        assertEquals("clinicar_session", cookie.getName());
        assertFalse(cookie.getValue().isBlank());
        assertTrue(cookie.isHttpOnly());
        assertTrue(cookie.isSecure());
        assertEquals("/", cookie.getPath());
        assertEquals(6 * 3600, cookie.getMaxAge().getSeconds());
        assertTrue(cookie.toString().contains("SameSite=Lax"));
    }

    @Test
    void limparCookieRetornaCookieExpirado() {
        ResponseCookie cookie = service.limparCookie();

        assertEquals("clinicar_session", cookie.getName());
        assertEquals("", cookie.getValue());
        assertTrue(cookie.isHttpOnly());
        assertTrue(cookie.isSecure());
        assertEquals("/", cookie.getPath());
        assertEquals(0, cookie.getMaxAge().getSeconds());
        assertTrue(cookie.toString().contains("SameSite=Lax"));
    }

    @Test
    void validarSessaoRetornaVazioQuandoTokenNuloOuEmBranco() {
        assertTrue(service.validarSessao(null).isEmpty());
        assertTrue(service.validarSessao(" ").isEmpty());
        verifyNoInteractions(authSessionRepository, usuarioRepository, usuarioMapper);
    }

    @Test
    void validarSessaoRetornaVazioQuandoSessaoNaoEncontrada() {
        when(authSessionRepository.findByTokenHashAndRevogadoFalse(anyString()))
                .thenReturn(Optional.empty());

        Optional<UsuarioResponse> resultado = service.validarSessao("token");

        assertTrue(resultado.isEmpty());
        verify(authSessionRepository).findByTokenHashAndRevogadoFalse(anyString());
        verifyNoInteractions(usuarioRepository, usuarioMapper);
    }

    @Test
    void validarSessaoRevogaQuandoExpirada() {
        AuthSession session = new AuthSession();
        session.setUsuarioId(10L);
        session.setRevogado(false);
        session.setExpiraEm(LocalDateTime.now().minusMinutes(1));

        when(authSessionRepository.findByTokenHashAndRevogadoFalse(anyString()))
                .thenReturn(Optional.of(session));

        Optional<UsuarioResponse> resultado = service.validarSessao("token");

        assertTrue(resultado.isEmpty());
        assertTrue(session.getRevogado());
        verify(authSessionRepository).save(session);
        verifyNoInteractions(usuarioRepository, usuarioMapper);
    }

    @Test
    void validarSessaoRevogaQuandoUsuarioNaoExiste() {
        AuthSession session = new AuthSession();
        session.setUsuarioId(99L);
        session.setRevogado(false);
        session.setExpiraEm(LocalDateTime.now().plusMinutes(10));

        when(authSessionRepository.findByTokenHashAndRevogadoFalse(anyString()))
                .thenReturn(Optional.of(session));
        when(usuarioRepository.findById(99L)).thenReturn(Optional.empty());

        Optional<UsuarioResponse> resultado = service.validarSessao("token");

        assertTrue(resultado.isEmpty());
        assertTrue(session.getRevogado());
        verify(authSessionRepository).save(session);
    }

    @Test
    void validarSessaoRetornaUsuarioQuandoSessaoValida() {
        AuthSession session = new AuthSession();
        session.setUsuarioId(7L);
        session.setExpiraEm(LocalDateTime.now().plusHours(1));
        session.setRevogado(false);

        Usuario usuario = new Usuario();
        usuario.setId(7L);
        usuario.setNome("Maria");

        UsuarioResponse response = new UsuarioResponse();
        response.setId(7L);
        response.setNome("Maria");

        when(authSessionRepository.findByTokenHashAndRevogadoFalse(anyString()))
                .thenReturn(Optional.of(session));
        when(usuarioRepository.findById(7L)).thenReturn(Optional.of(usuario));
        when(usuarioMapper.toResponse(usuario)).thenReturn(response);

        Optional<UsuarioResponse> resultado = service.validarSessao("token");

        assertTrue(resultado.isPresent());
        assertEquals(7L, resultado.get().getId());
        assertEquals("Maria", resultado.get().getNome());
        assertNotNull(session.getUltimoUsoEm());
        verify(authSessionRepository).save(session);
    }

    @Test
    void revogarSessaoIgnoraTokenNuloOuEmBranco() {
        service.revogarSessao(null);
        service.revogarSessao(" ");

        verifyNoInteractions(authSessionRepository);
    }

    @Test
    void revogarSessaoMarcaSessaoComoRevogadaQuandoEncontrada() {
        AuthSession session = new AuthSession();
        session.setRevogado(false);

        when(authSessionRepository.findByTokenHashAndRevogadoFalse(anyString()))
                .thenReturn(Optional.of(session));

        service.revogarSessao("token");

        assertTrue(session.getRevogado());
        verify(authSessionRepository).save(session);
    }

    @Test
    void revogarSessaoNaoSalvaQuandoSessaoNaoEncontrada() {
        when(authSessionRepository.findByTokenHashAndRevogadoFalse(anyString()))
                .thenReturn(Optional.empty());

        service.revogarSessao("token");

        verify(authSessionRepository, never()).save(any(AuthSession.class));
    }
}
