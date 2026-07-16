package com.clinicar.backend.service;

import com.clinicar.backend.dto.ServicoRequest;
import com.clinicar.backend.model.Fornecedor;
import com.clinicar.backend.model.Servico;
import com.clinicar.backend.repository.FornecedorRepository;
import com.clinicar.backend.repository.ServicoRepository;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;

@Service
public class ServicoService {

    private final ServicoRepository servicoRepository;
    private final FornecedorRepository fornecedorRepository;

    public ServicoService(
            ServicoRepository servicoRepository,
            FornecedorRepository fornecedorRepository
    ) {
        this.servicoRepository = servicoRepository;
        this.fornecedorRepository = fornecedorRepository;
    }

    public Servico criar(ServicoRequest request) {
        validarRequest(request);

        String nome = limparTextoObrigatorio(request.getNome(), "Nome");
        String categoria = limparTextoObrigatorio(request.getCategoria(), "Categoria");

        if (servicoRepository.existsByNomeIgnoreCaseAndCategoriaIgnoreCase(nome, categoria)) {
            throw new IllegalArgumentException(
                    "Já existe um serviço cadastrado com este nome nesta categoria."
            );
        }

        Servico servico = new Servico();

        preencherDados(servico, request);

        return servicoRepository.save(servico);
    }

    public Servico atualizar(Long id, ServicoRequest request) {
        if (id == null) {
            throw new IllegalArgumentException("ID do serviço não informado.");
        }

        validarRequest(request);

        Servico servico = servicoRepository
                .findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Serviço não encontrado."));

        String nome = limparTextoObrigatorio(request.getNome(), "Nome");
        String categoria = limparTextoObrigatorio(request.getCategoria(), "Categoria");

        servicoRepository
                .findByNomeIgnoreCaseAndCategoriaIgnoreCase(nome, categoria)
                .ifPresent(servicoEncontrado -> {
                    if (!servicoEncontrado.getId().equals(id)) {
                        throw new IllegalArgumentException(
                                "Já existe outro serviço cadastrado com este nome nesta categoria."
                        );
                    }
                });

        preencherDados(servico, request);

        return servicoRepository.save(servico);
    }

    public List<Servico> listarTodos() {
        return servicoRepository.findAll();
    }

    public List<Servico> listarAtivos() {
        return servicoRepository.findByAtivoTrue();
    }

    public Servico buscarPorId(Long id) {
        return servicoRepository
                .findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Serviço não encontrado."));
    }

    public void inativar(Long id) {
        Servico servico = buscarPorId(id);

        servico.setAtivo(false);

        servicoRepository.save(servico);
    }

    public void ativar(Long id) {
        Servico servico = buscarPorId(id);

        servico.setAtivo(true);

        servicoRepository.save(servico);
    }

    private void preencherDados(Servico servico, ServicoRequest request) {
        BigDecimal duracaoEstimada = parseBigDecimalObrigatorio(
                request.getDuracaoEstimada(),
                "Duração estimada"
        );

        BigDecimal valorBase = parseBigDecimalObrigatorio(
                request.getValorBase(),
                "Valor base"
        );

        if (duracaoEstimada.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("A duração estimada deve ser maior que zero.");
        }

        if (valorBase.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("O valor base não pode ser negativo.");
        }

        Integer garantiaDias = request.getGarantiaDias() == null
                ? 0
                : request.getGarantiaDias();

        if (garantiaDias < 0) {
            throw new IllegalArgumentException("A garantia em dias não pode ser negativa.");
        }

        Fornecedor fornecedor = null;

        if (request.getIdFornecedor() != null) {
            fornecedor = fornecedorRepository
                    .findById(request.getIdFornecedor())
                    .orElseThrow(() -> new IllegalArgumentException("Fornecedor não encontrado."));
        }

        servico.setNome(limparTextoObrigatorio(request.getNome(), "Nome"));
        servico.setDescricao(limparTextoOpcional(request.getDescricao()));
        servico.setCategoria(limparTextoObrigatorio(request.getCategoria(), "Categoria"));

        servico.setTipoDoPrestador(
                limparTextoObrigatorio(request.getTipoDoPrestador(), "Tipo do prestador")
        );

        servico.setDuracaoEstimada(duracaoEstimada);

        servico.setUnidadeDuracao(
                limparTextoObrigatorio(request.getUnidadeDuracao(), "Unidade de duração")
                        .toUpperCase()
        );

        servico.setValorBase(valorBase);

        servico.setUnidadeCobranca(
                limparTextoObrigatorio(request.getUnidadeCobranca(), "Unidade de cobrança")
                        .toUpperCase()
        );

        servico.setGarantiaDias(garantiaDias);

        servico.setNecessitaPecas(
                request.getNecessitaPecas() == null
                        ? false
                        : request.getNecessitaPecas()
        );

        servico.setAtivo(
                request.getAtivo() == null
                        ? true
                        : request.getAtivo()
        );

        servico.setObservacoes(limparTextoOpcional(request.getObservacoes()));

        servico.setFornecedor(fornecedor);
    }

    private void validarRequest(ServicoRequest request) {
        if (request == null) {
            throw new IllegalArgumentException("Dados do serviço não informados.");
        }
    }

    private String limparTextoObrigatorio(String valor, String nomeCampo) {
        if (valor == null || valor.trim().isBlank()) {
            throw new IllegalArgumentException(nomeCampo + " é obrigatório.");
        }

        return valor.trim();
    }

    private String limparTextoOpcional(String valor) {
        if (valor == null || valor.trim().isBlank()) {
            return null;
        }

        return valor.trim();
    }

    private BigDecimal parseBigDecimalObrigatorio(String valor, String nomeCampo) {
        if (valor == null || valor.trim().isBlank()) {
            throw new IllegalArgumentException(nomeCampo + " é obrigatório.");
        }

        try {
            String texto = valor
                    .trim()
                    .replace("R$", "")
                    .replaceAll("\\s", "");

            /*
             * Caso 1:
             * Valor vindo como decimal do backend ou do input:
             * 46.50
             * 80.00
             */
            if (texto.matches("^\\d+\\.\\d{1,2}$")) {
                return new BigDecimal(texto);
            }

            /*
             * Caso 2:
             * Valor em formato brasileiro:
             * 46,50
             * 1.234,56
             */
            if (texto.contains(",")) {
                texto = texto
                        .replace(".", "")
                        .replace(",", ".");

                return new BigDecimal(texto);
            }

            /*
             * Caso 3:
             * Valor inteiro:
             * 80
             */
            return new BigDecimal(texto);

        } catch (Exception e) {
            throw new IllegalArgumentException(nomeCampo + " inválido.");
        }
    }
}