package com.clinicar.backend.config;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.util.function.Supplier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.web.csrf.*;

/** O filtro oficial CSRF complementa a autorização existente por sessão. */
@Configuration
@ConditionalOnProperty(name = "clinicar.security.csrf-enabled", havingValue = "true", matchIfMissing = true)
public class CsrfConfig {
    @Bean
    FilterRegistrationBean<CsrfFilter> csrfFilter(@Value("${clinicar.session.cookie-secure:false}") boolean secure) {
        var repository = CookieCsrfTokenRepository.withHttpOnlyFalse();
        repository.setCookieCustomizer(cookie -> cookie.path("/").sameSite("Lax").secure(secure));
        var filter = new CsrfFilter(repository);
        filter.setRequireCsrfProtectionMatcher(request -> !request.getRequestURI().equals("/api/webhooks/whatsapp")
                && CsrfFilter.DEFAULT_CSRF_MATCHER.matches(request));
        filter.setRequestHandler(new CsrfTokenRequestAttributeHandler() {
            @Override public void handle(HttpServletRequest request, HttpServletResponse response,
                                          Supplier<CsrfToken> token) {
                super.handle(request, response, token);
                token.get().getToken(); // Materializa o cookie também no primeiro GET da SPA.
            }
        });
        filter.setAccessDeniedHandler((request, response, error) -> {
            response.setStatus(403);
            response.setHeader("X-CliniCar-CSRF", "invalid");
            response.setContentType("application/json;charset=UTF-8");
            response.getWriter().write("{\"mensagem\":\"Verificação de segurança expirada. Atualize a página e tente novamente.\"}");
        });
        var registration = new FilterRegistrationBean<>(filter);
        registration.addUrlPatterns("/api/*");
        registration.setOrder(-100);
        return registration;
    }
}
