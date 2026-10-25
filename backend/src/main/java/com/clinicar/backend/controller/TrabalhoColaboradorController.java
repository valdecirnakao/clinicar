package com.clinicar.backend.controller;

import com.clinicar.backend.dto.UsuarioResponse;
import com.clinicar.backend.mapper.AgendamentoMapper;
import com.clinicar.backend.mapper.AtendimentoMapper;
import com.clinicar.backend.model.Agendamento;
import com.clinicar.backend.model.Atendimento;
import com.clinicar.backend.model.AlertaEstoquePeca;
import jakarta.persistence.EntityManager;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;

/** Leitura paginada dos registros de trabalho atribuídos ao colaborador autenticado. */
@RestController
@RequestMapping("/api/colaborador/meu-trabalho")
public class TrabalhoColaboradorController {
    private final EntityManager em;
    private final AgendamentoMapper agendamentoMapper;
    private final AtendimentoMapper atendimentoMapper;

    public TrabalhoColaboradorController(EntityManager em, AgendamentoMapper agendamentoMapper,
                                         AtendimentoMapper atendimentoMapper) {
        this.em = em;
        this.agendamentoMapper = agendamentoMapper;
        this.atendimentoMapper = atendimentoMapper;
    }

    @GetMapping("/pendencias")
    @Transactional(readOnly = true)
    public Map<String, Long> pendencias(HttpServletRequest request) {
        Long usuarioId = idColaborador(request);
        long agendamentos = em.createQuery("SELECT COUNT(a) FROM Agendamento a WHERE a.responsavel.id=:id AND a.statusAgendamento NOT IN ('CONCLUIDO','CANCELADO','NAO_COMPARECEU')", Long.class)
                .setParameter("id", usuarioId).getSingleResult();
        long atendimentos = em.createQuery("SELECT COUNT(a) FROM Atendimento a WHERE a.responsavel.id=:id AND a.statusAtendimento NOT IN ('CONCLUIDO','ENTREGUE','CANCELADO')", Long.class)
                .setParameter("id", usuarioId).getSingleResult();
        boolean responsavelEstoque = em.createQuery("SELECT COUNT(c) FROM ConfiguracaoAlertaEstoque c WHERE c.ativo=true AND c.idResponsavel=:id", Long.class)
                .setParameter("id", usuarioId).getSingleResult() > 0;
        long alertasEstoque = responsavelEstoque ? em.createQuery("SELECT COUNT(a) FROM AlertaEstoquePeca a WHERE a.statusAlerta='ABERTO' AND a.nivelAlerta='ATENCAO'", Long.class).getSingleResult() : 0;
        return Map.of("agendamentos", agendamentos, "atendimentos", atendimentos, "alertasEstoque", alertasEstoque);
    }

    private Long idColaborador(HttpServletRequest request) {
        if (!(request.getAttribute("usuarioLogado") instanceof UsuarioResponse ator)
                || !"COLABORADOR".equalsIgnoreCase(ator.getTipo_do_acesso())
                || !"ATIVO".equalsIgnoreCase(ator.getStatus()) || ator.getId() == null) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Consulta disponível somente ao colaborador ativo autenticado.");
        }
        return ator.getId();
    }

    @GetMapping("/{tipo}")
    @Transactional(readOnly = true)
    public Map<String, Object> consultar(HttpServletRequest request, @PathVariable String tipo,
                                         @RequestParam(defaultValue = "0") int pagina,
                                         @RequestParam(defaultValue = "10") int tamanho,
                                         @RequestParam(defaultValue = "") String busca,
                                         @RequestParam(defaultValue = "false") boolean pendentes) {
        Long usuarioId = idColaborador(request);
        if (pagina < 0 || pagina > 100_000 || tamanho < 1 || tamanho > 50 || busca.length() > 120) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Verifique os parâmetros da consulta.");
        }
        var termo = busca.trim().toLowerCase(java.util.Locale.ROOT);
        var padrao = "%" + termo.replace("!", "!!").replace("%", "!%").replace("_", "!_") + "%";
        return switch (tipo.toLowerCase(java.util.Locale.ROOT)) {
            case "agendamentos" -> agendamentos(usuarioId, pagina, tamanho, termo, padrao, pendentes);
            case "atendimentos" -> atendimentos(usuarioId, pagina, tamanho, termo, padrao, pendentes);
            case "alertas-estoque" -> alertasEstoque(usuarioId, pagina, tamanho, termo, padrao);
            default -> throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Seção de trabalho não encontrada.");
        };
    }

    private Map<String, Object> agendamentos(Long usuarioId, int pagina, int tamanho, String termo, String padrao, boolean pendentes) {
        String where = "a.responsavel.id = :usuarioId "
                + (pendentes ? "AND a.statusAgendamento NOT IN ('CONCLUIDO','CANCELADO','NAO_COMPARECEU') " : "")
                + "AND (:termo = '' OR "
                + "LOWER(a.codigoAgendamento) LIKE :padrao ESCAPE '!' OR LOWER(a.cliente.nome) LIKE :padrao ESCAPE '!' "
                + "OR LOWER(COALESCE(a.veiculoPlacaHistorica, a.veiculo.placa)) LIKE :padrao ESCAPE '!' "
                + "OR LOWER(a.servico.nome) LIKE :padrao ESCAPE '!')";
        long total = em.createQuery("SELECT COUNT(a) FROM Agendamento a WHERE " + where, Long.class)
                .setParameter("usuarioId", usuarioId).setParameter("termo", termo).setParameter("padrao", padrao)
                .getSingleResult();
        List<Agendamento> entidades = em.createQuery("SELECT a FROM Agendamento a "
                        + "LEFT JOIN FETCH a.cliente LEFT JOIN FETCH a.veiculo LEFT JOIN FETCH a.servico "
                        + "WHERE " + where + " ORDER BY a.dataHoraInicio ASC, a.id ASC", Agendamento.class)
                .setParameter("usuarioId", usuarioId).setParameter("termo", termo).setParameter("padrao", padrao)
                .setFirstResult(pagina * tamanho).setMaxResults(tamanho).getResultList();
        var itens = entidades.stream().map(a -> {
            var dto = agendamentoMapper.toResponse(a);
            return Map.of("id", dto.getId(), "codigo", dto.getCodigoAgendamento(), "cliente", dto.getNomeCliente(),
                    "placa", dto.getPlacaVeiculo() == null ? "" : dto.getPlacaVeiculo(), "servico", dto.getNomeServico(),
                    "inicio", dto.getDataHoraInicio(), "fim", dto.getDataHoraFim(), "status", dto.getStatusAgendamento(),
                    "prioridade", dto.getPrioridade());
        }).toList();
        return pagina(itens, total, pagina, tamanho);
    }

    private Map<String, Object> atendimentos(Long usuarioId, int pagina, int tamanho, String termo, String padrao, boolean pendentes) {
        String where = "a.responsavel.id = :usuarioId "
                + (pendentes ? "AND a.statusAtendimento NOT IN ('CONCLUIDO','ENTREGUE','CANCELADO') " : "")
                + "AND (:termo = '' OR "
                + "LOWER(a.codigoAtendimento) LIKE :padrao ESCAPE '!' OR LOWER(a.cliente.nome) LIKE :padrao ESCAPE '!' "
                + "OR LOWER(COALESCE(a.veiculoPlacaHistorica, a.veiculo.placa)) LIKE :padrao ESCAPE '!' "
                + "OR LOWER(a.servico.nome) LIKE :padrao ESCAPE '!')";
        long total = em.createQuery("SELECT COUNT(a) FROM Atendimento a WHERE " + where, Long.class)
                .setParameter("usuarioId", usuarioId).setParameter("termo", termo).setParameter("padrao", padrao)
                .getSingleResult();
        List<Atendimento> entidades = em.createQuery("SELECT a FROM Atendimento a "
                        + "LEFT JOIN FETCH a.agendamento LEFT JOIN FETCH a.cliente LEFT JOIN FETCH a.veiculo LEFT JOIN FETCH a.servico "
                        + "WHERE " + where + " ORDER BY COALESCE(a.dataEntrada, a.criadoEm) DESC, a.id DESC", Atendimento.class)
                .setParameter("usuarioId", usuarioId).setParameter("termo", termo).setParameter("padrao", padrao)
                .setFirstResult(pagina * tamanho).setMaxResults(tamanho).getResultList();
        var itens = entidades.stream().map(a -> {
            var dto = atendimentoMapper.toResponse(a);
            return Map.of("id", dto.getId(), "codigo", dto.getCodigoAtendimento(), "cliente", dto.getNomeCliente(),
                    "placa", dto.getPlacaVeiculo() == null ? "" : dto.getPlacaVeiculo(), "servico", dto.getNomeServico(),
                    "inicio", dto.getDataEntrada() == null ? dto.getCriadoEm() : dto.getDataEntrada(),
                    "status", dto.getStatusAtendimento());
        }).toList();
        return pagina(itens, total, pagina, tamanho);
    }

    private Map<String, Object> alertasEstoque(Long usuarioId, int pagina, int tamanho, String termo, String padrao) {
        boolean responsavel = em.createQuery("SELECT COUNT(c) FROM ConfiguracaoAlertaEstoque c WHERE c.ativo=true AND c.idResponsavel=:id", Long.class)
                .setParameter("id", usuarioId).getSingleResult() > 0;
        if (!responsavel) return pagina(List.of(), 0, pagina, tamanho);
        String where = "a.statusAlerta='ABERTO' AND a.nivelAlerta='ATENCAO' "
                + "AND (:termo='' OR LOWER(a.peca.nome) LIKE :padrao ESCAPE '!' "
                + "OR LOWER(a.estoquePeca.localEstoque.nome) LIKE :padrao ESCAPE '!')";
        long total = em.createQuery("SELECT COUNT(a) FROM AlertaEstoquePeca a WHERE " + where, Long.class)
                .setParameter("termo", termo).setParameter("padrao", padrao).getSingleResult();
        List<AlertaEstoquePeca> alertas = em.createQuery("SELECT a FROM AlertaEstoquePeca a "
                        + "JOIN FETCH a.peca JOIN FETCH a.estoquePeca e JOIN FETCH e.localEstoque "
                        + "WHERE " + where + " ORDER BY a.criadoEm DESC, a.id DESC", AlertaEstoquePeca.class)
                .setParameter("termo", termo).setParameter("padrao", padrao)
                .setFirstResult(pagina * tamanho).setMaxResults(tamanho).getResultList();
        var itens = alertas.stream().map(a -> Map.of(
                "id", a.getId(), "peca", a.getPeca().getNome(), "local", a.getEstoquePeca().getLocalEstoque().getNome(),
                "quantidadeAtual", a.getQuantidadeAtual(), "estoqueMinimo", a.getEstoqueMinimo(),
                "criadoEm", a.getCriadoEm(), "status", a.getStatusAlerta())).toList();
        return pagina(itens, total, pagina, tamanho);
    }

    private Map<String, Object> pagina(List<?> itens, long total, int numero, int tamanho) {
        return Map.of("content", itens, "totalElements", total,
                "totalPages", (int) Math.ceil((double) total / tamanho), "number", numero);
    }
}
