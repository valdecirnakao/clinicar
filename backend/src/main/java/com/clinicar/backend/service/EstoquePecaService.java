package com.clinicar.backend.service;

import com.clinicar.backend.dto.EstoquePecaRequest;
import com.clinicar.backend.dto.MovimentacaoEstoquePecaRequest;
import com.clinicar.backend.model.EstoquePeca;
import com.clinicar.backend.model.LocalEstoque;
import com.clinicar.backend.model.MovimentacaoEstoquePeca;
import com.clinicar.backend.model.Peca;
import com.clinicar.backend.repository.EstoquePecaRepository;
import com.clinicar.backend.repository.LocalEstoqueRepository;
import com.clinicar.backend.repository.MovimentacaoEstoquePecaRepository;
import com.clinicar.backend.repository.PecaRepository;
import jakarta.transaction.Transactional;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

@Service
public class EstoquePecaService {

    private final EstoquePecaRepository estoqueRepository;
    private final PecaRepository pecaRepository;
    private final LocalEstoqueRepository localEstoqueRepository;
    private final MovimentacaoEstoquePecaRepository movimentacaoRepository;
    private final AlertaEstoquePecaService alertaEstoqueService;

    public EstoquePecaService(
            EstoquePecaRepository estoqueRepository,
            PecaRepository pecaRepository,
            LocalEstoqueRepository localEstoqueRepository,
            MovimentacaoEstoquePecaRepository movimentacaoRepository,
            AlertaEstoquePecaService alertaEstoqueService
    ) {
        this.estoqueRepository = estoqueRepository;
        this.pecaRepository = pecaRepository;
        this.localEstoqueRepository = localEstoqueRepository;
        this.movimentacaoRepository = movimentacaoRepository;
        this.alertaEstoqueService = alertaEstoqueService;
    }

    public EstoquePeca criar(EstoquePecaRequest request) {
        validarRequest(request);

        Long idPeca = validarIdObrigatorio(request.getIdPeca(), "Peça");
        Long idLocal = validarIdObrigatorio(request.getIdLocalEstoque(), "Local de estoque");

        estoqueRepository.findByPeca_IdAndLocalEstoque_Id(idPeca, idLocal).ifPresent(e -> {
            throw new IllegalArgumentException(
                    "Já existe controle de estoque para esta peça neste local."
            );
        });

        Peca peca = pecaRepository
                .findById(idPeca)
                .orElseThrow(() -> new IllegalArgumentException("Peça não encontrada."));

        LocalEstoque local = localEstoqueRepository
                .findById(idLocal)
                .orElseThrow(() -> new IllegalArgumentException("Local de estoque não encontrado."));

        EstoquePeca estoque = new EstoquePeca();

        estoque.setPeca(peca);
        estoque.setLocalEstoque(local);

        preencherDadosConfiguracaoEstoque(estoque, request);
        recalcularStatusEstoque(estoque);

        EstoquePeca salvo = estoqueRepository.save(estoque);

        alertaEstoqueService.verificarEGerarAlertaSeNecessario(salvo);

        return salvo;
    }

    public EstoquePeca atualizar(Long id, EstoquePecaRequest request) {
        validarRequest(request);

        EstoquePeca estoque = buscarPorId(id);

        preencherDadosConfiguracaoEstoque(estoque, request);
        recalcularStatusEstoque(estoque);

        EstoquePeca salvo = estoqueRepository.save(estoque);

        alertaEstoqueService.verificarEGerarAlertaSeNecessario(salvo);

        return salvo;
    }

    public List<EstoquePeca> listarTodos() {
        return estoqueRepository.findAll();
    }

    public List<EstoquePeca> listarAtivos() {
        return estoqueRepository.findByAtivoTrue();
    }

    public List<EstoquePeca> listarCriticos() {
        return estoqueRepository.findByStatusEstoqueIn(
                List.of("ATENCAO", "CRITICO", "ZERADO")
        );
    }

    public EstoquePeca buscarPorId(Long id) {
        if (id == null) {
            throw new IllegalArgumentException("ID do estoque não informado.");
        }

        return estoqueRepository
                .findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Estoque da peça não encontrado."));
    }

    public List<MovimentacaoEstoquePeca> listarMovimentacoes(Long estoqueId) {
        if (estoqueId == null) {
            throw new IllegalArgumentException("ID do estoque não informado.");
        }

        return movimentacaoRepository.findByEstoquePeca_IdOrderByCriadoEmDesc(estoqueId);
    }

    @Transactional
    public EstoquePeca registrarEntrada(Long estoqueId, MovimentacaoEstoquePecaRequest request) {
        return movimentar(estoqueId, request, "ENTRADA");
    }

    @Transactional
    public EstoquePeca registrarSaida(Long estoqueId, MovimentacaoEstoquePecaRequest request) {
        return movimentar(estoqueId, request, "SAIDA");
    }

    @Transactional
    public EstoquePeca registrarAjuste(Long estoqueId, MovimentacaoEstoquePecaRequest request) {
        if (request == null || request.getTipoMovimento() == null) {
            throw new IllegalArgumentException("Tipo de ajuste não informado.");
        }

        String tipo = request.getTipoMovimento().trim().toUpperCase();

        if (!"AJUSTE_ENTRADA".equals(tipo) && !"AJUSTE_SAIDA".equals(tipo)) {
            throw new IllegalArgumentException(
                    "Tipo de ajuste inválido. Use AJUSTE_ENTRADA ou AJUSTE_SAIDA."
            );
        }

        return movimentar(estoqueId, request, tipo);
    }

    private EstoquePeca movimentar(
            Long estoqueId,
            MovimentacaoEstoquePecaRequest request,
            String tipoMovimento
    ) {
        if (request == null) {
            throw new IllegalArgumentException("Dados da movimentação não informados.");
        }

        EstoquePeca estoque = estoqueRepository
                .buscarComLockPorId(estoqueId)
                .orElseThrow(() -> new IllegalArgumentException("Estoque da peça não encontrado."));

        BigDecimal quantidade = parseQuantidadeObrigatoria(
                request.getQuantidade(),
                "Quantidade"
        );

        if (quantidade.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("A quantidade deve ser maior que zero.");
        }

        BigDecimal saldoAnterior = estoque.getQuantidadeAtual();
        BigDecimal saldoPosterior;

        if ("ENTRADA".equals(tipoMovimento) || "AJUSTE_ENTRADA".equals(tipoMovimento)) {
            saldoPosterior = saldoAnterior.add(quantidade);
        } else {
            if (saldoAnterior.compareTo(quantidade) < 0) {
                throw new IllegalArgumentException("Saldo insuficiente em estoque.");
            }

            saldoPosterior = saldoAnterior.subtract(quantidade);
        }

        BigDecimal valorUnitario = parseMoedaOpcional(request.getValorUnitario());

        estoque.setQuantidadeAtual(saldoPosterior);

        if ("ENTRADA".equals(tipoMovimento) && valorUnitario != null) {
            atualizarCustoMedio(estoque, saldoAnterior, quantidade, valorUnitario);
        }

        recalcularStatusEstoque(estoque);

        EstoquePeca salvo = estoqueRepository.save(estoque);

        registrarMovimentacao(
                salvo,
                tipoMovimento,
                quantidade,
                saldoAnterior,
                saldoPosterior,
                valorUnitario,
                request
        );

        alertaEstoqueService.verificarEGerarAlertaSeNecessario(salvo);

        return salvo;
    }

    private void registrarMovimentacao(
            EstoquePeca estoque,
            String tipoMovimento,
            BigDecimal quantidade,
            BigDecimal saldoAnterior,
            BigDecimal saldoPosterior,
            BigDecimal valorUnitario,
            MovimentacaoEstoquePecaRequest request
    ) {
        MovimentacaoEstoquePeca mov = new MovimentacaoEstoquePeca();

        mov.setEstoquePeca(estoque);
        mov.setPeca(estoque.getPeca());
        mov.setTipoMovimento(tipoMovimento);
        mov.setQuantidade(quantidade);
        mov.setSaldoAnterior(saldoAnterior);
        mov.setSaldoPosterior(saldoPosterior);

        mov.setValorUnitario(valorUnitario);

        if (valorUnitario != null) {
            mov.setValorTotal(valorUnitario.multiply(quantidade).setScale(2, RoundingMode.HALF_UP));
        }

        mov.setOrigem(limparTextoOpcional(request.getOrigem()));
        mov.setDocumentoReferencia(limparTextoOpcional(request.getDocumentoReferencia()));
        mov.setMotivo(limparTextoOpcional(request.getMotivo()));
        mov.setObservacoes(limparTextoOpcional(request.getObservacoes()));
        mov.setIdUsuario(request.getIdUsuario());

        movimentacaoRepository.save(mov);
    }

    private void preencherDadosConfiguracaoEstoque(
            EstoquePeca estoque,
            EstoquePecaRequest request
    ) {
        estoque.setQuantidadeAtual(
                parseQuantidadeComDefault(request.getQuantidadeAtual(), estoque.getQuantidadeAtual())
        );

        estoque.setQuantidadeReservada(
                parseQuantidadeComDefault(request.getQuantidadeReservada(), estoque.getQuantidadeReservada())
        );

        estoque.setEstoqueMinimo(
                parseQuantidadeComDefault(request.getEstoqueMinimo(), BigDecimal.ZERO)
        );

        estoque.setEstoqueCritico(
                parseQuantidadeComDefault(request.getEstoqueCritico(), BigDecimal.ZERO)
        );

        estoque.setEstoqueMaximo(parseQuantidadeOpcional(request.getEstoqueMaximo()));
        estoque.setPontoReposicao(parseQuantidadeOpcional(request.getPontoReposicao()));
        estoque.setQuantidadeReposicaoSugerida(
                parseQuantidadeOpcional(request.getQuantidadeReposicaoSugerida())
        );

        estoque.setCustoMedio(parseMoedaOpcional(request.getCustoMedio()));
        estoque.setLocalizacaoFisica(limparTextoOpcional(request.getLocalizacaoFisica()));
        estoque.setAtivo(request.getAtivo() == null ? true : request.getAtivo());

        validarLimitesEstoque(estoque);
    }

    private void recalcularStatusEstoque(EstoquePeca estoque) {
        BigDecimal atual = estoque.getQuantidadeAtual() == null
                ? BigDecimal.ZERO
                : estoque.getQuantidadeAtual();

        BigDecimal minimo = estoque.getEstoqueMinimo() == null
                ? BigDecimal.ZERO
                : estoque.getEstoqueMinimo();

        BigDecimal critico = estoque.getEstoqueCritico() == null
                ? BigDecimal.ZERO
                : estoque.getEstoqueCritico();

        if (atual.compareTo(BigDecimal.ZERO) <= 0) {
            estoque.setStatusEstoque("ZERADO");
        } else if (atual.compareTo(critico) <= 0) {
            estoque.setStatusEstoque("CRITICO");
        } else if (atual.compareTo(minimo) <= 0) {
            estoque.setStatusEstoque("ATENCAO");
        } else {
            estoque.setStatusEstoque("NORMAL");
        }
    }

    private void atualizarCustoMedio(
            EstoquePeca estoque,
            BigDecimal saldoAnterior,
            BigDecimal quantidadeEntrada,
            BigDecimal valorUnitarioEntrada
    ) {
        BigDecimal custoAtual = estoque.getCustoMedio();

        if (custoAtual == null || saldoAnterior.compareTo(BigDecimal.ZERO) <= 0) {
            estoque.setCustoMedio(valorUnitarioEntrada.setScale(2, RoundingMode.HALF_UP));
            return;
        }

        BigDecimal valorEstoqueAnterior = saldoAnterior.multiply(custoAtual);
        BigDecimal valorEntrada = quantidadeEntrada.multiply(valorUnitarioEntrada);
        BigDecimal novaQuantidade = saldoAnterior.add(quantidadeEntrada);

        BigDecimal novoCustoMedio = valorEstoqueAnterior
                .add(valorEntrada)
                .divide(novaQuantidade, 2, RoundingMode.HALF_UP);

        estoque.setCustoMedio(novoCustoMedio);
    }

    private void validarLimitesEstoque(EstoquePeca estoque) {
        if (estoque.getQuantidadeAtual().compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("A quantidade atual não pode ser negativa.");
        }

        if (estoque.getQuantidadeReservada().compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("A quantidade reservada não pode ser negativa.");
        }

        if (estoque.getEstoqueMinimo().compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("O estoque mínimo não pode ser negativo.");
        }

        if (estoque.getEstoqueCritico().compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("O estoque crítico não pode ser negativo.");
        }

        if (estoque.getEstoqueCritico().compareTo(estoque.getEstoqueMinimo()) > 0) {
            throw new IllegalArgumentException(
                    "O estoque crítico não pode ser maior que o estoque mínimo."
            );
        }

        if (estoque.getEstoqueMaximo() != null
                && estoque.getEstoqueMaximo().compareTo(estoque.getEstoqueMinimo()) < 0) {
            throw new IllegalArgumentException(
                    "O estoque máximo não pode ser menor que o estoque mínimo."
            );
        }
    }

    private void validarRequest(EstoquePecaRequest request) {
        if (request == null) {
            throw new IllegalArgumentException("Dados do estoque não informados.");
        }
    }

    private Long validarIdObrigatorio(Long id, String campo) {
        if (id == null || id <= 0) {
            throw new IllegalArgumentException(campo + " é obrigatório.");
        }

        return id;
    }

    private BigDecimal parseQuantidadeObrigatoria(String valor, String campo) {
        if (valor == null || valor.trim().isBlank()) {
            throw new IllegalArgumentException(campo + " é obrigatória.");
        }

        BigDecimal numero = parseDecimal(valor, campo);

        return numero.setScale(3, RoundingMode.HALF_UP);
    }

    private BigDecimal parseQuantidadeComDefault(String valor, BigDecimal padrao) {
        if (valor == null || valor.trim().isBlank()) {
            return padrao == null ? BigDecimal.ZERO : padrao;
        }

        return parseDecimal(valor, "Quantidade").setScale(3, RoundingMode.HALF_UP);
    }

    private BigDecimal parseQuantidadeOpcional(String valor) {
        if (valor == null || valor.trim().isBlank()) {
            return null;
        }

        return parseDecimal(valor, "Quantidade").setScale(3, RoundingMode.HALF_UP);
    }

    private BigDecimal parseMoedaOpcional(String valor) {
        if (valor == null || valor.trim().isBlank()) {
            return null;
        }

        return parseDecimal(valor, "Valor").setScale(2, RoundingMode.HALF_UP);
    }

    private BigDecimal parseDecimal(String valor, String campo) {
        try {
            String texto = valor
                    .trim()
                    .replace("R$", "")
                    .replaceAll("\\s", "");

            if (texto.matches("^\\d+\\.\\d{1,3}$")) {
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