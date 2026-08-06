package com.clinicar.backend.service;

import com.clinicar.backend.model.Atendimento;
import com.clinicar.backend.model.AtendimentoPecaUtilizada;
import com.clinicar.backend.model.EstoquePeca;
import com.clinicar.backend.model.MovimentacaoEstoquePeca;
import com.clinicar.backend.repository.AtendimentoPecaUtilizadaRepository;
import com.clinicar.backend.repository.EstoquePecaRepository;
import com.clinicar.backend.repository.MovimentacaoEstoquePecaRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class AtendimentoEstoqueService {

    private final AtendimentoPecaUtilizadaRepository atendimentoPecaUtilizadaRepository;
    private final EstoquePecaRepository estoquePecaRepository;
    private final MovimentacaoEstoquePecaRepository movimentacaoEstoquePecaRepository;

    public AtendimentoEstoqueService(
            AtendimentoPecaUtilizadaRepository atendimentoPecaUtilizadaRepository,
            EstoquePecaRepository estoquePecaRepository,
            MovimentacaoEstoquePecaRepository movimentacaoEstoquePecaRepository
    ) {
        this.atendimentoPecaUtilizadaRepository = atendimentoPecaUtilizadaRepository;
        this.estoquePecaRepository = estoquePecaRepository;
        this.movimentacaoEstoquePecaRepository = movimentacaoEstoquePecaRepository;
    }

    @Transactional
    public void baixarPecasDoAtendimento(Atendimento atendimento) {
        if (Boolean.TRUE.equals(atendimento.getEstoqueBaixado())) {
            return;
        }

        List<AtendimentoPecaUtilizada> pecasUtilizadas =
                atendimentoPecaUtilizadaRepository.findByAtendimentoId(atendimento.getId());

        if (pecasUtilizadas.isEmpty()) {
            return;
        }

        for (AtendimentoPecaUtilizada item : pecasUtilizadas) {
            baixarItem(atendimento, item);
        }

        atendimento.setEstoqueBaixado(true);
        atendimento.setEstoqueBaixadoEm(LocalDateTime.now());
    }

    private void baixarItem(Atendimento atendimento, AtendimentoPecaUtilizada item) {
        EstoquePeca estoque = localizarEstoque(item);

        BigDecimal quantidadeUtilizada = item.getQuantidade();

        if (quantidadeUtilizada == null || quantidadeUtilizada.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Quantidade inválida para peça utilizada no atendimento.");
        }

        BigDecimal quantidadeAtual = estoque.getQuantidadeAtual() != null
                ? estoque.getQuantidadeAtual()
                : BigDecimal.ZERO;

        if (quantidadeAtual.compareTo(quantidadeUtilizada) < 0) {
            String descricaoPeca = item.getPeca() != null
                    ? "peça ID " + item.getPeca().getId()
                    : "peça ID " + item.getId();

            throw new IllegalArgumentException(
                    "Estoque insuficiente para a peça: " + descricaoPeca
                            + ". Saldo atual: " + quantidadeAtual
                            + ". Quantidade necessária: " + quantidadeUtilizada + "."
            );
        }

        BigDecimal novoSaldo = quantidadeAtual.subtract(quantidadeUtilizada);
        estoque.setQuantidadeAtual(novoSaldo);

        atualizarStatusEstoque(estoque);

        estoquePecaRepository.save(estoque);

        MovimentacaoEstoquePeca movimentacao = new MovimentacaoEstoquePeca();
        movimentacao.setEstoquePeca(estoque);
        movimentacao.setPeca(item.getPeca());
        definirTipoMovimentacao(movimentacao, "SAIDA");
        movimentacao.setQuantidade(quantidadeUtilizada);
        movimentacao.setSaldoAnterior(quantidadeAtual);
        movimentacao.setSaldoPosterior(novoSaldo);
        movimentacao.setValorUnitario(item.getValorUnitario());
        movimentacao.setValorTotal(item.getValorTotal());
        movimentacao.setOrigem("ATENDIMENTO");
        movimentacao.setDocumentoReferencia(atendimento.getCodigoAtendimento());
        movimentacao.setObservacoes("Baixa automática ao concluir atendimento ID " + atendimento.getId());
        movimentacao.setCriadoEm(LocalDateTime.now());

        movimentacaoEstoquePecaRepository.save(movimentacao);
    }

    private void definirTipoMovimentacao(MovimentacaoEstoquePeca movimentacao, String tipo) {
        for (String nomeMetodo : List.of("setTipoMovimentacao", "setTipo")) {
            try {
                java.lang.reflect.Method metodo = movimentacao.getClass().getDeclaredMethod(nomeMetodo, String.class);
                metodo.setAccessible(true);
                metodo.invoke(movimentacao, tipo);
                return;
            } catch (NoSuchMethodException ignored) {
            } catch (ReflectiveOperationException e) {
                throw new IllegalStateException("Não foi possível definir o tipo de movimentação do estoque.", e);
            }
        }

        try {
            java.lang.reflect.Field campo = movimentacao.getClass().getDeclaredField("tipoMovimentacao");
            campo.setAccessible(true);
            campo.set(movimentacao, tipo);
        } catch (ReflectiveOperationException e) {
            throw new IllegalStateException("Não foi possível definir o tipo de movimentação do estoque.", e);
        }
    }

    private EstoquePeca localizarEstoque(AtendimentoPecaUtilizada item) {
        if (item.getEstoquePeca() != null && item.getEstoquePeca().getId() != null) {
            return estoquePecaRepository.findById(item.getEstoquePeca().getId())
                    .orElseThrow(() -> new IllegalArgumentException(
                            "Estoque vinculado à peça utilizada não foi encontrado."
                    ));
        }

        if (item.getPeca() == null || item.getPeca().getId() == null) {
            throw new IllegalArgumentException("Peça utilizada sem vínculo com peça cadastrada.");
        }

        // Repository does not expose a findByPecaId(Long) method; fallback to loading all and filtering
        List<EstoquePeca> estoques = estoquePecaRepository.findAll()
            .stream()
            .filter(e -> e.getPeca() != null && e.getPeca().getId() != null
                && e.getPeca().getId().equals(item.getPeca().getId()))
            .collect(Collectors.toList());

        if (estoques.isEmpty()) {
            throw new IllegalArgumentException(
                "Não existe estoque cadastrado para a peça ID: " + item.getPeca().getId()
            );
        }

        return estoques.get(0);
    }

    private void atualizarStatusEstoque(EstoquePeca estoque) {
        BigDecimal atual = estoque.getQuantidadeAtual() != null
                ? estoque.getQuantidadeAtual()
                : BigDecimal.ZERO;

        BigDecimal minimo = estoque.getEstoqueMinimo() != null
                ? estoque.getEstoqueMinimo()
                : BigDecimal.ZERO;

        BigDecimal critico = estoque.getEstoqueCritico() != null
                ? estoque.getEstoqueCritico()
                : BigDecimal.ZERO;

        if (atual.compareTo(BigDecimal.ZERO) <= 0) {
            estoque.setStatusEstoque("ZERADO");
            return;
        }

        if (atual.compareTo(critico) <= 0) {
            estoque.setStatusEstoque("CRITICO");
            return;
        }

        if (atual.compareTo(minimo) <= 0) {
            estoque.setStatusEstoque("ATENCAO");
            return;
        }

        estoque.setStatusEstoque("NORMAL");
    }
}