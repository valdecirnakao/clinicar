package com.clinicar.backend.service;

import com.clinicar.backend.model.Atendimento;
import com.clinicar.backend.repository.AtendimentoPecaUtilizadaRepository;
import com.clinicar.backend.repository.AtendimentoRepository;
import com.clinicar.backend.repository.AtendimentoServicoExecutadoRepository;
import jakarta.transaction.Transactional;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;

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

        BigDecimal valorMaoObra = tratarValor(
                atendimentoServicoRepository.somarMaoObraPorAtendimento(atendimentoId)
        );

        BigDecimal valorTerceiros = tratarValor(
                atendimentoServicoRepository.somarTerceirosPorAtendimento(atendimentoId)
        );

        BigDecimal desconto = tratarValor(atendimento.getDesconto());

        BigDecimal total = valorMaoObra
                .add(valorPecas)
                .add(valorTerceiros)
                .subtract(desconto);

        if (total.compareTo(BigDecimal.ZERO) < 0) {
            total = BigDecimal.ZERO;
        }

        atendimento.setValorPecas(valorPecas);
        atendimento.setValorMaoObra(valorMaoObra);
        atendimento.setValorTerceiros(valorTerceiros);
        atendimento.setValorTotal(total.setScale(2, RoundingMode.HALF_UP));

        return atendimentoRepository.save(atendimento);
    }

    private BigDecimal tratarValor(BigDecimal valor) {
        if (valor == null) {
            return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        }

        return valor.setScale(2, RoundingMode.HALF_UP);
    }
}