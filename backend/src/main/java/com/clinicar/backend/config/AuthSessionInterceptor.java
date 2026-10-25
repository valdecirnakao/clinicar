package com.clinicar.backend.config;
import com.clinicar.backend.dto.UsuarioResponse;
import com.clinicar.backend.service.SessionService;
import com.clinicar.backend.service.PermissaoColaboradorService;
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
    private final PermissaoColaboradorService permissoes;

    @Value("${clinicar.session.cookie-name}")
    private String cookieName;

    @org.springframework.beans.factory.annotation.Autowired
    public AuthSessionInterceptor(SessionService sessionService, PermissaoColaboradorService permissoes) {
        this.sessionService = sessionService;
        this.permissoes = permissoes;
    }

    /** Mantém a construção direta usada pelos testes legados. */
    public AuthSessionInterceptor(SessionService sessionService) { this(sessionService, null); }

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
            // O cadastro público continua disponível; uma sessão existente identifica o autor administrativo.
            if(uri.equals("/api/usuario") && "POST".equals(metodo)) {
                sessionService.validarSessao(extrairCookie(request)).ifPresent(usuario->request.setAttribute("usuarioLogado",usuario));
            }
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

        // O painel consulta apenas o trabalho atribuído ao colaborador autenticado.
        // O controller usa o ID da sessão como escopo.
        boolean consultaProprioTrabalho = "GET".equalsIgnoreCase(metodo)
                && (uri.matches("/api/colaborador/meu-trabalho/(agendamentos|atendimentos|alertas-estoque|pendencias)")
                    || uri.equals("/api/colaborador/permissoes/minhas"))
                && "COLABORADOR".equalsIgnoreCase(usuarioOpt.get().getTipo_do_acesso());
        boolean portalCliente = (uri.equals("/api/cliente/portal") || uri.startsWith("/api/cliente/portal/")
                || uri.equals("/api/cliente/agendamentos") || uri.startsWith("/api/cliente/agendamentos/")
                || uri.equals("/api/cliente/veiculos/edicao")
                || ("POST".equalsIgnoreCase(metodo) && uri.matches("/api/cliente/veiculos/\\d+/correcoes")))
                && "CLIENTE".equalsIgnoreCase(usuarioOpt.get().getTipo_do_acesso());
        boolean historicoDoCliente = "GET".equalsIgnoreCase(metodo)
                && uri.matches("/api/veiculo/\\d+/historico(?:/pdf)?")
                && "CLIENTE".equalsIgnoreCase(usuarioOpt.get().getTipo_do_acesso());
        boolean trabalhoTecnico = uri.matches("/api/colaborador/meus-atendimentos/\\d+(?:/relato|/checklist|/fotos(?:/\\d+)?|/diagnosticar|/solicitar-aprovacao|/iniciar|/concluir|/pausar|/retomar|/pausas)?")
                && "COLABORADOR".equalsIgnoreCase(usuarioOpt.get().getTipo_do_acesso())
                && podeMecanica(usuarioOpt.get().getId());

        // Auth e usuário possuem regras próprias; os demais módulos seguem a lista
        // de operações explicitamente autorizadas para o colaborador.
        if (!(uri.startsWith("/api/auth/") || uri.equals("/api/usuario") || uri.startsWith("/api/usuario/")
                || consultaProprioTrabalho || portalCliente || historicoDoCliente || trabalhoTecnico
                || acessoOperacionalColaborador(uri, metodo, usuarioOpt.get()))
                && !"ADMINISTRADOR".equalsIgnoreCase(usuarioOpt.get().getTipo_do_acesso())) {
            response.setStatus(HttpServletResponse.SC_FORBIDDEN);
            response.setContentType("application/json;charset=UTF-8");
            response.getWriter().write("{\"mensagem\":\"Acesso exclusivo do administrador.\"}");
            return false;
        }
        request.setAttribute("usuarioLogado", usuarioOpt.get());

        return true;
    }

    private boolean acessoOperacionalColaborador(String uri, String metodo, UsuarioResponse usuario) {
        if (!"COLABORADOR".equalsIgnoreCase(usuario.getTipo_do_acesso())) return false;
        if (uri.equals("/api/veiculo") || uri.startsWith("/api/veiculo/")) return true;
        if (uri.equals("/api/agendamento") || uri.startsWith("/api/agendamento/")) return true;
        if (uri.equals("/api/atendimento") || uri.startsWith("/api/atendimento/")) {
            if (java.util.Set.of("GET", "POST").contains(metodo)) return true;
            if ("PATCH".equalsIgnoreCase(metodo)
                    && uri.matches("/api/atendimento/\\d+/(aprovar|entregar|cancelar)")) return true;
            return podeMecanica(usuario.getId());
        }
        if (uri.equals("/api/estoque-pecas") || uri.startsWith("/api/estoque-pecas/")) {
            return !uri.matches("/api/estoque-pecas/\\d+/ajuste")
                    && ("GET".equalsIgnoreCase(metodo) || podeEstoque(usuario.getId()));
        }
        if (uri.equals("/api/local-estoque") || uri.startsWith("/api/local-estoque/")) return true;
        if (uri.equals("/api/alertas-estoque") || uri.startsWith("/api/alertas-estoque/")) return true;
        if (uri.equals("/api/configuracao-alerta-manutencao")
                || uri.equals("/api/configuracao-alerta-manutencao/clientes")
                || uri.equals("/api/configuracao-alerta-manutencao/historico")) {
            return java.util.Set.of("GET", "PUT").contains(metodo);
        }
        if (uri.matches("/api/configuracao-alerta-manutencao/historico/\\d+/conciliar")) {
            return "POST".equalsIgnoreCase(metodo);
        }
        if ("GET".equalsIgnoreCase(metodo)) {
            return uri.equals("/api/peca") || uri.startsWith("/api/peca/")
                    || uri.equals("/api/servico") || uri.startsWith("/api/servico/")
                    || uri.equals("/api/fornecedor") || uri.startsWith("/api/fornecedor/")
                    || uri.equals("/api/fornecimento-pecas") || uri.startsWith("/api/fornecimento-pecas/");
        }
        return false;
    }

    private boolean podeMecanica(Long id) { return permissoes == null || permissoes.podeMecanica(id); }
    private boolean podeEstoque(Long id) { return permissoes == null || permissoes.podeEstoque(id); }

    private boolean rotaPublica(String uri, String metodo) {
        if (uri.equals("/api/webhooks/whatsapp") && java.util.Set.of("GET", "POST").contains(metodo)) return true;
        if ("GET".equalsIgnoreCase(metodo) && uri.equals("/api/infra/health")) return true;
        if ("GET".equalsIgnoreCase(metodo) && uri.equals("/api/auth/csrf")) return true;
        if ("GET".equalsIgnoreCase(metodo) && uri.equals("/api/auth/redefinir-senha/validar")) return true;
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
