package com.clinicar.backend.service;

import com.clinicar.backend.dto.FornecimentoServicoRequest;
import com.clinicar.backend.model.Fornecedor;
import com.clinicar.backend.model.FornecimentoServico;
import com.clinicar.backend.model.Servico;
import com.clinicar.backend.repository.FornecedorRepository;
import com.clinicar.backend.repository.FornecimentoServicoRepository;
import com.clinicar.backend.repository.ServicoRepository;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.List;

@Service
public class FornecimentoServicoService {

    private final FornecimentoServicoRepository fornecimentoServicoRepository;
    private final FornecedorRepository fornecedorRepository;
    private final ServicoRepository servicoRepository;

    public FornecimentoServicoService(
            FornecimentoServicoRepository fornecimentoServicoRepository,
            FornecedorRepository fornecedorRepository,
            ServicoRepository servicoRepository
    ) {
        this.fornecimentoServicoRepository = fornecimentoServicoRepository;
        this.fornecedorRepository = fornecedorRepository;
        this.servicoRepository = servicoRepository;
    }

    public FornecimentoServico criar(FornecimentoServicoRequest request) {
        validarRequest(request);

        Long idFornecedor = validarIdObrigatorio(
                request.getIdFornecedor(),
                "Fornecedor"
        );

        Long idServico = validarIdObrigatorio(
                request.getIdServico(),
                "Serviço"
        );

        fornecimentoServicoRepository
                .findByFornecedor_IdAndServico_Id(idFornecedor, idServico)
                .ifPresent(item -> {
                    throw new IllegalArgumentException(
                            "Já existe um fornecimento cadastrado para este fornecedor e serviço."
                    );
                });

        FornecimentoServico fornecimento = new FornecimentoServico();

        preencherDados(fornecimento, request);

        return fornecimentoServicoRepository.save(fornecimento);
    }

    public FornecimentoServico atualizar(Long id, FornecimentoServicoRequest request) {
        if (id == null) {
            throw new IllegalArgumentException("ID do fornecimento de serviço não informado.");
        }

        validarRequest(request);

        FornecimentoServico fornecimento = buscarPorId(id);

        Long idFornecedor = validarIdObrigatorio(
                request.getIdFornecedor(),
                "Fornecedor"
        );

        Long idServico = validarIdObrigatorio(
                request.getIdServico(),
                "Serviço"
        );

        fornecimentoServicoRepository
                .findByFornecedor_IdAndServico_Id(idFornecedor, idServico)
                .ifPresent(itemEncontrado -> {
                    if (!itemEncontrado.getId().equals(id)) {
                        throw new IllegalArgumentException(
                                "Já existe outro fornecimento cadastrado para este fornecedor e serviço."
                        );
                    }
                });

        preencherDados(fornecimento, request);

        return fornecimentoServicoRepository.save(fornecimento);
    }

    public List<FornecimentoServico> listarTodos() {
        return fornecimentoServicoRepository.findAll();
    }

    public List<FornecimentoServico> listarAtivos() {
        return fornecimentoServicoRepository.findByAtivoTrue();
    }

    public List<FornecimentoServico> listarPorFornecedor(Long fornecedorId) {
        if (fornecedorId == null) {
            throw new IllegalArgumentException("ID do fornecedor não informado.");
        }

        return fornecimentoServicoRepository.findByFornecedor_Id(fornecedorId);
    }

    public List<FornecimentoServico> listarPorServico(Long servicoId) {
        if (servicoId == null) {
            throw new IllegalArgumentException("ID do serviço não informado.");
        }

        return fornecimentoServicoRepository.findByServico_Id(servicoId);
    }

    public FornecimentoServico buscarPorId(Long id) {
        if (id == null) {
            throw new IllegalArgumentException("ID do fornecimento de serviço não informado.");
        }

        return fornecimentoServicoRepository
                .findById(id)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Fornecimento de serviço não encontrado."
                ));
    }

    public void ativar(Long id) {
        FornecimentoServico fornecimento = buscarPorId(id);

        fornecimento.setAtivo(true);

        fornecimentoServicoRepository.save(fornecimento);
    }

    public void inativar(Long id) {
        FornecimentoServico fornecimento = buscarPorId(id);

        fornecimento.setAtivo(false);

        fornecimentoServicoRepository.save(fornecimento);
    }

    private void preencherDados(
            FornecimentoServico fornecimento,
            FornecimentoServicoRequest request
    ) {
        Fornecedor fornecedor = fornecedorRepository
                .findById(request.getIdFornecedor())
                .orElseThrow(() -> new IllegalArgumentException("Fornecedor não encontrado."));

        Servico servico = servicoRepository
                .findById(request.getIdServico())
                .orElseThrow(() -> new IllegalArgumentException("Serviço não encontrado."));

        BigDecimal valorCusto = parseBigDecimalObrigatorio(
                request.getValorCusto(),
                "Valor de custo"
        );

        if (valorCusto.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("O valor de custo não pode ser negativo.");
        }

        BigDecimal prazoExecucao = parseBigDecimalObrigatorio(
                request.getPrazoExecucao(),
                "Prazo de execução"
        );

        if (prazoExecucao.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("O prazo de execução deve ser maior que zero.");
        }

        Integer quantidadeMinima = request.getQuantidadeMinima() == null
                ? 1
                : request.getQuantidadeMinima();

        if (quantidadeMinima < 1) {
            throw new IllegalArgumentException("A quantidade mínima deve ser maior ou igual a 1.");
        }

        LocalDate dataInicio = parseDataOpcional(request.getDataInicioVigencia());
        LocalDate dataFim = parseDataOpcional(request.getDataFimVigencia());

        if (dataInicio != null && dataFim != null && dataFim.isBefore(dataInicio)) {
            throw new IllegalArgumentException(
                    "A data fim de vigência não pode ser anterior à data de início."
            );
        }

        fornecimento.setFornecedor(fornecedor);
        fornecimento.setServico(servico);

        fornecimento.setValorCusto(valorCusto);

        fornecimento.setUnidadeCobranca(
                limparTextoObrigatorio(
                        request.getUnidadeCobranca(),
                        "Unidade de cobrança"
                ).toUpperCase()
        );

        fornecimento.setPrazoExecucao(prazoExecucao);

        fornecimento.setUnidadePrazo(
                limparTextoObrigatorio(
                        request.getUnidadePrazo(),
                        "Unidade do prazo"
                ).toUpperCase()
        );

        fornecimento.setQuantidadeMinima(quantidadeMinima);

        fornecimento.setDisponibilidade(
                limparTextoComDefault(
                        request.getDisponibilidade(),
                        "SOB_DEMANDA"
                ).toUpperCase()
        );

        fornecimento.setContratoReferencia(
                limparTextoOpcional(request.getContratoReferencia())
        );

        fornecimento.setDataInicioVigencia(dataInicio);
        fornecimento.setDataFimVigencia(dataFim);

        fornecimento.setAtivo(
                request.getAtivo() == null
                        ? true
                        : request.getAtivo()
        );

        fornecimento.setObservacoes(
                limparTextoOpcional(request.getObservacoes())
        );
    }

    private void validarRequest(FornecimentoServicoRequest request) {
        if (request == null) {
            throw new IllegalArgumentException("Dados do fornecimento de serviço não informados.");
        }
    }

    private Long validarIdObrigatorio(Long id, String nomeCampo) {
        if (id == null || id <= 0) {
            throw new IllegalArgumentException(nomeCampo + " é obrigatório.");
        }

        return id;
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

    private String limparTextoComDefault(String valor, String valorPadrao) {
        if (valor == null || valor.trim().isBlank()) {
            return valorPadrao;
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

            if (texto.matches("^\\d+\\.\\d{1,2}$")) {
                return new BigDecimal(texto);
            }

            if (texto.contains(",")) {
                texto = texto
                        .replace(".", "")
                        .replace(",", ".");

                return new BigDecimal(texto);
            }

            return new BigDecimal(texto);

        } catch (Exception e) {
            throw new IllegalArgumentException(nomeCampo + " inválido.");
        }
    }

    private LocalDate parseDataOpcional(String valor) {
        if (valor == null || valor.trim().isBlank()) {
            return null;
        }

        String texto = valor.trim();

        try {
            return LocalDate.parse(texto);
        } catch (DateTimeParseException ignored) {
        }

        try {
            DateTimeFormatter formatoBr = DateTimeFormatter.ofPattern("dd/MM/yyyy");
            return LocalDate.parse(texto, formatoBr);
        } catch (DateTimeParseException e) {
            throw new IllegalArgumentException("Data inválida: " + valor);
        }
    }
}