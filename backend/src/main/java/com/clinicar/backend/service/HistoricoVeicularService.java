package com.clinicar.backend.service;

import com.clinicar.backend.dto.HistoricoVeicularResponse;
import com.clinicar.backend.dto.HistoricoVeicularResponse.*;
import com.clinicar.backend.repository.HistoricoVeicularRepository;
import com.clinicar.backend.repository.VeiculoRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

@Service
public class HistoricoVeicularService {
    private static final int LIMITE = 5000;
    private final VeiculoRepository veiculos;
    private final HistoricoVeicularRepository historico;
    public HistoricoVeicularService(VeiculoRepository veiculos, HistoricoVeicularRepository historico) {
        this.veiculos = veiculos; this.historico = historico;
    }

    @Transactional(readOnly = true)
    public HistoricoVeicularResponse consultar(Long id, LocalDate inicio, LocalDate fim, String situacao) {
        if (id == null || id <= 0) throw new IllegalArgumentException("Selecione um veículo válido.");
        if (inicio != null && fim != null && fim.isBefore(inicio))
            throw new IllegalArgumentException("A data final deve ser igual ou posterior à data inicial.");
        if ((inicio != null && (inicio.getYear() < 1900 || inicio.getYear() > 9998))
                || (fim != null && (fim.getYear() < 1900 || fim.getYear() > 9998)))
            throw new IllegalArgumentException("Informe um período válido.");
        String filtro = situacao == null ? "TODOS" : situacao.trim().toUpperCase(Locale.ROOT);
        if (!Set.of("TODOS", "FINALIZADOS", "EM_ABERTO", "CANCELADOS").contains(filtro))
            throw new IllegalArgumentException("Situação inválida para o relatório.");
        var veiculo = veiculos.findById(id).orElseThrow(() -> new IllegalArgumentException("Veículo não encontrado."));
        var de = inicio == null ? null : inicio.atStartOfDay();
        var ate = fim == null ? null : fim.plusDays(1).atStartOfDay();
        var limite = PageRequest.of(0, LIMITE + 1);
        var atendimentos = historico.atendimentos(id, de, ate, limite);
        var agendamentos = historico.agendamentos(id, de, ate, limite);
        if (atendimentos.size() + agendamentos.size() > LIMITE)
            throw new IllegalArgumentException("O histórico excede 5.000 registros. Reduza o período do relatório.");
        var selecionados = atendimentos.stream().filter(a -> corresponde(a.getStatus(), filtro)).toList();
        List<Long> ids = selecionados.stream().map(HistoricoVeicularRepository.Linha::getId).toList();
        Map<Long, List<Item>> itens = new HashMap<>();
        if (!ids.isEmpty()) {
            adicionarItens(itens, historico.servicos(ids), "SERVICO");
            adicionarItens(itens, historico.pecas(ids), "PECA");
        }
        List<Registro> registros = new ArrayList<>();
        for (var linha : selecionados) registros.add(registro("ATENDIMENTO", linha, itens.getOrDefault(linha.getId(), List.of())));
        for (var linha : agendamentos) if (corresponde(linha.getStatus(), filtro)) registros.add(registro("AGENDAMENTO", linha, List.of()));
        registros.sort(Comparator.comparing(Registro::data, Comparator.nullsLast(Comparator.reverseOrder()))
                .thenComparing(Registro::tipo).thenComparing(Registro::id, Comparator.reverseOrder()));
        var concluidos = registros.stream().filter(r -> r.tipo().equals("ATENDIMENTO") && r.finalizado()).toList();
        BigDecimal total = concluidos.stream().map(Registro::valor).filter(Objects::nonNull).reduce(BigDecimal.ZERO, BigDecimal::add);
        Integer km = registros.stream().filter(r -> r.tipo().equals("ATENDIMENTO"))
                .map(r -> r.kmSaida() != null ? r.kmSaida() : r.kmEntrada()).filter(Objects::nonNull).findFirst().orElse(null);
        var cadastro = new Cadastro(id, veiculo.getPlaca(), veiculo.getFabricante(), veiculo.getModelo(), veiculo.getCor(), veiculo.getAnoModeloCombustivel());
        var resumo = new Resumo(registros.size() - selecionados.size(), selecionados.size(), concluidos.size(), total, km);
        return new HistoricoVeicularResponse(cadastro, inicio, fim, filtro, LocalDateTime.now(), resumo, List.copyOf(registros));
    }

    private boolean corresponde(String status, String filtro) {
        return switch (filtro) {
            case "FINALIZADOS" -> finalizado(status);
            case "CANCELADOS" -> "CANCELADO".equals(status);
            case "EM_ABERTO" -> !finalizado(status) && !Set.of("CANCELADO", "NAO_COMPARECEU").contains(status);
            default -> true;
        };
    }
    private boolean finalizado(String status) { return "CONCLUIDO".equals(status) || "ENTREGUE".equals(status); }
    private Registro registro(String tipo, HistoricoVeicularRepository.Linha l, List<Item> itens) {
        return new Registro(tipo, l.getId(), l.getCodigo(), l.getData(), l.getStatus(), l.getPlaca(), l.getFabricante(), l.getModelo(),
                l.getCor(), l.getAno(), Boolean.TRUE.equals(l.getPreservado()), l.getKmEntrada(), l.getKmSaida(),
                l.getQueixa(), l.getDiagnostico(), l.getExecucao(), l.getRecomendacoes(), l.getValor(), finalizado(l.getStatus()), List.copyOf(itens));
    }
    private void adicionarItens(Map<Long, List<Item>> destino, List<HistoricoVeicularRepository.ItemLinha> linhas, String tipo) {
        for (var i : linhas) destino.computeIfAbsent(i.getAtendimentoId(), chave -> new ArrayList<>())
                .add(new Item(tipo, i.getDescricao(), i.getQuantidade(), i.getUnidade(), i.getValorTotal()));
    }
}
