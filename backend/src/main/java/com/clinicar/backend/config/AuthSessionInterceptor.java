package com.clinicar.backend.config;
import com.clinicar.backend.dto.UsuarioResponse;
import com.clinicar.backend.service.SessionService;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.util.Optional;

@Component
public class AuthSessionInterceptor implements HandlerInterceptor {

    private final SessionService sessionService;

    @Value("${clinicar.session.cookie-name}")
    private String cookieName;

    public AuthSessionInterceptor(SessionService sessionService) {
        this.sessionService = sessionService;
    }

    @Override
    public boolean preHandle(
            HttpServletRequest request,
            HttpServletResponse response,
            Object handler
    ) throws Exception {

        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
            return true;
        }

        String uri = request.getRequestURI();
        String metodo = request.getMethod();

        if (rotaPublica(uri, metodo)) {
            return true;
        }

        String token = extrairCookie(request);

        Optional<UsuarioResponse> usuarioOpt = sessionService.validarSessao(token);

        if (usuarioOpt.isEmpty()) {
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.setContentType("application/json;charset=UTF-8");
            response.getWriter().write("{\"mensagem\":\"Sessão inválida ou expirada.\"}");
            return false;
        }

        request.setAttribute("usuarioLogado", usuarioOpt.get());

        return true;
    }

    private boolean rotaPublica(String uri, String metodo) {
        // Primeiro acesso: a autorização é o estado transacional do setup/token.
        if ("GET".equalsIgnoreCase(metodo)
                && (uri.equals("/api/setup/status")
                    || uri.equals("/api/setup/ativacao/validar"))) {
            return true;
        }
        if ("POST".equalsIgnoreCase(metodo)
                && (uri.equals("/api/setup/administrador")
                    || uri.equals("/api/setup/ativacao/definir-senha")
                    || uri.equals("/api/setup/ativacao/reenviar"))) {
            return true;
        }

        /*
         * Login inicial: público.
         */
        if (uri.equals("/api/usuario/login") && "POST".equalsIgnoreCase(metodo)) {
            return true;
        }

        /*
         * Cadastro de usuário: público.
         * Se você quiser que apenas administrador cadastre usuário futuramente,
         * depois removemos essa exceção.
         */
        if (uri.equals("/api/usuario") && "POST".equalsIgnoreCase(metodo)) {
            return true;
        }

        /*
         * Validação MFA: público no sentido de ainda não ter cookie,
         * mas exige mfaToken temporário.
         */
        if (uri.equals("/api/auth/mfa/validar") && "POST".equalsIgnoreCase(metodo)) {
            return true;
        }

        /*
         * Recuperação de senha.
         */
        if (uri.equals("/api/auth/esqueci-senha") && "POST".equalsIgnoreCase(metodo)) {
            return true;
        }

        if (uri.equals("/api/auth/redefinir-senha") && "POST".equalsIgnoreCase(metodo)) {
            return true;
        }

        /*
         * Endpoints públicos opcionais.
         * Ajuste conforme seu projeto.
         */
        if (uri.startsWith("/error")) {
            return true;
        }

        return false;
    }

    private String extrairCookie(HttpServletRequest request) {
        Cookie[] cookies = request.getCookies();

        if (cookies == null) {
            return null;
        }

        for (Cookie cookie : cookies) {
            if (cookieName.equals(cookie.getName())) {
                return cookie.getValue();
            }
        }

        return null;
    }
}
