package com.clinicar.backend.service;

import com.clinicar.backend.model.*;
import com.clinicar.backend.repository.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.HexFormat;
import java.util.List;

@Service
public class AtendimentoOrcamentoService {
    private final AvisosServicoWhatsappService avisosWhatsapp;
    private final NotificacaoOutboxService notificacoes;
    private final AtendimentoRepository atendimentos;
    private final AtendimentoOrcamentoRepository orcamentos;
    private final AtendimentoPecaUtilizadaRepository pecas;
    private final AtendimentoServicoExecutadoRepository servicos;
    private final UsuarioRepository usuarios;

    public AtendimentoOrcamentoService(AtendimentoRepository atendimentos, AtendimentoOrcamentoRepository orcamentos,
            AtendimentoPecaUtilizadaRepository pecas, AtendimentoServicoExecutadoRepository servicos,
            UsuarioRepository usuarios, AvisosServicoWhatsappService avisosWhatsapp,
            NotificacaoOutboxService notificacoes) {
        this.atendimentos = atendimentos; this.orcamentos = orcamentos;
        this.pecas = pecas; this.servicos = servicos; this.usuarios = usuarios;
        this.avisosWhatsapp = avisosWhatsapp; this.notificacoes = notificacoes;
    }

    public record OrcamentoCliente(Long id, Long atendimentoId, int versao, String status, String codigo,
            String placa, String servico, String diagnostico, String itens,
            java.math.BigDecimal valorMaoObra, java.math.BigDecimal valorPecas,
            java.math.BigDecimal valorTerceiros, java.math.BigDecimal desconto,
            java.math.BigDecimal valorTotal, LocalDateTime prazoEstimadoEntrega,
            LocalDateTime criadoEm, LocalDateTime decididoEm, Long decisorId, String decisorNome) {}

    @Transactional(readOnly = true)
    public List<OrcamentoCliente> listarDoCliente(Long clienteId) {
        return orcamentos.findTop50ByAtendimento_Cliente_IdOrderByCriadoEmDesc(clienteId).stream()
                .map(this::resposta).toList();
    }

    @Transactional(readOnly = true)
    public List<OrcamentoCliente> listarDoAtendimento(Long atendimentoId) {
        return orcamentos.findByAtendimento_IdOrderByVersaoDesc(atendimentoId).stream()
                .map(this::resposta).toList();
    }

    private OrcamentoCliente resposta(AtendimentoOrcamento o) {
        return new OrcamentoCliente(o.getId(), o.getAtendimento().getId(), o.getVersao(), o.getStatus(),
                o.getCodigoAtendimento(), o.getPlaca(), o.getServico(), o.getDiagnostico(), o.getItens(),
                o.getValorMaoObra(), o.getValorPecas(), o.getValorTerceiros(), o.getDesconto(),
                o.getValorTotal(), o.getPrazoEstimadoEntrega(), o.getCriadoEm(), o.getDecididoEm(),
                o.getDecisor() == null ? null : o.getDecisor().getId(),
                o.getDecisor() == null ? null : o.getDecisor().getNome());
    }

    @Transactional
    public void emitir(Atendimento a) {
        var anterior = orcamentos.findFirstByAtendimento_IdOrderByVersaoDesc(a.getId());
        anterior.filter(o -> "PENDENTE".equals(o.getStatus())).ifPresent(o -> {
            o.setStatus("SUBSTITUIDO"); orcamentos.save(o);
            notificacoes.cancelarPendentes("ORCAMENTO", o.getId());
        });
        AtendimentoOrcamento o = new AtendimentoOrcamento();
        o.setAtendimento(a); o.setVersao(anterior.map(v -> v.getVersao() + 1).orElse(1));
        o.setStatus("PENDENTE"); o.setCodigoAtendimento(a.getCodigoAtendimento());
        o.setPlaca(a.placaVeiculoDoAtendimento()); o.setServico(a.getServico().getNome());
        o.setDiagnostico(a.getDiagnosticoTecnico()); o.setItens(itens(a));
        o.setValorMaoObra(a.getValorMaoObra()); o.setValorPecas(a.getValorPecas());
        o.setValorTerceiros(a.getValorTerceiros()); o.setDesconto(a.getDesconto());
        o.setValorTotal(a.getValorTotal()); o.setPrazoEstimadoEntrega(a.getPrazoEstimadoEntrega());
        o.setAssinaturaConteudo(assinatura(a)); o.setCriadoEm(LocalDateTime.now());
        orcamentos.save(o);
        avisosWhatsapp.orcamento(o);
    }

    @Transactional
    public OrcamentoCliente decidir(Long orcamentoId, Long clienteId, boolean aceitar) {
        AtendimentoOrcamento o = orcamentos.findById(orcamentoId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Orçamento não encontrado."));
        Atendimento a = atendimentos.buscarParaPrevisao(o.getAtendimento().getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        if (!a.getCliente().getId().equals(clienteId))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Orçamento de outro cliente.");
        if (!"PENDENTE".equals(o.getStatus()) || !"AGUARDANDO_APROVACAO".equals(a.getStatusAtendimento())
                || !orcamentos.findFirstByAtendimento_IdOrderByVersaoDesc(a.getId()).map(v -> v.getId().equals(o.getId())).orElse(false))
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Esta versão do orçamento não está mais pendente.");
        if (!o.getAssinaturaConteudo().equals(assinatura(a)))
            throw new ResponseStatusException(HttpStatus.CONFLICT, "O orçamento mudou. Solicite à oficina uma nova versão antes de decidir.");
        o.setStatus(aceitar ? "APROVADO" : "RECUSADO");
        notificacoes.cancelarPendentes("ORCAMENTO", o.getId());
        o.setDecididoEm(LocalDateTime.now());
        o.setDecisor(usuarios.getReferenceById(clienteId));
        a.setAprovado(aceitar); a.setAprovadoEm(aceitar ? o.getDecididoEm() : null);
        a.setStatusAtendimento(aceitar ? "APROVADO" : "EM_DIAGNOSTICO");
        atendimentos.save(a); orcamentos.save(o);
        return resposta(o);
    }

    @Transactional
    public void invalidarSeAlterado(Atendimento a) {
        if (!List.of("AGUARDANDO_APROVACAO", "APROVADO", "EM_EXECUCAO", "PAUSADO",
                "AGUARDANDO_TERCEIRO", "CONCLUIDO", "ENTREGUE").contains(a.getStatusAtendimento())) return;
        orcamentos.findFirstByAtendimento_IdOrderByVersaoDesc(a.getId()).ifPresent(o -> {
            if (!o.getAssinaturaConteudo().equals(assinatura(a))) {
                if ("CONCLUIDO".equals(a.getStatusAtendimento()) || "ENTREGUE".equals(a.getStatusAtendimento()))
                    throw new IllegalArgumentException("Não é possível alterar o orçamento de atendimento concluído ou entregue.");
                if ("PENDENTE".equals(o.getStatus()) || "APROVADO".equals(o.getStatus())) {
                    o.setStatus("SUBSTITUIDO"); orcamentos.save(o);
                    notificacoes.cancelarPendentes("ORCAMENTO", o.getId());
                }
                a.setStatusAtendimento("EM_DIAGNOSTICO");
                a.setAprovado(false); a.setAprovadoEm(null);
            }
        });
    }

    @Transactional
    public void abrirRevisao(Atendimento a) {
        if (!List.of("AGUARDANDO_APROVACAO", "APROVADO").contains(a.getStatusAtendimento()))
            throw new IllegalArgumentException("Somente orçamento pendente ou aprovado pode ser revisado.");
        orcamentos.findFirstByAtendimento_IdOrderByVersaoDesc(a.getId()).ifPresent(o -> {
            if ("PENDENTE".equals(o.getStatus()) || "APROVADO".equals(o.getStatus())) {
                o.setStatus("SUBSTITUIDO"); orcamentos.save(o);
                notificacoes.cancelarPendentes("ORCAMENTO", o.getId());
            }
        });
        a.setStatusAtendimento("EM_DIAGNOSTICO"); a.setAprovado(false); a.setAprovadoEm(null);
        atendimentos.save(a);
    }

    private String itens(Atendimento a) {
        StringBuilder linhas = new StringBuilder();
        pecas.findByAtendimento_Id(a.getId()).stream().sorted(Comparator.comparing(AtendimentoPecaUtilizada::getId))
                .forEach(p -> linhas.append("Peça ").append(p.getPeca().getNome()).append(" (ID ").append(p.getPeca().getId())
                        .append("): ").append(p.getQuantidade()).append(" × R$ ").append(p.getValorUnitario()).append('\n'));
        servicos.findByAtendimento_IdOrderByCriadoEmAsc(a.getId()).stream().sorted(Comparator.comparing(AtendimentoServicoExecutado::getId))
                .forEach(s -> linhas.append("Serviço ").append(s.getServico().getNome()).append(" (ID ").append(s.getServico().getId())
                        .append("): ").append(s.getQuantidade()).append(" × R$ ").append(s.getValorTotal()).append('\n'));
        return linhas.toString();
    }

    private String assinatura(Atendimento a) {
        String conteudo = String.join("|", String.valueOf(a.getServico().getId()),
                String.valueOf(a.getServico().getNome()), String.valueOf(a.placaVeiculoDoAtendimento()),
                String.valueOf(a.getDiagnosticoTecnico()), String.valueOf(a.getValorMaoObra()),
                String.valueOf(a.getValorPecas()), String.valueOf(a.getValorTerceiros()),
                String.valueOf(a.getDesconto()), String.valueOf(a.getValorTotal()),
                String.valueOf(a.getPrazoEstimadoEntrega()), itens(a));
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(conteudo.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) { throw new IllegalStateException("SHA-256 indisponível", e); }
    }
}
