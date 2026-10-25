package com.clinicar.backend.controller;

import com.clinicar.backend.dto.AgendamentoRequest;
import com.clinicar.backend.dto.AgendamentoResponse;
import com.clinicar.backend.dto.UsuarioResponse;
import com.clinicar.backend.mapper.AgendamentoMapper;
import com.clinicar.backend.model.Agendamento;
import com.clinicar.backend.model.Servico;
import com.clinicar.backend.model.Usuario;
import com.clinicar.backend.repository.AgendamentoRepository;
import com.clinicar.backend.service.AgendamentoPecaPrevistaService;
import com.clinicar.backend.service.AgendamentoService;
import jakarta.persistence.EntityManager;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/cliente/agendamentos")
public class ClienteAgendamentoController {
    private final AgendamentoService agendamentos;
    private final AgendamentoRepository repository;
    private final AgendamentoMapper mapper;
    private final AgendamentoPecaPrevistaService pecasPrevistas;
    private final EntityManager em;

    public ClienteAgendamentoController(AgendamentoService agendamentos, AgendamentoRepository repository,
            AgendamentoMapper mapper, AgendamentoPecaPrevistaService pecasPrevistas, EntityManager em) {
        this.agendamentos = agendamentos;
        this.repository = repository;
        this.mapper = mapper;
        this.pecasPrevistas = pecasPrevistas;
        this.em = em;
    }

    public record PecaPrevista(Long idPeca, String nome, String quantidade, String unidadeMedida) {}
    public record Item(AgendamentoResponse agendamento, List<PecaPrevista> pecas) {}
    public record Pagina(List<Item> itens, long total, int pagina, int tamanho, Map<String, Long> indicadores) {}
    public record Opcao(Long id, String nome, String materiaisReferencia,
            java.math.BigDecimal duracaoEstimada, String unidadeDuracao) {}
    public record Catalogos(List<Opcao> servicos, List<Opcao> responsaveis) {}

    @GetMapping
    @Transactional(readOnly = true)
    public Pagina listar(@RequestAttribute("usuarioLogado") UsuarioResponse sessao,
            @RequestParam(defaultValue = "0") int pagina, @RequestParam(defaultValue = "10") int tamanho,
            @RequestParam(defaultValue = "") String busca, @RequestParam(defaultValue = "") String status) {
        Long clienteId = clienteId(sessao);
        if (pagina < 0 || tamanho < 1 || tamanho > 50 || busca.length() > 120 || status.length() > 30)
            throw new IllegalArgumentException("Filtros inválidos.");
        String termo = "%" + busca.trim().toLowerCase(java.util.Locale.ROOT) + "%";
        String filtro = status.trim().toUpperCase(java.util.Locale.ROOT);
        String condicao = " WHERE a.cliente.id=:cliente AND (:status='' OR a.statusAgendamento=:status) "
                + "AND (:busca='%%' OR LOWER(a.codigoAgendamento) LIKE :busca "
                + "OR LOWER(a.servico.nome) LIKE :busca OR LOWER(a.veiculoPlacaHistorica) LIKE :busca)";
        var ids = em.createQuery("SELECT a.id FROM Agendamento a" + condicao
                + " ORDER BY a.dataHoraInicio DESC, a.id DESC", Long.class)
                .setParameter("cliente", clienteId).setParameter("status", filtro).setParameter("busca", termo)
                .setFirstResult(pagina * tamanho).setMaxResults(tamanho).getResultList();
        long total = em.createQuery("SELECT COUNT(a) FROM Agendamento a" + condicao, Long.class)
                .setParameter("cliente", clienteId).setParameter("status", filtro).setParameter("busca", termo)
                .getSingleResult();
        List<Item> itens = ids.stream().map(id -> item(agendamentos.buscarPorId(id))).toList();
        Map<String, Long> indicadores = em.createQuery("SELECT a.statusAgendamento, COUNT(a) FROM Agendamento a "
                + "WHERE a.cliente.id=:cliente GROUP BY a.statusAgendamento", Object[].class)
                .setParameter("cliente", clienteId).getResultList().stream()
                .collect(Collectors.toMap(row -> (String) row[0], row -> (Long) row[1]));
        return new Pagina(itens, total, pagina, tamanho, indicadores);
    }

    @GetMapping("/catalogos")
    @Transactional(readOnly = true)
    public Catalogos catalogos(@RequestAttribute("usuarioLogado") UsuarioResponse sessao) {
        clienteId(sessao);
        var servicos = em.createQuery("SELECT s FROM Servico s WHERE s.ativo=true ORDER BY s.nome", Servico.class)
                .getResultList().stream().map(s -> new Opcao(s.getId(), s.getNome(), s.getMateriaisReferencia(),
                        s.getDuracaoEstimada(), s.getUnidadeDuracao())).toList();
        return new Catalogos(servicos, List.of());
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Transactional(isolation = org.springframework.transaction.annotation.Isolation.READ_COMMITTED)
    public Item criar(@RequestAttribute("usuarioLogado") UsuarioResponse sessao, @RequestBody AgendamentoRequest request) {
        Long id = clienteId(sessao);
        preparar(request, id);
        return item(agendamentos.criar(request));
    }

    @PutMapping("/{id}")
    @Transactional(isolation = org.springframework.transaction.annotation.Isolation.READ_COMMITTED)
    public Item atualizar(@RequestAttribute("usuarioLogado") UsuarioResponse sessao,
            @PathVariable Long id, @RequestBody AgendamentoRequest request) {
        Long clienteId = clienteId(sessao);
        Agendamento existente = repository.buscarParaCancelamento(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        if (!clienteId.equals(existente.getCliente().getId())) throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        if (!"AGENDADO".equalsIgnoreCase(existente.getStatusAgendamento())
                && !"REAGENDADO".equalsIgnoreCase(existente.getStatusAgendamento()))
            throw new IllegalArgumentException("Somente agendamentos ainda não confirmados podem ser alterados pelo cliente.");
        if (existente.getDataHoraInicio() == null
                || existente.getDataHoraInicio().isBefore(LocalDateTime.now().plusDays(1)))
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "A edição deve ocorrer até 24 horas antes do início. Contate a oficina.");
        preparar(request, clienteId);
        return item(agendamentos.atualizar(id, request));
    }

    @PatchMapping("/{id}/cancelar")
    public Item cancelar(@RequestAttribute("usuarioLogado") UsuarioResponse sessao, @PathVariable Long id) {
        return item(agendamentos.cancelarPeloCliente(id, clienteId(sessao)));
    }

    @PatchMapping("/{id}/confirmar")
    public Item confirmar(@RequestAttribute("usuarioLogado") UsuarioResponse sessao, @PathVariable Long id) {
        return item(agendamentos.confirmarPeloCliente(id, clienteId(sessao)));
    }

    @PutMapping("/{id}/reagendar")
    public Item reagendar(@RequestAttribute("usuarioLogado") UsuarioResponse sessao,
            @PathVariable Long id, @RequestBody AgendamentoRequest request) {
        Long titularId = clienteId(sessao);
        preparar(request, titularId);
        return item(agendamentos.reagendarPeloCliente(id, titularId, request));
    }

    private void preparar(AgendamentoRequest request, Long clienteId) {
        if (request == null) throw new IllegalArgumentException("Informe os dados do agendamento.");
        request.setIdCliente(clienteId);
        request.setStatusAgendamento("AGENDADO");
        request.setCanalOrigem("SITE");
        request.setPrioridade("NORMAL");
        request.setIdFornecedor(null);
        request.setIdResponsavel(null);
        request.setTipoExecucao("PENDENTE");
        request.setValorEstimado(null);
        request.setValorFinal(null);
        request.setDiagnosticoPrevio(null);
        request.setConfirmado(false);
        request.setRequerConfirmacao(true);
        if (request.getIdVeiculo() == null || request.getIdServico() == null)
            throw new IllegalArgumentException("Selecione o veículo e o serviço.");
        Servico servico = em.find(Servico.class, request.getIdServico());
        if (servico == null || !Boolean.TRUE.equals(servico.getAtivo()))
            throw new IllegalArgumentException("Selecione um serviço ativo.");
        if (request.getPecasPrevistas() != null && !request.getPecasPrevistas().isEmpty())
            throw new IllegalArgumentException("Peças previstas são definidas pela oficina. Informe apenas suas preferências de materiais.");
        request.setPecasPrevistas(null);
    }

    private Item item(Agendamento agendamento) {
        var pecas = pecasPrevistas.listarPorAgendamento(agendamento.getId()).stream()
                .map(p -> new PecaPrevista(p.getPeca().getId(), p.getPeca().getNome(),
                        p.getQuantidade().toPlainString(), p.getUnidadeMedida())).toList();
        return new Item(mapper.toResponse(agendamento), pecas);
    }

    private Long clienteId(UsuarioResponse sessao) {
        if (sessao == null || !"CLIENTE".equalsIgnoreCase(sessao.getTipo_do_acesso())
                || !"ATIVO".equalsIgnoreCase(sessao.getStatus()))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Acesso exclusivo do titular da conta.");
        return sessao.getId();
    }
}
