package com.clinicar.backend.config;
import com.clinicar.backend.dto.UsuarioResponse;
import com.clinicar.backend.service.SessionService;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.*;
import org.springframework.test.util.ReflectionTestUtils;
import jakarta.servlet.http.Cookie;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
class AuthSessionInterceptorTest {
    @Test void validarLinkRecuperacaoNaoExigeSessao() throws Exception {
        var sessions = mock(SessionService.class); var interceptor = new AuthSessionInterceptor(sessions);
        assertTrue(interceptor.preHandle(new MockHttpServletRequest("GET","/api/auth/redefinir-senha/validar"), new MockHttpServletResponse(), new Object()));
        verifyNoInteractions(sessions);
    }
    @Test void clienteNaoAcessaModulosAdministrativos() throws Exception {
        var sessions = mock(SessionService.class); var user = new UsuarioResponse(); user.setTipo_do_acesso("CLIENTE");
        when(sessions.validarSessao("teste")).thenReturn(Optional.of(user));
        var interceptor = new AuthSessionInterceptor(sessions); ReflectionTestUtils.setField(interceptor,"cookieName","SESSION");
        for (String path : new String[]{"/api/configuracao-alerta-manutencao","/api/regra-manutencao-preventiva","/api/peca","/api/atendimento","/api/previsao-manutencao","/api/veiculo/1/historico","/api/veiculo/1/historico/pdf"}) {
            var req = new MockHttpServletRequest("GET",path); req.setCookies(new Cookie("SESSION","teste"));
            var res = new MockHttpServletResponse(); assertFalse(interceptor.preHandle(req,res,new Object())); assertEquals(403,res.getStatus());
        }
    }
    @Test void administradorPodeAcessarConfiguracao() throws Exception {
        var sessions = mock(SessionService.class); var user = new UsuarioResponse(); user.setTipo_do_acesso("ADMINISTRADOR");
        when(sessions.validarSessao("teste")).thenReturn(Optional.of(user));
        var interceptor = new AuthSessionInterceptor(sessions); ReflectionTestUtils.setField(interceptor,"cookieName","SESSION");
        var req = new MockHttpServletRequest("GET","/api/configuracao-alerta-manutencao"); req.setCookies(new Cookie("SESSION","teste"));
        assertTrue(interceptor.preHandle(req,new MockHttpServletResponse(),new Object())); assertSame(user,req.getAttribute("usuarioLogado"));
    }
    @Test void semSessaoRetorna401() throws Exception {
        var sessions = mock(SessionService.class); var interceptor = new AuthSessionInterceptor(sessions);
        var res = new MockHttpServletResponse(); assertFalse(interceptor.preHandle(new MockHttpServletRequest("GET","/api/peca"),res,new Object())); assertEquals(401,res.getStatus());
    }
}
