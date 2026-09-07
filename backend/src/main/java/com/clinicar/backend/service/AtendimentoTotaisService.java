package com.clinicar.backend.service;

import com.clinicar.backend.model.Agendamento;
import com.clinicar.backend.model.Atendimento;
import com.clinicar.backend.model.Servico;
import com.clinicar.backend.repository.AtendimentoPecaUtilizadaRepository;
import com.clinicar.backend.repository.AtendimentoRepository;
import com.clinicar.backend.repository.AtendimentoServicoExecutadoRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;

@Slf4j
@Service
public class AtendimentoTotaisService {

    private final AtendimentoRepository atendimentoRepository;
    private final AtendimentoPecaUtilizadaRepository atendimentoPecaRepository;
    private final AtendimentoServicoExecutadoRepository atendimentoServicoRepository;

    public AtendimentoTotaisService(
            AtendimentoRepository atendimentoRepository,
            AtendimentoPecaUtilizadaRepository atendimentoPecaRepository,
            AtendimentoServicoExecutadoRepository atendimentoServicoRepository
    ) {
        this.atendimentoRepository = atendimentoRepository;
        this.atendimentoPecaRepository = atendimentoPecaRepository;
        this.atendimentoServicoRepository = atendimentoServicoRepository;
    }

    @Transactional
    public Atendimento recalcularTotais(Long atendimentoId) {
        if (atendimentoId == null || atendimentoId <= 0) {
            throw new IllegalArgumentException("Atendimento é obrigatório para recalcular totais.");
        }

        Atendimento atendimento = atendimentoRepository
                .findById(atendimentoId)
                .orElseThrow(() -> new IllegalArgumentException("Atendimento não encontrado."));

        BigDecimal valorPecas = tratarValor(
                atendimentoPecaRepository.somarValorTotalPorAtendimento(atendimentoId)
        );

        BigDecimal valorMaoObraSomada = tratarValor(
                atendimentoServicoRepository.somarMaoObraPorAtendimento(atendimentoId)
        );

        BigDecimal valorMaoObra = valorMaoObraSomada.compareTo(BigDecimal.ZERO) > 0
                ? valorMaoObraSomada
                : resolverValorMaoObraFallback(atendimento);

        BigDecimal valorTerceirosSomado = tratarValor(
                atendimentoServicoRepository.somarTerceirosPorAtendimento(atendimentoId)
        );

        BigDecimal valorTerceiros = valorTerceirosSomado.compareTo(BigDecimal.ZERO) > 0
                ? valorTerceirosSomado
                : tratarValor(atendimento.getValorTerceiros());

        BigDecimal desconto = tratarValor(atendimento.getDesconto());

        BigDecimal total = valorMaoObra
                .add(valorPecas)
                .add(valorTerceiros)
                .subtract(desconto)
                .setScale(2, RoundingMode.HALF_UP);

        if (total.compareTo(BigDecimal.ZERO) < 0) {
            total = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        }

        atendimento.setValorPecas(valorPecas);
        atendimento.setValorMaoObra(valorMaoObra);
        atendimento.setValorTerceiros(valorTerceiros);
        atendimento.setDesconto(desconto);
        atendimento.setValorTotal(total);

        log.info(
                "[ATENDIMENTO_TOTAIS] Atendimento ID {} recalculado. M.O.={}, peças={}, terceiros={}, desconto={}, total={}",
                atendimento.getId(),
                valorMaoObra,
                valorPecas,
                valorTerceiros,
                desconto,
                total
        );

        return atendimentoRepository.save(atendimento);
    }

    private BigDecimal resolverValorMaoObraFallback(Atendimento atendimento) {
        Servico servicoAtendimento = atendimento.getServico();
        BigDecimal valorServicoAtendimento = valorBaseServico(servicoAtendimento);

        if (valorServicoAtendimento.compareTo(BigDecimal.ZERO) > 0) {
            return valorServicoAtendimento;
        }

        BigDecimal valorAtualAtendimento = tratarValor(atendimento.getValorMaoObra());

        if (valorAtualAtendimento.compareTo(BigDecimal.ZERO) > 0) {
            return valorAtualAtendimento;
        }

        Agendamento agendamento = atendimento.getAgendamento();

        if (agendamento != null) {
            BigDecimal valorServicoAgendamento = valorBaseServico(agendamento.getServico());

            if (valorServicoAgendamento.compareTo(BigDecimal.ZERO) > 0) {
                return valorServicoAgendamento;
            }

            BigDecimal valorPecasAtendimento = tratarValor(atendimento.getValorPecas());
            BigDecimal valorEstimadoAgendamento = tratarValor(agendamento.getValorEstimado());

            if (valorPecasAtendimento.compareTo(BigDecimal.ZERO) <= 0
                    && valorEstimadoAgendamento.compareTo(BigDecimal.ZERO) > 0) {
                return valorEstimadoAgendamento;
            }
        }

        return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
    }

    private BigDecimal valorBaseServico(Servico servico) {
        if (servico == null || servico.getValorBase() == null) {
            return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        }

        return tratarValor(servico.getValorBase());
    }

    private BigDecimal tratarValor(BigDecimal valor) {
        if (valor == null) {
            return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        }

        return valor.setScale(2, RoundingMode.HALF_UP);
    }
}