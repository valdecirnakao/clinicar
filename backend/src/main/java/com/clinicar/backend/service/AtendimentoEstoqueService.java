package com.clinicar.backend.service;

import com.clinicar.backend.model.Atendimento;
import com.clinicar.backend.model.AtendimentoPecaUtilizada;
import com.clinicar.backend.model.EstoquePeca;
import com.clinicar.backend.model.MovimentacaoEstoquePeca;
import com.clinicar.backend.repository.AtendimentoPecaUtilizadaRepository;
import com.clinicar.backend.repository.EstoquePecaRepository;
import com.clinicar.backend.repository.MovimentacaoEstoquePecaRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Service
public class AtendimentoEstoqueService {

    private final AtendimentoPecaUtilizadaRepository atendimentoPecaUtilizadaRepository;
    private final EstoquePecaRepository estoquePecaRepository;
    private final MovimentacaoEstoquePecaRepository movimentacaoEstoquePecaRepository;
    private final AlertaEstoquePecaService alertaEstoquePecaService;

    public AtendimentoEstoqueService(
            AtendimentoPecaUtilizadaRepository atendimentoPecaUtilizadaRepository,
            EstoquePecaRepository estoquePecaRepository,
            MovimentacaoEstoquePecaRepository movimentacaoEstoquePecaRepository,
            AlertaEstoquePecaService alertaEstoquePecaService
    ) {
        this.atendimentoPecaUtilizadaRepository = atendimentoPecaUtilizadaRepository;
        this.estoquePecaRepository = estoquePecaRepository;
        this.movimentacaoEstoquePecaRepository = movimentacaoEstoquePecaRepository;
        this.alertaEstoquePecaService = alertaEstoquePecaService;
    }

    @Transactional
    public void baixarPecasDoAtendimento(Atendimento atendimento) {
        if (atendimento == null || atendimento.getId() == null) {
            log.warn("[ESTOQUE-ATENDIMENTO] Atendimento não informado. Baixa de estoque ignorada.");
            return;
        }

        log.info(
                "[ESTOQUE-ATENDIMENTO] Iniciando baixa de estoque para atendimento ID {}.",
                atendimento.getId()
        );

        if (Boolean.TRUE.equals(atendimento.getEstoqueBaixado())) {
            log.info(
                    "[ESTOQUE-ATENDIMENTO] Atendimento ID {} já teve estoque baixado em {}. Baixa ignorada.",
                    atendimento.getId(),
                    atendimento.getEstoqueBaixadoEm()
            );
            return;
        }

        List<AtendimentoPecaUtilizada> pecasUtilizadas = atendimentoPecaUtilizadaRepository
                .findByAtendimento_Id(atendimento.getId());

        log.info(
                "[ESTOQUE-ATENDIMENTO] Peças utilizadas encontradas para baixa: {}.",
                pecasUtilizadas.size()
        );

        if (pecasUtilizadas.isEmpty()) {
            log.info(
                    "[ESTOQUE-ATENDIMENTO] Atendimento ID {} não possui peças utilizadas. Nenhuma baixa de estoque será realizada.",
                    atendimento.getId()
            );
            return;
        }

        for (AtendimentoPecaUtilizada item : pecasUtilizadas) {
            baixarItem(atendimento, item);
        }

        atendimento.setEstoqueBaixado(true);
        atendimento.setEstoqueBaixadoEm(LocalDateTime.now());

        log.info(
                "[ESTOQUE-ATENDIMENTO] Baixa de estoque concluída para atendimento ID {}.",
                atendimento.getId()
        );
    }

    private void baixarItem(
            Atendimento atendimento,
            AtendimentoPecaUtilizada item
    ) {
        if (item == null || item.getId() == null) {
            throw new IllegalArgumentException("Item de peça utilizada inválido para baixa de estoque.");
        }

        BigDecimal quantidadeUtilizada = valorOuZero(item.getQuantidade());

        if (quantidadeUtilizada.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Quantidade inválida para peça utilizada no atendimento.");
        }

        EstoquePeca estoque = localizarEstoqueComLock(item, quantidadeUtilizada);

        BigDecimal quantidadeAtual = valorOuZero(estoque.getQuantidadeAtual());
        BigDecimal quantidadeReservada = valorOuZero(estoque.getQuantidadeReservada());

        Long pecaId = item.getPeca() != null ? item.getPeca().getId() : null;

        log.info(
                "[ESTOQUE-ATENDIMENTO] Baixando peça. atendimentoId={}, itemId={}, pecaId={}, estoqueId={}, quantidadeUtilizada={}, saldoAtual={}, reservadaAtual={}",
                atendimento.getId(),
                item.getId(),
                pecaId,
                estoque.getId(),
                quantidadeUtilizada,
                quantidadeAtual,
                quantidadeReservada
        );

        if (quantidadeAtual.compareTo(quantidadeUtilizada) < 0) {
            String descricaoPeca = item.getPeca() != null && item.getPeca().getId() != null
                    ? "peça ID " + item.getPeca().getId()
                    : "item ID " + item.getId();

            throw new IllegalArgumentException(
                    "Estoque insuficiente para a peça: " + descricaoPeca
                            + ". Saldo atual: " + quantidadeAtual
                            + ". Quantidade necessária: " + quantidadeUtilizada + "."
            );
        }

        BigDecimal novoSaldo = quantidadeAtual.subtract(quantidadeUtilizada);
        BigDecimal novaReservada = quantidadeReservada.subtract(quantidadeUtilizada);

        if (novaReservada.compareTo(BigDecimal.ZERO) < 0) {
            novaReservada = BigDecimal.ZERO;
        }

        estoque.setQuantidadeAtual(novoSaldo);
        estoque.setQuantidadeReservada(novaReservada);

        atualizarStatusEstoquePeloDisponivel(estoque);

        EstoquePeca estoqueSalvo = estoquePecaRepository.save(estoque);

        if (item.getEstoquePeca() == null || item.getEstoquePeca().getId() == null) {
            item.setEstoquePeca(estoqueSalvo);
            atendimentoPecaUtilizadaRepository.save(item);
        }

        registrarMovimentacaoSaida(
                atendimento,
                item,
                estoqueSalvo,
                quantidadeUtilizada,
                quantidadeAtual,
                novoSaldo
        );

        avaliarAlertaEstoque(
                estoqueSalvo,
                "BAIXA_ATENDIMENTO",
                atendimento.getCodigoAtendimento()
        );

        log.info(
                "[ESTOQUE-ATENDIMENTO] Baixa realizada. atendimentoId={}, itemId={}, estoqueId={}, saldoPosterior={}, reservadaPosterior={}, disponivelPosterior={}, statusPosterior={}",
                atendimento.getId(),
                item.getId(),
                estoqueSalvo.getId(),
                novoSaldo,
                novaReservada,
                calcularQuantidadeDisponivel(estoqueSalvo),
                estoqueSalvo.getStatusEstoque()
        );
    }

    private void registrarMovimentacaoSaida(
            Atendimento atendimento,
            AtendimentoPecaUtilizada item,
            EstoquePeca estoque,
            BigDecimal quantidadeUtilizada,
            BigDecimal saldoAnterior,
            BigDecimal saldoPosterior
    ) {
        MovimentacaoEstoquePeca movimentacao = new MovimentacaoEstoquePeca();

        BigDecimal valorUnitario = valorOuZero(item.getValorUnitario());
        BigDecimal valorTotal = valorOuZero(item.getValorTotal());

        if (valorTotal.compareTo(BigDecimal.ZERO) <= 0 && valorUnitario.compareTo(BigDecimal.ZERO) > 0) {
            valorTotal = quantidadeUtilizada.multiply(valorUnitario);
        }

        movimentacao.setEstoquePeca(estoque);
        movimentacao.setPeca(item.getPeca());
        definirTipoMovimentacao(movimentacao, "SAIDA");
        movimentacao.setQuantidade(quantidadeUtilizada);
        movimentacao.setSaldoAnterior(saldoAnterior);
        movimentacao.setSaldoPosterior(saldoPosterior);
        movimentacao.setValorUnitario(valorUnitario);
        movimentacao.setValorTotal(valorTotal);
        movimentacao.setOrigem("ATENDIMENTO");
        movimentacao.setDocumentoReferencia(atendimento.getCodigoAtendimento());
        movimentacao.setObservacoes("Baixa automática ao concluir atendimento ID " + atendimento.getId());
        movimentacao.setCriadoEm(LocalDateTime.now());

        movimentacaoEstoquePecaRepository.save(movimentacao);
    }

    private void definirTipoMovimentacao(
            MovimentacaoEstoquePeca movimentacao,
            String tipo
    ) {
        for (String nomeMetodo : List.of("setTipoMovimentacao", "setTipoMovimento", "setTipo")) {
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

        for (String nomeCampo : List.of("tipoMovimentacao", "tipoMovimento", "tipo")) {
            try {
                java.lang.reflect.Field campo = movimentacao.getClass().getDeclaredField(nomeCampo);
                campo.setAccessible(true);
                campo.set(movimentacao, tipo);
                return;
            } catch (NoSuchFieldException ignored) {
            } catch (ReflectiveOperationException e) {
                throw new IllegalStateException("Não foi possível definir o tipo de movimentação do estoque.", e);
            }
        }

        throw new IllegalStateException(
                "Não foi possível definir o tipo de movimentação do estoque. "
                        + "Verifique se a entidade MovimentacaoEstoquePeca possui setTipoMovimentacao, "
                        + "setTipoMovimento ou campo equivalente."
        );
    }

    private EstoquePeca localizarEstoqueComLock(
            AtendimentoPecaUtilizada item,
            BigDecimal quantidadeUtilizada
    ) {
        if (item.getEstoquePeca() != null && item.getEstoquePeca().getId() != null) {
            return estoquePecaRepository.buscarPorIdComLock(item.getEstoquePeca().getId())
                    .orElseThrow(() -> new IllegalArgumentException(
                            "Estoque vinculado à peça utilizada não foi encontrado."
                    ));
        }

        if (item.getPeca() == null || item.getPeca().getId() == null) {
            throw new IllegalArgumentException("Peça utilizada sem vínculo com peça cadastrada.");
        }

        Long pecaId = item.getPeca().getId();

        List<EstoquePeca> estoques = estoquePecaRepository.findByPeca_Id(pecaId);

        if (estoques.isEmpty()) {
            throw new IllegalArgumentException(
                    "Não existe estoque cadastrado para a peça ID: " + pecaId + "."
            );
        }

        EstoquePeca melhorEstoque = null;

        for (EstoquePeca estoqueCandidato : estoques) {
            if (estoqueCandidato == null || estoqueCandidato.getId() == null) {
                continue;
            }

            EstoquePeca estoqueComLock = estoquePecaRepository.buscarPorIdComLock(estoqueCandidato.getId())
                    .orElseThrow(() -> new IllegalArgumentException(
                            "Estoque da peça utilizada não foi encontrado."
                    ));

            BigDecimal quantidadeAtual = valorOuZero(estoqueComLock.getQuantidadeAtual());

            if (quantidadeAtual.compareTo(quantidadeUtilizada) >= 0) {
                melhorEstoque = estoqueComLock;
                break;
            }
        }

        if (melhorEstoque == null) {
            throw new IllegalArgumentException(
                    "Não há saldo físico suficiente em nenhum estoque cadastrado para a peça ID: "
                            + pecaId
                            + ". Quantidade necessária: "
                            + quantidadeUtilizada
                            + "."
            );
        }

        if (estoques.size() > 1) {
            log.warn(
                    "[ESTOQUE-ATENDIMENTO] Existem {} estoques para a peça ID {}. Usando o estoque ID {} para baixa.",
                    estoques.size(),
                    pecaId,
                    melhorEstoque.getId()
            );
        }

        return melhorEstoque;
    }

    private void avaliarAlertaEstoque(
            EstoquePeca estoque,
            String origem,
            String documentoReferencia
    ) {
        try {
            alertaEstoquePecaService.avaliarEEnviarAlertaSeNecessario(
                    estoque,
                    origem,
                    documentoReferencia
            );
        } catch (Exception e) {
            log.error(
                    "[ESTOQUE-ATENDIMENTO] A baixa foi realizada, mas ocorreu erro ao avaliar/enviar alerta de estoque. estoqueId={}, origem={}, documentoReferencia={}",
                    estoque != null ? estoque.getId() : null,
                    origem,
                    documentoReferencia,
                    e
            );
        }
    }

    private void atualizarStatusEstoquePeloDisponivel(EstoquePeca estoque) {
        BigDecimal disponivel = calcularQuantidadeDisponivel(estoque);

        BigDecimal minimo = valorOuZero(estoque.getEstoqueMinimo());
        BigDecimal critico = valorOuZero(estoque.getEstoqueCritico());

        if (disponivel.compareTo(BigDecimal.ZERO) <= 0) {
            estoque.setStatusEstoque("ZERADO");
            return;
        }

        if (critico.compareTo(BigDecimal.ZERO) > 0
                && disponivel.compareTo(critico) <= 0) {
            estoque.setStatusEstoque("CRITICO");
            return;
        }

        if (minimo.compareTo(BigDecimal.ZERO) > 0
                && disponivel.compareTo(minimo) <= 0) {
            estoque.setStatusEstoque("ATENCAO");
            return;
        }

        estoque.setStatusEstoque("NORMAL");
    }

    private BigDecimal calcularQuantidadeDisponivel(EstoquePeca estoque) {
        BigDecimal atual = valorOuZero(estoque.getQuantidadeAtual());
        BigDecimal reservada = valorOuZero(estoque.getQuantidadeReservada());

        BigDecimal disponivel = atual.subtract(reservada);

        if (disponivel.compareTo(BigDecimal.ZERO) < 0) {
            return BigDecimal.ZERO;
        }

        return disponivel;
    }

    private BigDecimal valorOuZero(BigDecimal valor) {
        return valor != null ? valor : BigDecimal.ZERO;
    }
}