package com.clinicar.backend.service;

import com.clinicar.backend.dto.AgendamentoPecaPrevistaRequest;
import com.clinicar.backend.model.Agendamento;
import com.clinicar.backend.model.AgendamentoPecaPrevista;
import com.clinicar.backend.model.EstoquePeca;
import com.clinicar.backend.model.Fornecedor;
import com.clinicar.backend.model.Peca;
import com.clinicar.backend.repository.AgendamentoPecaPrevistaRepository;
import com.clinicar.backend.repository.EstoquePecaRepository;
import com.clinicar.backend.repository.FornecedorRepository;
import com.clinicar.backend.repository.PecaRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;

@Slf4j
@Service
public class AgendamentoPecaPrevistaService {

    private final AgendamentoPecaPrevistaRepository repository;
    private final PecaRepository pecaRepository;
    private final EstoquePecaRepository estoquePecaRepository;
    private final FornecedorRepository fornecedorRepository;

    public AgendamentoPecaPrevistaService(
            AgendamentoPecaPrevistaRepository repository,
            PecaRepository pecaRepository,
            EstoquePecaRepository estoquePecaRepository,
            FornecedorRepository fornecedorRepository
    ) {
        this.repository = repository;
        this.pecaRepository = pecaRepository;
        this.estoquePecaRepository = estoquePecaRepository;
        this.fornecedorRepository = fornecedorRepository;
    }

    @Transactional
    public void substituirPecasDoAgendamento(
            Agendamento agendamento,
            List<AgendamentoPecaPrevistaRequest> pecas
    ) {
        if (agendamento == null || agendamento.getId() == null) {
            throw new IllegalArgumentException("Agendamento não informado para vincular peças previstas.");
        }

        int quantidadeRecebida = pecas != null ? pecas.size() : 0;

        log.info(
                "[AGENDAMENTO-PECAS] Substituindo peças previstas do agendamento ID {}. Quantidade recebida: {}.",
                agendamento.getId(),
                quantidadeRecebida
        );

        repository.deleteByAgendamento_Id(agendamento.getId());
        repository.flush();

        if (pecas == null || pecas.isEmpty()) {
            log.info(
                    "[AGENDAMENTO-PECAS] Nenhuma peça prevista informada para o agendamento ID {}.",
                    agendamento.getId()
            );
            return;
        }

        List<AgendamentoPecaPrevista> itensParaSalvar = new ArrayList<>();

        for (AgendamentoPecaPrevistaRequest request : pecas) {
            if (request == null) {
                continue;
            }

            AgendamentoPecaPrevista item = montarItem(agendamento, request);
            itensParaSalvar.add(item);
        }

        repository.saveAll(itensParaSalvar);
        repository.flush();

        log.info(
                "[AGENDAMENTO-PECAS] Peças previstas salvas para o agendamento ID {}. Quantidade salva: {}.",
                agendamento.getId(),
                itensParaSalvar.size()
        );
    }

    public List<AgendamentoPecaPrevista> listarPorAgendamento(Long agendamentoId) {
        if (agendamentoId == null || agendamentoId <= 0) {
            throw new IllegalArgumentException("ID do agendamento não informado.");
        }

        return repository.findByAgendamento_Id(agendamentoId);
    }

    private AgendamentoPecaPrevista montarItem(
            Agendamento agendamento,
            AgendamentoPecaPrevistaRequest request
    ) {
        if (request.getIdPeca() == null || request.getIdPeca() <= 0) {
            throw new IllegalArgumentException("Peça prevista sem identificação da peça.");
        }

        Peca peca = pecaRepository.findById(request.getIdPeca())
                .orElseThrow(() -> new IllegalArgumentException(
                        "Peça prevista não encontrada. ID: " + request.getIdPeca()
                ));

        EstoquePeca estoquePeca = resolverEstoquePeca(request, peca);

        Fornecedor fornecedor = resolverFornecedor(request);

        BigDecimal quantidade = parseDecimalObrigatorio(
                request.getQuantidade(),
                "Quantidade da peça prevista"
        );

        BigDecimal valorUnitario = parseDecimalOpcional(
                request.getValorUnitario(),
                "Valor unitário da peça prevista"
        );

        BigDecimal valorTotal = quantidade
                .multiply(valorUnitario)
                .setScale(2, RoundingMode.HALF_UP);

        AgendamentoPecaPrevista item = new AgendamentoPecaPrevista();

        item.setAgendamento(agendamento);
        item.setPeca(peca);
        item.setEstoquePeca(estoquePeca);
        item.setFornecedor(fornecedor);

        item.setQuantidade(quantidade);
        item.setUnidadeMedida(limparTextoComDefault(request.getUnidadeMedida(), "UNIDADE"));

        item.setValorUnitario(valorUnitario);
        item.setValorTotal(valorTotal);

        item.setStatusReserva("PREVISTA");
        item.setReservado(false);
        item.setReservadoEm(null);
        item.setLiberadoEm(null);

        item.setObservacoes(limparTextoOpcional(request.getObservacoes()));

        log.info(
                "[AGENDAMENTO-PECAS] Item montado. agendamentoId={}, pecaId={}, estoqueId={}, fornecedorId={}, quantidade={}, valorUnitario={}, valorTotal={}.",
                agendamento.getId(),
                peca.getId(),
                estoquePeca != null ? estoquePeca.getId() : null,
                fornecedor != null ? fornecedor.getId() : null,
                quantidade,
                valorUnitario,
                valorTotal
        );

        return item;
    }

    private EstoquePeca resolverEstoquePeca(
            AgendamentoPecaPrevistaRequest request,
            Peca peca
    ) {
        if (request.getIdEstoquePeca() != null) {
            EstoquePeca estoque = estoquePecaRepository.findById(request.getIdEstoquePeca())
                    .orElseThrow(() -> new IllegalArgumentException(
                            "Estoque da peça prevista não encontrado. ID: " + request.getIdEstoquePeca()
                    ));

            if (estoque.getPeca() != null
                    && estoque.getPeca().getId() != null
                    && !estoque.getPeca().getId().equals(peca.getId())) {
                throw new IllegalArgumentException(
                        "O estoque informado não pertence à peça prevista selecionada."
                );
            }

            return estoque;
        }

        return estoquePecaRepository.findAll()
                .stream()
                .filter(estoque -> estoque.getPeca() != null)
                .filter(estoque -> estoque.getPeca().getId() != null)
                .filter(estoque -> estoque.getPeca().getId().equals(peca.getId()))
                .findFirst()
                .orElse(null);
    }

    private Fornecedor resolverFornecedor(AgendamentoPecaPrevistaRequest request) {
        if (request.getIdFornecedor() == null) {
            return null;
        }

        return fornecedorRepository.findById(request.getIdFornecedor())
                .orElseThrow(() -> new IllegalArgumentException(
                        "Fornecedor da peça prevista não encontrado. ID: " + request.getIdFornecedor()
                ));
    }

    private BigDecimal parseDecimalObrigatorio(String valor, String campo) {
        BigDecimal numero = parseDecimalOpcional(valor, campo);

        if (numero == null || numero.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException(campo + " deve ser maior que zero.");
        }

        return numero;
    }

    private BigDecimal parseDecimalOpcional(String valor, String campo) {
        if (valor == null || valor.trim().isBlank()) {
            return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        }

        try {
            String texto = valor
                    .trim()
                    .replace("R$", "")
                    .replaceAll("\\s", "");

            if (texto.matches("^\\d+\\.\\d{1,4}$")) {
                return new BigDecimal(texto).setScale(2, RoundingMode.HALF_UP);
            }

            if (texto.contains(",")) {
                texto = texto
                        .replace(".", "")
                        .replace(",", ".");
            }

            return new BigDecimal(texto).setScale(2, RoundingMode.HALF_UP);

        } catch (Exception e) {
            throw new IllegalArgumentException(campo + " inválido.");
        }
    }

    private String limparTextoOpcional(String valor) {
        if (valor == null || valor.trim().isBlank()) {
            return null;
        }

        return valor.trim();
    }

    private String limparTextoComDefault(String valor, String padrao) {
        if (valor == null || valor.trim().isBlank()) {
            return padrao;
        }

        return valor.trim();
    }
}