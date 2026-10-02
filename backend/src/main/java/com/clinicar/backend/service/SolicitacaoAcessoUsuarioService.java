package com.clinicar.backend.service;

import com.clinicar.backend.dto.*;
import com.clinicar.backend.model.*;
import com.clinicar.backend.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.time.Instant;
import java.util.Locale;
import java.util.Set;

@Service @RequiredArgsConstructor
public class SolicitacaoAcessoUsuarioService {
    private final UsuarioRepository usuarios;
    private final SolicitacaoAcessoUsuarioRepository solicitacoes;
    private final ProtecaoAdministrativaService protecao;
    private final UsuarioService usuarioService;
    private final PeriodoAcessoUsuarioService periodos;

    @Transactional
    public SolicitacaoAcessoResponse criar(Long usuarioId, SolicitacaoAcessoRequest pedido) {
        var usuario = usuarios.buscarParaAtualizacao(usuarioId).orElseThrow(() -> erro(HttpStatus.UNAUTHORIZED, "Sessão inválida."));
        validarSolicitante(usuario);
        String tipo = normalizar(pedido == null ? null : pedido.tipo());
        if (!Set.of("INATIVACAO", "ENCERRAMENTO", "TEMPORARIA").contains(tipo)) throw new IllegalArgumentException("Selecione o tipo de solicitação.");
        validarPeriodo(usuario, pedido, tipo);
        if (solicitacoes.existsByUsuarioIdAndSituacaoPeriodoIn(usuarioId, java.util.List.of("AGENDADA", "EM_CURSO")))
            throw erro(HttpStatus.CONFLICT, "Já existe uma suspensão temporária aprovada. Entre em contato com o administrador.");
        String motivo = justificativa(pedido == null ? null : pedido.justificativa());
        if (solicitacoes.existsByPendenciaUsuarioId(usuarioId)) {
            throw erro(HttpStatus.CONFLICT, "Você já possui uma solicitação pendente. Aguarde a análise do administrador.");
        }
        var s = new SolicitacaoAcessoUsuario();
        s.setUsuarioId(usuarioId); s.setUsuarioNome(usuario.getNome()); s.setUsuarioEmail(usuario.getEmail());
        s.setUsuarioPerfil(usuario.getTipo_do_acesso()); s.setTipo(tipo); s.setJustificativa(motivo);
        if (tipo.equals("TEMPORARIA")) { s.setInicioPeriodo(pedido.inicioPeriodo()); s.setFimPeriodo(pedido.fimPeriodo()); }
        s.setStatus("PENDENTE"); s.setPendenciaUsuarioId(usuarioId); s.setSolicitadoEm(Instant.now());
        return SolicitacaoAcessoResponse.de(solicitacoes.saveAndFlush(s));
    }

    @Transactional(readOnly = true)
    public PaginaSolicitacoesAcesso minhas(Long usuarioId, int pagina, int tamanho) {
        validarSolicitante(usuarios.findById(usuarioId).orElseThrow(() -> erro(HttpStatus.UNAUTHORIZED, "Sessão inválida.")));
        return resposta(solicitacoes.findByUsuarioId(usuarioId, paginacao(pagina, tamanho)),
                solicitacoes.countByUsuarioIdAndStatus(usuarioId, "PENDENTE"));
    }

    @Transactional(readOnly = true)
    public PaginaSolicitacoesAcesso listar(Long administradorId, String status, int pagina, int tamanho) {
        var admin = usuarios.findById(administradorId).orElseThrow(() -> erro(HttpStatus.UNAUTHORIZED, "Sessão inválida."));
        if (!"ATIVO".equalsIgnoreCase(admin.getStatus()) || !"ADMINISTRADOR".equalsIgnoreCase(admin.getTipo_do_acesso())) {
            throw erro(HttpStatus.FORBIDDEN, "Acesso exclusivo do administrador.");
        }
        String filtro = normalizar(status);
        if (!Set.of("TODAS", "PENDENTE", "APROVADA", "RECUSADA").contains(filtro)) throw new IllegalArgumentException("Status de solicitação inválido.");
        var pageable = paginacao(pagina, tamanho);
        return resposta(filtro.equals("TODAS") ? solicitacoes.findAll(pageable) : solicitacoes.findByStatus(filtro, pageable),
                solicitacoes.countByStatus("PENDENTE"));
    }

    @Transactional
    public SolicitacaoAcessoResponse decidir(Long id, Long administradorId, DecisaoSolicitacaoAcessoRequest pedido) {
        String decisao = normalizar(pedido == null ? null : pedido.decisao());
        if (!Set.of("APROVAR", "RECUSAR").contains(decisao)) throw new IllegalArgumentException("Selecione Aprovar ou Recusar.");
        String motivo = justificativa(pedido == null ? null : pedido.justificativa());
        var administradores = protecao.bloquearEValidarAdministrador(administradorId);
        var usuarioId = solicitacoes.buscarUsuarioId(id).orElseThrow(() -> erro(HttpStatus.NOT_FOUND, "Solicitação não encontrada."));
        var usuario = usuarios.buscarParaAtualizacao(usuarioId)
                .orElseThrow(() -> erro(HttpStatus.CONFLICT, "O cadastro do solicitante não está disponível."));
        var s = solicitacoes.buscarParaDecisao(id).orElseThrow(() -> erro(HttpStatus.NOT_FOUND, "Solicitação não encontrada."));
        if (!"PENDENTE".equals(s.getStatus())) throw erro(HttpStatus.CONFLICT, "Esta solicitação já foi analisada. Atualize a lista.");
        if (usuario.getId().equals(administradorId)) throw erro(HttpStatus.CONFLICT, "Você não pode analisar sua própria solicitação.");
        if (decisao.equals("APROVAR")) {
            if (!Set.of("CLIENTE", "COLABORADOR").contains(normalizar(usuario.getTipo_do_acesso()))) {
                throw erro(HttpStatus.CONFLICT, "O perfil do solicitante foi alterado. Recuse a solicitação e utilize a gestão de usuários.");
            }
            if ("TEMPORARIA".equals(s.getTipo())) {
                validarPeriodo(usuario, new SolicitacaoAcessoRequest(s.getTipo(), s.getJustificativa(), s.getInicioPeriodo(), s.getFimPeriodo()), s.getTipo());
                if (!"ATIVO".equalsIgnoreCase(usuario.getStatus())) throw erro(HttpStatus.CONFLICT, "O colaborador já está inativo. Recuse a solicitação e utilize a gestão de usuários.");
                s.setSituacaoPeriodo("AGENDADA");
            } else usuarioService.inativarPorAdministrador(usuario.getId(), administradorId);
        }
        var admin = administradores.stream().filter(u -> u.getId().equals(administradorId)).findFirst().orElseThrow();
        s.setStatus(decisao.equals("APROVAR") ? "APROVADA" : "RECUSADA"); s.setPendenciaUsuarioId(null);
        s.setAdministradorId(administradorId); s.setAdministradorNome(admin.getNome());
        s.setMotivoDecisao(motivo); s.setDecididoEm(Instant.now());
        solicitacoes.saveAndFlush(s);
        if ("AGENDADA".equals(s.getSituacaoPeriodo())) periodos.processar(s.getId(), java.time.LocalDate.now(PeriodoAcessoUsuarioService.FUSO));
        return SolicitacaoAcessoResponse.de(solicitacoes.findById(s.getId()).orElseThrow());
    }

    private void validarPeriodo(Usuario usuario, SolicitacaoAcessoRequest pedido, String tipo) {
        if (!"TEMPORARIA".equals(tipo)) {
            if (pedido != null && (pedido.inicioPeriodo() != null || pedido.fimPeriodo() != null)) throw new IllegalArgumentException("Datas são permitidas somente na suspensão temporária.");
            return;
        }
        if (!"COLABORADOR".equalsIgnoreCase(usuario.getTipo_do_acesso())) throw erro(HttpStatus.FORBIDDEN, "Suspensão temporária disponível somente para colaboradores.");
        var hoje = java.time.LocalDate.now(PeriodoAcessoUsuarioService.FUSO);
        if (pedido.inicioPeriodo() == null || pedido.fimPeriodo() == null || pedido.inicioPeriodo().isBefore(hoje)
                || pedido.fimPeriodo().isBefore(pedido.inicioPeriodo()) || pedido.fimPeriodo().isAfter(java.time.LocalDate.of(9999, 12, 30)))
            throw new IllegalArgumentException("Informe início a partir de hoje e fim igual ou posterior ao início. Pedidos cujo início já passou devem ser recusados e refeitos.");
    }

    private void validarSolicitante(Usuario u) {
        if (!"ATIVO".equalsIgnoreCase(u.getStatus())) throw erro(HttpStatus.UNAUTHORIZED, "Sua conta está inativa. Entre em contato com a CliniCar.");
        if (!Set.of("CLIENTE", "COLABORADOR").contains(normalizar(u.getTipo_do_acesso()))) {
            throw erro(HttpStatus.FORBIDDEN, "Este fluxo está disponível somente para clientes e colaboradores.");
        }
    }
    private String justificativa(String valor) {
        String texto = valor == null ? "" : valor.strip();
        if (texto.length() < 10 || texto.length() > 1000) throw new IllegalArgumentException("Informe uma justificativa de 10 a 1000 caracteres.");
        return texto;
    }
    private String normalizar(String valor) { return valor == null ? "" : valor.strip().toUpperCase(Locale.ROOT); }
    private Pageable paginacao(int pagina, int tamanho) {
        if (pagina < 0 || tamanho < 1 || tamanho > 50) throw new IllegalArgumentException("Paginação inválida.");
        return PageRequest.of(pagina, tamanho, Sort.by(Sort.Direction.DESC, "solicitadoEm", "id"));
    }
    private PaginaSolicitacoesAcesso resposta(Page<SolicitacaoAcessoUsuario> pagina, long pendentes) {
        return new PaginaSolicitacoesAcesso(pagina.getContent().stream().map(SolicitacaoAcessoResponse::de).toList(),
                pagina.getTotalElements(), pagina.getNumber(), pagina.getSize(), pagina.getTotalPages(), pendentes);
    }
    private ResponseStatusException erro(HttpStatus status, String texto) { return new ResponseStatusException(status, texto); }
}
