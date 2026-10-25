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
    @Test void auditoriaProtegidaParaTodosOsEndpoints() throws Exception {
        var sessions=mock(SessionService.class); var user=new UsuarioResponse();
        var interceptor=new AuthSessionInterceptor(sessions);ReflectionTestUtils.setField(interceptor,"cookieName","SESSION");
        when(sessions.validarSessao("teste")).thenReturn(Optional.of(user));
        for(String perfil:new String[]{"CLIENTE","COLABORADOR"}) {
            user.setTipo_do_acesso(perfil);
            for(String path:new String[]{"/api/auditoria","/api/auditoria/exportar","/api/auditoria/RESET_2FA/1"}) {
                var req=new MockHttpServletRequest("GET",path);req.setCookies(new Cookie("SESSION","teste"));
                var res=new MockHttpServletResponse();assertFalse(interceptor.preHandle(req,res,new Object()));assertEquals(403,res.getStatus());
            }
        }
    }
    @Test void validarLinkRecuperacaoNaoExigeSessao() throws Exception {
        var sessions = mock(SessionService.class); var interceptor = new AuthSessionInterceptor(sessions);
        assertTrue(interceptor.preHandle(new MockHttpServletRequest("GET","/api/auth/redefinir-senha/validar"), new MockHttpServletResponse(), new Object()));
        verifyNoInteractions(sessions);
    }
    @Test void clienteNaoAcessaModulosAdministrativos() throws Exception {
        var sessions = mock(SessionService.class); var user = new UsuarioResponse(); user.setTipo_do_acesso("CLIENTE");
        when(sessions.validarSessao("teste")).thenReturn(Optional.of(user));
        var interceptor = new AuthSessionInterceptor(sessions); ReflectionTestUtils.setField(interceptor,"cookieName","SESSION");
        for (String path : new String[]{"/api/configuracao-alerta-manutencao","/api/regra-manutencao-preventiva","/api/peca","/api/atendimento","/api/previsao-manutencao","/api/veiculo/1", "/api/veiculo/1/historico/alterar"}) {
            var req = new MockHttpServletRequest("GET",path); req.setCookies(new Cookie("SESSION","teste"));
            var res = new MockHttpServletResponse(); assertFalse(interceptor.preHandle(req,res,new Object())); assertEquals(403,res.getStatus());
        }
    }
    @Test void clientePodeSomenteConsultarEExportarHistorico() throws Exception {
        var sessions = mock(SessionService.class); var user = new UsuarioResponse(); user.setTipo_do_acesso("CLIENTE");
        when(sessions.validarSessao("teste")).thenReturn(Optional.of(user));
        var interceptor = new AuthSessionInterceptor(sessions); ReflectionTestUtils.setField(interceptor,"cookieName","SESSION");
        for (String path : new String[]{"/api/veiculo/1/historico", "/api/veiculo/1/historico/pdf"}) {
            var req = new MockHttpServletRequest("GET", path); req.setCookies(new Cookie("SESSION","teste"));
            assertTrue(interceptor.preHandle(req, new MockHttpServletResponse(), new Object()));
            var escrita = new MockHttpServletRequest("POST", path); escrita.setCookies(new Cookie("SESSION","teste"));
            var res = new MockHttpServletResponse(); assertFalse(interceptor.preHandle(escrita, res, new Object())); assertEquals(403, res.getStatus());
        }
    }
    @Test void clienteUsaSomenteRotaPropriaDeAgendamentos() throws Exception {
        var sessions = mock(SessionService.class); var user = new UsuarioResponse(); user.setTipo_do_acesso("CLIENTE");
        when(sessions.validarSessao("teste")).thenReturn(Optional.of(user));
        var interceptor = new AuthSessionInterceptor(sessions); ReflectionTestUtils.setField(interceptor, "cookieName", "SESSION");
        for (String[] caso : new String[][] {{"GET", "/api/cliente/agendamentos"},
                {"GET", "/api/cliente/agendamentos/catalogos"}, {"POST", "/api/cliente/agendamentos"},
                {"PUT", "/api/cliente/agendamentos/7"}}) {
            var req = new MockHttpServletRequest(caso[0], caso[1]); req.setCookies(new Cookie("SESSION", "teste"));
            assertTrue(interceptor.preHandle(req, new MockHttpServletResponse(), new Object()), caso[1]);
        }
        var req = new MockHttpServletRequest("POST", "/api/agendamento"); req.setCookies(new Cookie("SESSION", "teste"));
        var res = new MockHttpServletResponse(); assertFalse(interceptor.preHandle(req, res, new Object())); assertEquals(403, res.getStatus());
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

    @Test void colaboradorAcessaOperacaoPermitidaSemGanharAcessoAdministrativo() throws Exception {
        var sessions = mock(SessionService.class); var user = new UsuarioResponse(); user.setTipo_do_acesso("COLABORADOR");
        when(sessions.validarSessao("teste")).thenReturn(Optional.of(user));
        var interceptor = new AuthSessionInterceptor(sessions); ReflectionTestUtils.setField(interceptor,"cookieName","SESSION");
        for (String[] caso : new String[][] {
                {"GET", "/api/colaborador/meu-trabalho/pendencias"},
                {"GET", "/api/estoque-pecas/12/movimentacoes/pagina"},
                {"POST", "/api/estoque-pecas/12/entrada"},
                {"PUT", "/api/atendimento/3"},
                {"GET", "/api/veiculo/3/historico"},
                {"PUT", "/api/configuracao-alerta-manutencao"},
                {"POST", "/api/configuracao-alerta-manutencao/historico/3/conciliar"}
        }) {
            var req = new MockHttpServletRequest(caso[0], caso[1]); req.setCookies(new Cookie("SESSION", "teste"));
            assertTrue(interceptor.preHandle(req, new MockHttpServletResponse(), new Object()), caso[1]);
        }
        for (String[] caso : new String[][] {
                {"POST", "/api/estoque-pecas/12/ajuste"},
                {"PUT", "/api/configuracao-alerta-estoque"},
                {"GET", "/api/auditoria"},
                {"POST", "/api/peca"},
                {"GET", "/api/regra-manutencao-preventiva"}
        }) {
            var req = new MockHttpServletRequest(caso[0], caso[1]); req.setCookies(new Cookie("SESSION", "teste"));
            var res = new MockHttpServletResponse();
            assertFalse(interceptor.preHandle(req, res, new Object()), caso[1]);
            assertEquals(403, res.getStatus(), caso[1]);
        }
    }
}
