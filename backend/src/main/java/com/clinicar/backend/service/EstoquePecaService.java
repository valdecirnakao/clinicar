package com.clinicar.backend.service;

import com.clinicar.backend.dto.EstoquePecaRequest;
import com.clinicar.backend.dto.MovimentacaoEstoquePecaRequest;
import com.clinicar.backend.model.EstoquePeca;
import com.clinicar.backend.model.Atendimento;
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
import java.util.Locale;
import java.util.Set;

@Service
public class EstoquePecaService {
    @org.springframework.beans.factory.annotation.Autowired(required=false)
    private VersaoEstoqueService versaoEstoque;
    @org.springframework.transaction.annotation.Transactional(readOnly=true)
    public List<EstoquePeca> listarDaPeca(Long pecaId) {
        return estoqueRepository.findByPeca_Id(pecaId);
    }

    private final com.clinicar.backend.repository.FornecedorRepository fornecedorRepository;
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
            AlertaEstoquePecaService alertaEstoqueService,
            com.clinicar.backend.repository.FornecedorRepository fornecedorRepository
    ) {
        this.fornecedorRepository = fornecedorRepository;
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

    @Transactional
    public EstoquePeca atualizar(Long id, EstoquePecaRequest request) {
        validarRequest(request);

        if(versaoEstoque!=null)versaoEstoque.registrarAlteracao(id);
        EstoquePeca estoque = estoqueRepository.buscarComLockPorId(id)
                .orElseThrow(()->new IllegalArgumentException("Controle de estoque não encontrado."));

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

    @Transactional
    public EstoquePeca registrarDevolucaoAtendimento(Long estoqueId, MovimentacaoEstoquePecaRequest request, Atendimento atendimento) {
        if (request == null) throw new IllegalArgumentException("Dados da devolução não informados.");
        if (atendimento == null || atendimento.getId() == null || !Boolean.TRUE.equals(atendimento.getEstoqueBaixado())
                || !("CONCLUIDO".equals(atendimento.getStatusAtendimento()) || "ENTREGUE".equals(atendimento.getStatusAtendimento()))) {
            throw new IllegalArgumentException("A devolução exige um atendimento concluído ou entregue com baixa de estoque realizada.");
        }
        request.setOrigem("DEVOLUCAO_NAO_UTILIZADA");
        if (limparTextoOpcional(request.getMotivo()) == null) throw new IllegalArgumentException("Informe o motivo da devolução do atendimento.");
        if (!Set.of("SEM_RESTITUICAO", "RESTITUICAO_PENDENTE").contains(request.getTratamentoCobranca() == null ? "" : request.getTratamentoCobranca())) {
            throw new IllegalArgumentException("Informe o tratamento da cobrança na devolução.");
        }
        return movimentar(estoqueId, request, "ENTRADA", atendimento);
    }

    private EstoquePeca movimentar(Long estoqueId, MovimentacaoEstoquePecaRequest request, String tipoMovimento) {
        return movimentar(estoqueId, request, tipoMovimento, null);
    }

    private EstoquePeca movimentar(
            Long estoqueId,
            MovimentacaoEstoquePecaRequest request,
            String tipoMovimento, Atendimento atendimentoDevolucao
    ) {
        if (request == null) {
            throw new IllegalArgumentException("Dados da movimentação não informados.");
        }

        validarOrigemMovimentacao(request, tipoMovimento);
        if(versaoEstoque!=null)versaoEstoque.registrarAlteracao(estoqueId);
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
            if (saldoAnterior.subtract(estoque.getQuantidadeReservada() == null ? BigDecimal.ZERO : estoque.getQuantidadeReservada()).compareTo(quantidade) < 0) {
                throw new IllegalArgumentException("Saldo disponível insuficiente em estoque; peças reservadas não podem ser retiradas manualmente.");
            }

            saldoPosterior = saldoAnterior.subtract(quantidade);
        }

        BigDecimal valorUnitario = resolverCustoMovimentacao(estoque, request, tipoMovimento, quantidade, atendimentoDevolucao);

        validarFornecedorMovimentacao(estoque, request, tipoMovimento, quantidade);
        estoque.setQuantidadeAtual(saldoPosterior);

        if ("ENTRADA".equals(tipoMovimento) && valorUnitario != null) {
            atualizarCustoMedio(estoque, saldoAnterior, quantidade, valorUnitario);
        } else if ("AJUSTE_ENTRADA".equals(tipoMovimento) && estoque.getCustoMedio() == null) {
            estoque.setCustoMedio(valorUnitario);
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
                request, atendimentoDevolucao
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
            MovimentacaoEstoquePecaRequest request, Atendimento atendimentoDevolucao
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

        mov.setOrigem(request.getOrigem().trim().toUpperCase(Locale.ROOT));
        mov.setIdMovimentacaoOrigem(request.getIdMovimentacaoOrigem());
        if (request.getIdFornecedor() != null) {
            var fornecedor = fornecedorRepository.findById(request.getIdFornecedor()).orElseThrow();
            mov.setIdFornecedor(fornecedor.getId()); mov.setNomeFornecedor(fornecedor.getRazaoSocial());
        }
        mov.setDocumentoReferencia(limparTextoOpcional(request.getDocumentoReferencia()));
        mov.setMotivo(limparTextoOpcional(request.getMotivo()));
        mov.setObservacoes(limparTextoOpcional(request.getObservacoes()));
        mov.setCustoUnitarioEstoque(valorUnitario);
        com.clinicar.backend.util.AutorMovimentacao.registrar(mov);
        if (atendimentoDevolucao != null) {
            mov.setIdAtendimento(atendimentoDevolucao.getId());
            mov.setDocumentoReferencia(atendimentoDevolucao.getCodigoAtendimento());
            mov.setTratamentoCobranca(request.getTratamentoCobranca());
            mov.setValorRestituicao("RESTITUICAO_PENDENTE".equals(request.getTratamentoCobranca())
                    ? parseMoedaOpcional(request.getValorRestituicao()) : BigDecimal.ZERO);
        }

        movimentacaoRepository.save(mov);
    }

    private BigDecimal resolverCustoMovimentacao(EstoquePeca estoque, MovimentacaoEstoquePecaRequest request,
                                               String tipo, BigDecimal quantidade, Atendimento atendimentoDevolucao) {
        String origem = request.getOrigem().trim().toUpperCase(Locale.ROOT);
        boolean devolucao = "ENTRADA".equals(tipo) && "DEVOLUCAO_NAO_UTILIZADA".equals(origem);
        if (devolucao && request.getIdMovimentacaoOrigem() == null) {
            throw new IllegalArgumentException("Selecione a saída original da peça devolvida. Sem uma saída identificada, utilize ajuste de inventário com justificativa.");
        }
        boolean correcao = tipo.startsWith("AJUSTE") && "CORRECAO_LANCAMENTO".equals(origem);
        if (correcao) validarCorrecao(estoque, request, tipo, quantidade);
        boolean devolucaoFornecedor = "SAIDA".equals(tipo) && "DEVOLUCAO_FORNECEDOR".equals(origem);
        if (request.getIdMovimentacaoOrigem() != null && !correcao && !devolucaoFornecedor) {
            if (!devolucao) throw new IllegalArgumentException("O vínculo com uma movimentação original só é permitido na devolução de peça não utilizada ou na correção de lançamento.");
            var saida = movimentacaoRepository.findById(request.getIdMovimentacaoOrigem())
                    .orElseThrow(() -> new IllegalArgumentException("Movimentação de saída original não encontrada."));
            if (saida.getEstoquePeca() == null || !estoque.getId().equals(saida.getEstoquePeca().getId())
                    || !"SAIDA".equals(saida.getTipoMovimento()) || "DEVOLUCAO_FORNECEDOR".equals(saida.getOrigem()) || ("ATENDIMENTO".equals(saida.getOrigem()) && atendimentoDevolucao == null)) {
                throw new IllegalArgumentException("Selecione uma saída manual deste estoque. Movimentações de atendimento são tratadas pelo sistema.");
            }
            if (atendimentoDevolucao != null) {
                boolean mesmoAtendimento = atendimentoDevolucao.getId().equals(saida.getIdAtendimento())
                        || (saida.getIdAtendimento() == null && atendimentoDevolucao.getCodigoAtendimento() != null
                        && atendimentoDevolucao.getCodigoAtendimento().equals(saida.getDocumentoReferencia()));
                if (!"ATENDIMENTO".equals(saida.getOrigem()) || !mesmoAtendimento) {
                    throw new IllegalArgumentException("A saída selecionada não pertence a este atendimento.");
                }
                if ("RESTITUICAO_PENDENTE".equals(request.getTratamentoCobranca())) {
                    BigDecimal valor = parseMoedaOpcional(request.getValorRestituicao());
                    if (valor == null || valor.signum() <= 0) throw new IllegalArgumentException("Informe um valor positivo a restituir ao cliente.");
                    if (saida.getValorUnitario() != null && valor.compareTo(saida.getValorUnitario().multiply(quantidade)) > 0) {
                        throw new IllegalArgumentException("O valor a restituir supera o valor das peças devolvidas na cobrança original.");
                    }
                }
            }
            if (quantidade.compareTo(saldoMovimentacaoOriginal(saida)) > 0) {
                throw new IllegalArgumentException("A quantidade devolvida excede o saldo da saída original.");
            }
            BigDecimal custoOriginal = "ATENDIMENTO".equals(saida.getOrigem()) ? saida.getCustoUnitarioEstoque() : saida.getValorUnitario();
            if (custoOriginal == null && atendimentoDevolucao != null) custoOriginal = estoque.getCustoMedio();
            if (custoOriginal == null || custoOriginal.signum() < 0) {
                throw new IllegalArgumentException("Não há custo válido para esta devolução. Regularize o custo do estoque antes de prosseguir.");
            }
            return custoOriginal;
        }
        if ("ENTRADA".equals(tipo) && "BONIFICACAO".equals(origem)) return BigDecimal.ZERO.setScale(2);
        boolean custoAutomatico = !"ENTRADA".equals(tipo) || devolucao;
        if (custoAutomatico && estoque.getCustoMedio() != null && estoque.getCustoMedio().signum() >= 0) {
            return estoque.getCustoMedio();
        }
        if ("SAIDA".equals(tipo) || "AJUSTE_SAIDA".equals(tipo)) {
            throw new IllegalArgumentException("Cadastre o custo médio do estoque antes de registrar uma saída.");
        }
        BigDecimal informado = parseMoedaOpcional(request.getValorUnitario());
        if (informado == null || informado.signum() < 0 || ("COMPRA".equals(origem) && informado.signum() == 0)) {
            throw new IllegalArgumentException("COMPRA".equals(origem)
                    ? "Informe um custo unitário maior que zero para a compra."
                    : "Informe um custo unitário válido para a entrada.");
        }
        if (informado.signum() == 0 && limparTextoOpcional(request.getMotivo()) == null) {
            throw new IllegalArgumentException("Justifique no campo Motivo a entrada com custo zero.");
        }
        return informado;
    }

    private void validarCorrecao(EstoquePeca estoque, MovimentacaoEstoquePecaRequest request, String tipo, BigDecimal quantidade) {
        if (request.getIdMovimentacaoOrigem() == null) throw new IllegalArgumentException("Selecione a movimentação original que será corrigida.");
        var original = movimentacaoRepository.findById(request.getIdMovimentacaoOrigem())
                .orElseThrow(() -> new IllegalArgumentException("Movimentação original não encontrada."));
        if (original.getEstoquePeca() == null || !estoque.getId().equals(original.getEstoquePeca().getId())
                || !("ENTRADA".equals(original.getTipoMovimento()) || "SAIDA".equals(original.getTipoMovimento()))
                || (original.getIdMovimentacaoOrigem() != null && !"DEVOLUCAO_FORNECEDOR".equals(original.getOrigem())) || original.getIdAtendimento() != null || "ATENDIMENTO".equals(original.getOrigem())) {
            throw new IllegalArgumentException("Selecione uma entrada ou saída manual original deste estoque. Baixas de atendimento devem ser tratadas pelo fluxo do atendimento.");
        }
        request.setIdFornecedor(original.getIdFornecedor());
        boolean originalEntrada = "ENTRADA".equals(original.getTipoMovimento());
        BigDecimal corrigida = saldoMovimentacaoOriginal(original);
        boolean aumentaOriginal = tipo.endsWith("ENTRADA") == originalEntrada;
        if (aumentaOriginal && "DEVOLUCAO_FORNECEDOR".equals(original.getOrigem()) && original.getIdMovimentacaoOrigem() != null) {
            var recebimento = movimentacaoRepository.findById(original.getIdMovimentacaoOrigem()).orElseThrow();
            if (quantidade.compareTo(saldoMovimentacaoOriginal(recebimento)) > 0) throw new IllegalArgumentException("A correção da devolução excede a quantidade disponível do recebimento original.");
        }
        if (!aumentaOriginal && quantidade.compareTo(corrigida) > 0) {
            throw new IllegalArgumentException("A correção excede a quantidade ainda registrada na movimentação original.");
        }
    }
    private BigDecimal saldoMovimentacaoOriginal(MovimentacaoEstoquePeca original) {
        boolean entradaOriginal = "ENTRADA".equals(original.getTipoMovimento());
        BigDecimal saldo = original.getQuantidade();
        for (var vinculo : movimentacaoRepository.findByIdMovimentacaoOrigem(original.getId())) {
            BigDecimal quantidade = entradaOriginal && "SAIDA".equals(vinculo.getTipoMovimento()) && "DEVOLUCAO_FORNECEDOR".equals(vinculo.getOrigem())
                    ? saldoMovimentacaoOriginal(vinculo) : vinculo.getQuantidade();
            saldo = saldo.add(vinculo.getTipoMovimento().endsWith("ENTRADA") == entradaOriginal ? quantidade : quantidade.negate());
        }
        return saldo;
    }

    private void validarFornecedorMovimentacao(EstoquePeca estoque, MovimentacaoEstoquePecaRequest request, String tipo, BigDecimal quantidade) {
        String origem = request.getOrigem().trim().toUpperCase(Locale.ROOT);
        boolean compra = "ENTRADA".equals(tipo) && "COMPRA".equals(origem);
        boolean devolucao = "SAIDA".equals(tipo) && "DEVOLUCAO_FORNECEDOR".equals(origem);
        if (devolucao) {
            if (request.getIdMovimentacaoOrigem() == null) throw new IllegalArgumentException("Selecione o recebimento original da devolução ao fornecedor.");
            var recebimento = movimentacaoRepository.findById(request.getIdMovimentacaoOrigem())
                    .orElseThrow(() -> new IllegalArgumentException("Recebimento original não encontrado."));
            if (recebimento.getEstoquePeca() == null || !estoque.getId().equals(recebimento.getEstoquePeca().getId())
                    || !"ENTRADA".equals(recebimento.getTipoMovimento()) || !Set.of("COMPRA", "BONIFICACAO", "MANUAL").contains(recebimento.getOrigem() == null ? "" : recebimento.getOrigem())
                    || recebimento.getIdMovimentacaoOrigem() != null || recebimento.getIdAtendimento() != null) {
                throw new IllegalArgumentException("Selecione um recebimento de compra ou bonificação deste estoque. Recebimentos antigos com origem Manual também podem ser identificados.");
            }
            if (recebimento.getIdFornecedor() != null) {
                if (request.getIdFornecedor() != null && !recebimento.getIdFornecedor().equals(request.getIdFornecedor())) throw new IllegalArgumentException("O fornecedor deve ser o mesmo do recebimento original.");
                request.setIdFornecedor(recebimento.getIdFornecedor());
            }
            if (quantidade.compareTo(saldoMovimentacaoOriginal(recebimento)) > 0) throw new IllegalArgumentException("A quantidade devolvida excede o saldo do recebimento, considerando correções e devoluções anteriores.");
            if (limparTextoOpcional(request.getMotivo()) == null) throw new IllegalArgumentException("Informe o motivo da devolução ao fornecedor.");
        }
        if ((compra || devolucao) && request.getIdFornecedor() == null) throw new IllegalArgumentException("Selecione o fornecedor da movimentação.");
        if (request.getIdFornecedor() != null) {
            var fornecedor = fornecedorRepository.findById(request.getIdFornecedor())
                    .orElseThrow(() -> new IllegalArgumentException("Fornecedor não encontrado."));
            if (compra && !fornecedor.isAtivo()) throw new IllegalArgumentException("Selecione um fornecedor ativo para registrar a compra.");
        }
    }
    private void validarOrigemMovimentacao(MovimentacaoEstoquePecaRequest request, String tipo) {
        Set<String> permitidas = switch (tipo) {
            case "ENTRADA" -> Set.of("COMPRA", "DEVOLUCAO_NAO_UTILIZADA", "BONIFICACAO", "OUTRA");
            case "SAIDA" -> Set.of("CONSUMO_INTERNO", "DEVOLUCAO_FORNECEDOR", "PERDA_AVARIA", "OUTRA");
            case "AJUSTE_ENTRADA", "AJUSTE_SAIDA" -> Set.of("INVENTARIO", "CORRECAO_LANCAMENTO", "OUTRA");
            default -> Set.of();
        };
        String origem = request.getOrigem() == null ? "" : request.getOrigem().trim().toUpperCase(Locale.ROOT);
        if (!permitidas.contains(origem)) {
            throw new IllegalArgumentException("Selecione uma origem válida para a movimentação.");
        }
        if ("OUTRA".equals(origem) && limparTextoOpcional(request.getMotivo()) == null) {
            throw new IllegalArgumentException("Explique no campo Motivo a movimentação com outra origem.");
        }
        if (tipo.startsWith("AJUSTE") && limparTextoOpcional(request.getMotivo()) == null) {
            throw new IllegalArgumentException("Informe a justificativa do ajuste de estoque.");
        }
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
