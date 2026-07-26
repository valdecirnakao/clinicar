package com.clinicar.backend.service;

import com.clinicar.backend.dto.AtendimentoPecaRequest;
import com.clinicar.backend.model.*;
import com.clinicar.backend.repository.*;
import jakarta.transaction.Transactional;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

@Service
public class AtendimentoPecaUtilizadaService {

    private final AtendimentoPecaUtilizadaRepository atendimentoPecaRepository;
    private final AtendimentoRepository atendimentoRepository;
    private final PecaRepository pecaRepository;
    private final EstoquePecaRepository estoquePecaRepository;
    private final FornecedorRepository fornecedorRepository;
    private final AtendimentoTotaisService atendimentoTotaisService;

    public AtendimentoPecaUtilizadaService(
            AtendimentoPecaUtilizadaRepository atendimentoPecaRepository,
            AtendimentoRepository atendimentoRepository,
            PecaRepository pecaRepository,
            EstoquePecaRepository estoquePecaRepository,
            FornecedorRepository fornecedorRepository,
            AtendimentoTotaisService atendimentoTotaisService
    ) {
        this.atendimentoPecaRepository = atendimentoPecaRepository;
        this.atendimentoRepository = atendimentoRepository;
        this.pecaRepository = pecaRepository;
        this.estoquePecaRepository = estoquePecaRepository;
        this.fornecedorRepository = fornecedorRepository;
        this.atendimentoTotaisService = atendimentoTotaisService;
    }

    public List<AtendimentoPecaUtilizada> listarPorAtendimento(Long atendimentoId) {
        validarId(atendimentoId, "Atendimento");

        return atendimentoPecaRepository.findByAtendimento_IdOrderByCriadoEmAsc(atendimentoId);
    }

    @Transactional
    public AtendimentoPecaUtilizada adicionar(
            Long atendimentoId,
            AtendimentoPecaRequest request
    ) {
        validarRequest(request);

        Atendimento atendimento = buscarAtendimentoEditavel(atendimentoId);

        Peca peca = pecaRepository
                .findById(validarId(request.getIdPeca(), "Peça"))
                .orElseThrow(() -> new IllegalArgumentException("Peça não encontrada."));

        EstoquePeca estoquePeca = null;

        if (request.getIdEstoquePeca() != null) {
            estoquePeca = estoquePecaRepository
                    .findById(request.getIdEstoquePeca())
                    .orElseThrow(() -> new IllegalArgumentException("Estoque da peça não encontrado."));
        }

        Fornecedor fornecedor = null;

        if (request.getIdFornecedor() != null) {
            fornecedor = fornecedorRepository
                    .findById(request.getIdFornecedor())
                    .orElseThrow(() -> new IllegalArgumentException("Fornecedor não encontrado."));
        }

        AtendimentoPecaUtilizada item = new AtendimentoPecaUtilizada();

        item.setAtendimento(atendimento);
        item.setPeca(peca);
        item.setEstoquePeca(estoquePeca);
        item.setFornecedor(fornecedor);

        preencherDados(item, request);

        AtendimentoPecaUtilizada salvo = atendimentoPecaRepository.save(item);

        atendimentoTotaisService.recalcularTotais(atendimentoId);

        return salvo;
    }

    @Transactional
    public AtendimentoPecaUtilizada atualizar(
            Long atendimentoId,
            Long itemId,
            AtendimentoPecaRequest request
    ) {
        validarRequest(request);

        buscarAtendimentoEditavel(atendimentoId);

        AtendimentoPecaUtilizada item = atendimentoPecaRepository
                .findById(validarId(itemId, "Item de peça"))
                .orElseThrow(() -> new IllegalArgumentException("Item de peça não encontrado."));

        if (!item.getAtendimento().getId().equals(atendimentoId)) {
            throw new IllegalArgumentException("Item de peça não pertence ao atendimento informado.");
        }

        if (request.getIdFornecedor() != null) {
            Fornecedor fornecedor = fornecedorRepository
                    .findById(request.getIdFornecedor())
                    .orElseThrow(() -> new IllegalArgumentException("Fornecedor não encontrado."));

            item.setFornecedor(fornecedor);
        }

        preencherDados(item, request);

        AtendimentoPecaUtilizada salvo = atendimentoPecaRepository.save(item);

        atendimentoTotaisService.recalcularTotais(atendimentoId);

        return salvo;
    }

    @Transactional
    public void remover(Long atendimentoId, Long itemId) {
        buscarAtendimentoEditavel(atendimentoId);

        AtendimentoPecaUtilizada item = atendimentoPecaRepository
                .findById(validarId(itemId, "Item de peça"))
                .orElseThrow(() -> new IllegalArgumentException("Item de peça não encontrado."));

        if (!item.getAtendimento().getId().equals(atendimentoId)) {
            throw new IllegalArgumentException("Item de peça não pertence ao atendimento informado.");
        }

        atendimentoPecaRepository.delete(item);

        atendimentoTotaisService.recalcularTotais(atendimentoId);
    }

    private void preencherDados(
            AtendimentoPecaUtilizada item,
            AtendimentoPecaRequest request
    ) {
        BigDecimal quantidade = parseDecimalObrigatorio(
                request.getQuantidade(),
                "Quantidade"
        );

        if (quantidade.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("A quantidade utilizada deve ser maior que zero.");
        }

        BigDecimal valorUnitario = parseMoedaComDefault(
                request.getValorUnitario(),
                item.getValorUnitario()
        );

        if (valorUnitario.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("O valor unitário não pode ser negativo.");
        }

        item.setQuantidade(quantidade);
        item.setValorUnitario(valorUnitario);
        item.setUnidadeMedida(limparTextoOpcional(request.getUnidadeMedida()));
        item.setObservacoes(limparTextoOpcional(request.getObservacoes()));
    }

    private Atendimento buscarAtendimentoEditavel(Long atendimentoId) {
        Atendimento atendimento = atendimentoRepository
                .findById(validarId(atendimentoId, "Atendimento"))
                .orElseThrow(() -> new IllegalArgumentException("Atendimento não encontrado."));

        if ("CANCELADO".equals(atendimento.getStatusAtendimento())) {
            throw new IllegalArgumentException("Não é possível alterar peças de atendimento cancelado.");
        }

        if ("ENTREGUE".equals(atendimento.getStatusAtendimento())) {
            throw new IllegalArgumentException("Não é possível alterar peças de atendimento entregue.");
        }

        return atendimento;
    }

    private void validarRequest(AtendimentoPecaRequest request) {
        if (request == null) {
            throw new IllegalArgumentException("Dados da peça utilizada não informados.");
        }
    }

    private Long validarId(Long id, String campo) {
        if (id == null || id <= 0) {
            throw new IllegalArgumentException(campo + " é obrigatório.");
        }

        return id;
    }

    private BigDecimal parseDecimalObrigatorio(String valor, String campo) {
        if (valor == null || valor.trim().isBlank()) {
            throw new IllegalArgumentException(campo + " é obrigatório.");
        }

        return parseDecimal(valor, campo);
    }

    private BigDecimal parseMoedaComDefault(
            String valor,
            BigDecimal valorAtual
    ) {
        if (valor == null || valor.trim().isBlank()) {
            return valorAtual == null
                    ? BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP)
                    : valorAtual.setScale(2, RoundingMode.HALF_UP);
        }

        return parseDecimal(valor, "Valor monetário");
    }

    private BigDecimal parseDecimal(String valor, String campo) {
        try {
            String texto = valor
                    .trim()
                    .replace("R$", "")
                    .replaceAll("\\s", "");

            if (texto.matches("^\\d+\\.\\d{1,2}$")) {
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
}