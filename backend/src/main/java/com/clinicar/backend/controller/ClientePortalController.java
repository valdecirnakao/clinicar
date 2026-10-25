package com.clinicar.backend.controller;

import com.clinicar.backend.dto.UsuarioRequest;
import com.clinicar.backend.dto.UsuarioResponse;
import com.clinicar.backend.dto.VeiculoRequest;
import com.clinicar.backend.mapper.UsuarioMapper;
import com.clinicar.backend.model.ConfiguracaoAlertaManutencao;
import com.clinicar.backend.model.Veiculo;
import com.clinicar.backend.repository.UsuarioRepository;
import com.clinicar.backend.repository.VeiculoRepository;
import com.clinicar.backend.service.AlertaManutencaoService;
import com.clinicar.backend.service.AtendimentoOrcamentoService;
import com.clinicar.backend.service.UsuarioService;
import com.clinicar.backend.service.VeiculoService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.persistence.EntityManager;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/cliente/portal")
public class ClientePortalController {
    @org.springframework.beans.factory.annotation.Autowired
    private com.clinicar.backend.service.NotificacaoOutboxService notificacoes;
    private final UsuarioRepository usuarios;
    private final UsuarioMapper mapper;
    private final UsuarioService usuarioService;
    private final VeiculoRepository veiculos;
    private final VeiculoService veiculoService;
    private final AlertaManutencaoService alertas;
    private final EntityManager em;
    private final AtendimentoOrcamentoService orcamentos;

    public ClientePortalController(UsuarioRepository usuarios, UsuarioMapper mapper, UsuarioService usuarioService,
            VeiculoRepository veiculos, VeiculoService veiculoService, AlertaManutencaoService alertas,
            EntityManager em, AtendimentoOrcamentoService orcamentos) {
        this.usuarios = usuarios;
        this.mapper = mapper;
        this.usuarioService = usuarioService;
        this.veiculos = veiculos;
        this.veiculoService = veiculoService;
        this.alertas = alertas;
        this.em = em;
        this.orcamentos = orcamentos;
    }

    @GetMapping("/orcamentos")
    public List<AtendimentoOrcamentoService.OrcamentoCliente> orcamentos(
            @RequestAttribute("usuarioLogado") UsuarioResponse sessao) {
        return orcamentos.listarDoCliente(clienteId(sessao));
    }

    public record DecisaoOrcamento(@NotNull Boolean aceitar) {}

    @PostMapping("/orcamentos/{id}/decisao")
    public AtendimentoOrcamentoService.OrcamentoCliente decidirOrcamento(
            @RequestAttribute("usuarioLogado") UsuarioResponse sessao, @PathVariable Long id,
            @Valid @RequestBody DecisaoOrcamento decisao) {
        return orcamentos.decidir(id, clienteId(sessao), decisao.aceitar());
    }

    public record Portal(UsuarioResponse usuario, List<Veiculo> veiculos, ConfiguracaoAlertaManutencao alertas,
                         boolean avisosServicoWhatsapp) {}
    public record Acompanhamento(Long id, String codigo, String placa, String servico, String status,
            java.time.LocalDateTime data) {}

    @GetMapping("/agendamentos")
    public List<Acompanhamento> agendamentos(@RequestAttribute("usuarioLogado") UsuarioResponse sessao) {
        return em.createQuery("SELECT a FROM Agendamento a JOIN FETCH a.servico JOIN FETCH a.veiculo "
                        + "WHERE a.cliente.id=:cliente ORDER BY a.dataHoraInicio DESC, a.id DESC",
                        com.clinicar.backend.model.Agendamento.class)
                .setParameter("cliente", clienteId(sessao)).setMaxResults(50).getResultList().stream()
                .map(a -> new Acompanhamento(a.getId(), a.getCodigoAgendamento(), a.getVeiculo().getPlaca(),
                        a.getServico().getNome(), a.getStatusAgendamento(), a.getDataHoraInicio())).toList();
    }

    @GetMapping("/atendimentos")
    public List<Acompanhamento> atendimentos(@RequestAttribute("usuarioLogado") UsuarioResponse sessao) {
        return em.createQuery("SELECT a FROM Atendimento a JOIN FETCH a.servico LEFT JOIN FETCH a.veiculo "
                        + "WHERE a.cliente.id=:cliente ORDER BY a.criadoEm DESC, a.id DESC",
                        com.clinicar.backend.model.Atendimento.class)
                .setParameter("cliente", clienteId(sessao)).setMaxResults(50).getResultList().stream()
                .map(a -> new Acompanhamento(a.getId(), a.getCodigoAtendimento(), a.placaVeiculoDoAtendimento(),
                        a.getServico().getNome(), a.getStatusAtendimento(), a.getDataEntrada())).toList();
    }

    @GetMapping
    public Portal consultar(@RequestAttribute("usuarioLogado") UsuarioResponse sessao) {
        Long id = clienteId(sessao);
        var usuario = usuarios.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        return new Portal(mapper.toResponse(usuario), veiculos.findByIdProprietarioOrderByIdDesc(id),
                alertas.consultar(id), Boolean.TRUE.equals(usuario.getAvisosServicoWhatsapp()));
    }

    public record PreferenciaAvisosServico(@NotNull Boolean ativo) {}

    @PutMapping("/avisos-servico-whatsapp")
    @org.springframework.transaction.annotation.Transactional
    public boolean atualizarAvisosServico(@RequestAttribute("usuarioLogado") UsuarioResponse sessao,
                                          @Valid @RequestBody PreferenciaAvisosServico preferencia) {
        var usuario = usuarios.findById(clienteId(sessao))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        usuario.setAvisosServicoWhatsapp(preferencia.ativo());
        usuarios.save(usuario);
        if (!preferencia.ativo()) notificacoes.cancelarAvisosServicoDestinatario(usuario.getTelefone());
        return preferencia.ativo();
    }

    @PutMapping("/dados")
    public UsuarioResponse atualizarDados(@RequestAttribute("usuarioLogado") UsuarioResponse sessao,
            @RequestBody UsuarioRequest dados) {
        return usuarioService.atualizarProprio(clienteId(sessao), dados);
    }

    public record VeiculoCliente(@NotBlank String placa, @NotBlank String fabricante, @NotBlank String modelo,
            @NotBlank String cor, @NotBlank String anoModeloCombustivel) {}

    @PostMapping("/veiculos")
    public Veiculo cadastrarVeiculo(@RequestAttribute("usuarioLogado") UsuarioResponse sessao,
            @Valid @RequestBody VeiculoCliente dados) {
        var req = new VeiculoRequest();
        req.setPlaca(dados.placa());
        req.setFabricante(dados.fabricante());
        req.setModelo(dados.modelo());
        req.setCor(dados.cor());
        req.setAnoModeloCombustivel(dados.anoModeloCombustivel());
        req.setIdProprietario(clienteId(sessao));
        return veiculoService.criar(req);
    }

    @PutMapping("/veiculos/{id}")
    public Veiculo atualizarVeiculo(@RequestAttribute("usuarioLogado") UsuarioResponse sessao,
            @PathVariable Long id, @Valid @RequestBody VeiculoCliente dados) {
        Long proprietarioId = clienteId(sessao);
        Veiculo alteracao = new Veiculo();
        alteracao.setPlaca(dados.placa());
        alteracao.setFabricante(dados.fabricante());
        alteracao.setModelo(dados.modelo());
        alteracao.setCor(dados.cor());
        alteracao.setAnoModeloCombustivel(dados.anoModeloCombustivel());
        return veiculoService.atualizarPorProprietario(id, proprietarioId, alteracao);
    }

    @PutMapping("/alertas")
    public ConfiguracaoAlertaManutencao atualizarAlertas(@RequestAttribute("usuarioLogado") UsuarioResponse sessao,
            @RequestBody ConfiguracaoAlertaManutencao configuracao) {
        return alertas.salvar(clienteId(sessao), configuracao);
    }

    private Long clienteId(UsuarioResponse sessao) {
        if (sessao == null || !"CLIENTE".equalsIgnoreCase(sessao.getTipo_do_acesso())
                || !"ATIVO".equalsIgnoreCase(sessao.getStatus())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Acesso exclusivo do titular da conta.");
        }
        return sessao.getId();
    }
}
