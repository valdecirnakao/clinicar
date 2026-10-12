package com.clinicar.backend.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.*;
import java.io.IOException;
import java.time.Clock;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/** Janela curta, memória limitada; o proxy aplica também limites por IP real. */
@Component
@Order(-90)
@ConditionalOnProperty(name = "clinicar.security.rate-limit-enabled", havingValue = "true", matchIfMissing = true)
public class AuthRateLimitFilter extends OncePerRequestFilter {
    private record Janela(long inicio, int quantidade) { }
    private final ConcurrentHashMap<String, Janela> janelas = new ConcurrentHashMap<>();
    private final Clock clock;
    @org.springframework.beans.factory.annotation.Value("${clinicar.security.trusted-proxy-name:}")
    private String trustedProxyName="";
    private volatile java.util.Set<String> trustedAddresses=java.util.Set.of();
    private volatile long resolvedUntil;
    public AuthRateLimitFilter() { this(Clock.systemUTC()); }
    AuthRateLimitFilter(Clock clock) { this.clock = clock; }

    @Override protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                               FilterChain chain) throws ServletException, IOException {
        String rota = request.getRequestURI();
        int limite = rota.equals("/api/auth/esqueci-senha") || rota.equals("/api/setup/ativacao/reenviar") ? 10 : 60;
        boolean publica = rota.equals("/api/usuario/login") || rota.equals("/api/auth/esqueci-senha")
                || rota.equals("/api/setup/ativacao/reenviar") || rota.equals("/api/auth/mfa/validar")
                || rota.equals("/api/usuario");
        if ("POST".equals(request.getMethod()) && publica && !permitir(rota + ":" + enderecoCliente(request), limite)) {
            response.setStatus(429);
            response.setHeader("Retry-After", "60");
            response.setContentType("application/json;charset=UTF-8");
            response.getWriter().write("{\"mensagem\":\"Muitas tentativas. Aguarde um minuto e tente novamente.\"}");
            return;
        }
        chain.doFilter(request, response);
    }

    String enderecoCliente(HttpServletRequest request) {
        String remote=request.getRemoteAddr();
        // Cabeçalhos enviados diretamente pelo cliente nunca definem sua identidade.
        if(trustedProxyName.isBlank())return remote;
        long now=clock.millis();
        if(now>=resolvedUntil) {
            synchronized(this) {
                if(now>=resolvedUntil) {
                    try {trustedAddresses=java.util.Arrays.stream(java.net.InetAddress.getAllByName(trustedProxyName)).map(java.net.InetAddress::getHostAddress).collect(java.util.stream.Collectors.toUnmodifiableSet());}
                    catch(java.net.UnknownHostException unavailable){trustedAddresses=java.util.Set.of();}
                    resolvedUntil=now+60_000;
                }
            }
        }
        String real=request.getHeader("X-Real-IP");
        if(!trustedAddresses.contains(remote)||real==null||!real.matches("[0-9a-fA-F:.]{3,45}"))return remote;
        try {return java.net.InetAddress.getByName(real).getHostAddress();}
        catch(java.net.UnknownHostException invalid){return remote;}
    }

    boolean permitir(String chave, int limite) {
        long agora = clock.millis();
        if (janelas.size() >= 10_000) {
            janelas.entrySet().removeIf(entry -> agora - entry.getValue().inicio >= 60_000);
            if (!janelas.containsKey(chave) && janelas.size() >= 10_000) return false;
        }
        var janela = janelas.compute(chave, (key, antiga) -> antiga == null || agora - antiga.inicio >= 60_000
                ? new Janela(agora, 1) : new Janela(antiga.inicio, Math.min(antiga.quantidade + 1, limite + 1)));
        return janela.quantidade <= limite;
    }
}
