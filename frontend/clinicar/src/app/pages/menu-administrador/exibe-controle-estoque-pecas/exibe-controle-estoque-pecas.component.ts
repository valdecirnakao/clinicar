import { Component, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';

import {
  AlertaEstoquePeca,
  EstoquePeca,
  EstoquePecaRequest,
  ExibeControleEstoquePecasService,
  LocalEstoque,
  LocalEstoqueRequest,
  MovimentacaoEstoquePeca,
  MovimentacaoEstoquePecaRequest,
  PecaResumo
} from './exibe-controle-estoque-pecas.service';

declare var bootstrap: any;

type ModoSelecaoPeca = 'cadastro' | 'edicao';
type TipoMovimentacaoTela = 'ENTRADA' | 'SAIDA' | 'AJUSTE_ENTRADA' | 'AJUSTE_SAIDA';
type AbaEstoque = 'identificacao' | 'quantidades' | 'reposicao' | 'revisao';
type DirecaoOrdenacao = 'asc' | 'desc';
type ColunaOrdenacaoEstoque =
  | 'nomePeca'
  | 'fabricantePeca'
  | 'nomeLocalEstoque'
  | 'quantidadeAtual'
  | 'quantidadeReservada'
  | 'estoqueMinimo'
  | 'custoMedio'
  | 'localizacaoFisica'
  | 'statusEstoque';
type OrigemModalPeca = 'cadastro' | 'edicao' | null;

@Component({
  selector: 'app-exibe-controle-estoque-pecas',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './exibe-controle-estoque-pecas.component.html',
  styleUrls: ['./exibe-controle-estoque-pecas.component.css']
})
export class ExibeControleEstoquePecasComponent implements OnInit {

  estoques: EstoquePeca[] = [];
  private todos: EstoquePeca[] = [];

  pecas: PecaResumo[] = [];
  pecasFiltradas: PecaResumo[] = [];
  filtroPeca = '';

  locais: LocalEstoque[] = [];

  alertasAbertos: AlertaEstoquePeca[] = [];
  alertasTodos: AlertaEstoquePeca[] = [];

  movimentacoes: MovimentacaoEstoquePeca[] = [];

  novoEstoque: Partial<EstoquePeca> = {};
  edit: Partial<EstoquePeca> = {};
  novoLocal: Partial<LocalEstoque> = {};
  movimento: Partial<MovimentacaoEstoquePecaRequest> = {};

  estoqueSelecionado: EstoquePeca | null = null;
  editId: number | null = null;

  tipoMovimentacaoSelecionado: TipoMovimentacaoTela = 'ENTRADA';
  ajusteSaidaSelecionado = false;
  modoSelecaoPeca: ModoSelecaoPeca = 'cadastro';

  loading = false;
  errorMsg = '';

  filtroTexto = '';
  filtroStatus = '';
  filtroLocal = '';

  paginaAtual = 1;
  itensPorPagina = 10;
  opcoesItensPorPagina = [5, 10, 20, 50];

  colunaOrdenacao: ColunaOrdenacaoEstoque = 'nomePeca';
  direcaoOrdenacao: DirecaoOrdenacao = 'asc';

  abaCadastroEstoque: AbaEstoque = 'identificacao';
  abaEdicaoEstoque: AbaEstoque = 'quantidades';

  mensagemErroModal = '';
  estoqueDetalhes: EstoquePeca | null = null;
  private origemModalPeca: OrigemModalPeca = null;

  modalCadastro: any;
  modalEdicao: any;
  modalPeca: any;
  modalMovimentacao: any;
  modalMovimentacoes: any;
  modalAlertas: any;
  modalNovoLocal: any;
  modalDetalhes: any;

  resumo = {
    total: 0,
    normal: 0,
    atencao: 0,
    critico: 0,
    zerado: 0,
    alertasAbertos: 0
  };

  readonly statusFiltro = [
    '',
    'NORMAL',
    'ATENCAO',
    'CRITICO',
    'ZERADO'
  ];

  readonly tiposAjuste = [
    'AJUSTE_ENTRADA',
    'AJUSTE_SAIDA'
  ];

  constructor(
    private readonly service: ExibeControleEstoquePecasService,
    private readonly location: Location
  ) {}

  ngOnInit(): void {
    this.carregarPecas();
    this.carregarLocais();
    this.carregarAlertas();
    this.recarregar();
  }

  recarregar(): void {
    this.loading = true;
    this.errorMsg = '';

    this.service.listarEstoques().subscribe({
      next: (lista) => {
        this.todos = lista ?? [];
        this.aplicarFiltros();

        this.loading = false;
        this.atualizarResumo();
      },
      error: (erro) => {
        console.error('Erro ao carregar estoque de peças:', erro);

        this.loading = false;
        this.errorMsg = this.extrairMensagemErro(
          erro,
          'Falha ao carregar o controle de estoque de peças.'
        );
      }
    });

    this.carregarAlertas();
  }

  private carregarPecas(): void {
    this.service.listarPecas().subscribe({
      next: (lista) => {
        this.pecas = lista ?? [];
        this.pecasFiltradas = [...this.pecas];
      },
      error: (erro) => {
        console.error('Erro ao carregar peças:', erro);
      }
    });
  }

  private carregarLocais(): void {
    this.service.listarLocaisAtivos().subscribe({
      next: (lista) => {
        this.locais = lista ?? [];
      },
      error: (erro) => {
        console.error('Erro ao carregar locais de estoque:', erro);
      }
    });
  }

  private carregarAlertas(): void {
    this.service.listarAlertasAbertos().subscribe({
      next: (lista) => {
        this.alertasAbertos = lista ?? [];
        this.resumo.alertasAbertos = this.alertasAbertos.length;
      },
      error: (erro) => {
        console.error('Erro ao carregar alertas abertos:', erro);
      }
    });
  }

  filtrar(term: string): void {
    this.filtroTexto = term ?? '';
    this.aplicarFiltros();
  }

  aplicarFiltros(): void {
    const texto = this.normalizarTexto(this.filtroTexto);
    const textoNumerico = this.onlyDigits(this.filtroTexto);
    const statusSelecionado = (this.filtroStatus || '').toUpperCase().trim();
    const localSelecionado = this.normalizarTexto(this.filtroLocal);

    const filtrados = this.todos.filter(item => {
      const status = (item.statusEstoque || '').toUpperCase();

      const atendeStatus = !statusSelecionado || status === statusSelecionado;
      const atendeLocal = !localSelecionado || this.normalizarTexto(item.nomeLocalEstoque) === localSelecionado;

      const atendeTexto = !texto ||
        this.normalizarTexto(item.nomePeca).includes(texto) ||
        this.normalizarTexto(item.fabricantePeca).includes(texto) ||
        this.normalizarTexto(item.modeloPeca).includes(texto) ||
        this.normalizarTexto(item.nomeLocalEstoque).includes(texto) ||
        this.normalizarTexto(item.localizacaoFisica).includes(texto) ||
        this.normalizarTexto(item.statusEstoque).includes(texto) ||
        this.onlyDigits(item.idPeca).includes(textoNumerico);

      return atendeStatus && atendeLocal && atendeTexto;
    });

    this.estoques = this.ordenarEstoques(filtrados);
    this.ajustarPaginaAtual();
  }

  private atualizarResumo(): void {
    this.resumo.total = this.todos.length;
    this.resumo.normal = this.todos.filter(e => e.statusEstoque === 'NORMAL').length;
    this.resumo.atencao = this.todos.filter(e => e.statusEstoque === 'ATENCAO').length;
    this.resumo.critico = this.todos.filter(e => e.statusEstoque === 'CRITICO').length;
    this.resumo.zerado = this.todos.filter(e => e.statusEstoque === 'ZERADO').length;
    this.resumo.alertasAbertos = this.alertasAbertos.length;
  }

  get locaisDisponiveisFiltro(): string[] {
    return Array.from(
      new Set(
        this.todos
          .map(item => (item.nomeLocalEstoque || '').trim())
          .filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }

  get possuiFiltrosAplicados(): boolean {
    return !!(
      this.filtroTexto.trim() ||
      this.filtroStatus.trim() ||
      this.filtroLocal.trim()
    );
  }

  get totalRegistrosFiltrados(): number {
    return this.estoques.length;
  }

  get totalPaginas(): number {
    return Math.max(1, Math.ceil(this.totalRegistrosFiltrados / this.itensPorPagina));
  }

  get indiceInicialPagina(): number {
    if (this.totalRegistrosFiltrados === 0) {
      return 0;
    }

    return (this.paginaAtual - 1) * this.itensPorPagina + 1;
  }

  get indiceFinalPagina(): number {
    return Math.min(this.paginaAtual * this.itensPorPagina, this.totalRegistrosFiltrados);
  }

  get estoquesPaginados(): EstoquePeca[] {
    this.ajustarPaginaAtual();

    const inicio = (this.paginaAtual - 1) * this.itensPorPagina;
    const fim = inicio + this.itensPorPagina;

    return this.estoques.slice(inicio, fim);
  }

  get cadastroEstoqueProntoParaSalvar(): boolean {
    return this.validarEstoque(this.novoEstoque, true) === null;
  }

  get edicaoEstoqueProntaParaSalvar(): boolean {
    return this.validarEstoque(this.edit, false) === null;
  }

  get mensagemBloqueioCadastro(): string {
    return this.validarEstoque(this.novoEstoque, true) || '';
  }

  get mensagemBloqueioEdicao(): string {
    return this.validarEstoque(this.edit, false) || '';
  }

  get progressoCadastroEstoque(): number {
    return this.calcularProgressoEstoque(this.novoEstoque, true);
  }

  get progressoEdicaoEstoque(): number {
    return this.calcularProgressoEstoque(this.edit, false);
  }

  aoAlterarFiltros(): void {
    this.paginaAtual = 1;
    this.aplicarFiltros();
  }

  limparFiltros(): void {
    this.filtroTexto = '';
    this.filtroStatus = '';
    this.filtroLocal = '';
    this.paginaAtual = 1;
    this.aplicarFiltros();
  }

  aoAlterarItensPorPagina(): void {
    this.paginaAtual = 1;
    this.ajustarPaginaAtual();
  }

  irParaPagina(pagina: number): void {
    if (pagina < 1 || pagina > this.totalPaginas) {
      return;
    }

    this.paginaAtual = pagina;
  }

  paginaAnterior(): void {
    if (this.paginaAtual > 1) {
      this.paginaAtual--;
    }
  }

  proximaPagina(): void {
    if (this.paginaAtual < this.totalPaginas) {
      this.paginaAtual++;
    }
  }

  paginasVisiveis(): number[] {
    const paginas: number[] = [];
    const inicio = Math.max(1, this.paginaAtual - 2);
    const fim = Math.min(this.totalPaginas, this.paginaAtual + 2);

    for (let pagina = inicio; pagina <= fim; pagina++) {
      paginas.push(pagina);
    }

    return paginas;
  }

  ordenarPor(coluna: ColunaOrdenacaoEstoque): void {
    if (this.colunaOrdenacao === coluna) {
      this.direcaoOrdenacao = this.direcaoOrdenacao === 'asc' ? 'desc' : 'asc';
    } else {
      this.colunaOrdenacao = coluna;
      this.direcaoOrdenacao = 'asc';
    }

    this.aplicarFiltros();
  }

  iconeOrdenacao(coluna: ColunaOrdenacaoEstoque): string {
    if (this.colunaOrdenacao !== coluna) {
      return 'bi-arrow-down-up';
    }

    return this.direcaoOrdenacao === 'asc' ? 'bi-sort-up' : 'bi-sort-down';
  }

  trocarAbaCadastroEstoque(aba: AbaEstoque): void {
    this.abaCadastroEstoque = aba;
  }

  trocarAbaEdicaoEstoque(aba: AbaEstoque): void {
    this.abaEdicaoEstoque = aba;
  }

  avancarAbaCadastroEstoque(): void {
    const ordem: AbaEstoque[] = ['identificacao', 'quantidades', 'reposicao', 'revisao'];
    const atual = ordem.indexOf(this.abaCadastroEstoque);

    if (atual < ordem.length - 1) {
      this.abaCadastroEstoque = ordem[atual + 1];
    }
  }

  voltarAbaCadastroEstoque(): void {
    const ordem: AbaEstoque[] = ['identificacao', 'quantidades', 'reposicao', 'revisao'];
    const atual = ordem.indexOf(this.abaCadastroEstoque);

    if (atual > 0) {
      this.abaCadastroEstoque = ordem[atual - 1];
    }
  }

  avancarAbaEdicaoEstoque(): void {
    const ordem: AbaEstoque[] = ['identificacao', 'quantidades', 'reposicao', 'revisao'];
    const atual = ordem.indexOf(this.abaEdicaoEstoque);

    if (atual < ordem.length - 1) {
      this.abaEdicaoEstoque = ordem[atual + 1];
    }
  }

  voltarAbaEdicaoEstoque(): void {
    const ordem: AbaEstoque[] = ['identificacao', 'quantidades', 'reposicao', 'revisao'];
    const atual = ordem.indexOf(this.abaEdicaoEstoque);

    if (atual > 0) {
      this.abaEdicaoEstoque = ordem[atual - 1];
    }
  }

  abrirDetalhes(item: EstoquePeca): void {
    this.estoqueDetalhes = item;

    const el = document.getElementById('modalDetalhesEstoquePeca');

    if (!el) {
      console.error('Modal modalDetalhesEstoquePeca não encontrado.');
      return;
    }

    this.modalDetalhes = bootstrap.Modal.getOrCreateInstance(el);
    this.modalDetalhes.show();
  }

  saldoDisponivel(item: Partial<EstoquePeca>): number {
    const atual = Number(this.converterQuantidadeParaBackend(item.quantidadeAtual));
    const reservada = Number(this.converterQuantidadeParaBackend(item.quantidadeReservada));

    return Math.max(0, atual - reservada);
  }

  percentualSaldoMinimo(item: Partial<EstoquePeca>): number {
    const atual = Number(this.converterQuantidadeParaBackend(item.quantidadeAtual));
    const minimo = Number(this.converterQuantidadeParaBackend(item.estoqueMinimo));

    if (!minimo || minimo <= 0 || Number.isNaN(atual) || Number.isNaN(minimo)) {
      return 100;
    }

    return Math.max(0, Math.min(100, Math.round((atual / minimo) * 100)));
  }

  estoqueCampoInvalido(model: Partial<EstoquePeca>, campo: string, validarPecaELocal = true): boolean {
    if (campo === 'idPeca') {
      return validarPecaELocal && !model.idPeca;
    }

    if (campo === 'idLocalEstoque') {
      return validarPecaELocal && !model.idLocalEstoque;
    }

    if (campo === 'quantidadeAtual') {
      return this.quantidadeObrigatoriaInvalida(model.quantidadeAtual, true);
    }

    if (campo === 'quantidadeReservada') {
      return this.quantidadeObrigatoriaInvalida(model.quantidadeReservada, true);
    }

    if (campo === 'estoqueMinimo') {
      return this.quantidadeObrigatoriaInvalida(model.estoqueMinimo, true);
    }

    if (campo === 'estoqueCritico') {
      return this.quantidadeObrigatoriaInvalida(model.estoqueCritico, true);
    }

    return false;
  }

  identificacaoEstoquePendente(model: Partial<EstoquePeca>, validarPecaELocal = true): boolean {
    return this.estoqueCampoInvalido(model, 'idPeca', validarPecaELocal) ||
      this.estoqueCampoInvalido(model, 'idLocalEstoque', validarPecaELocal);
  }

  quantidadesEstoquePendentes(model: Partial<EstoquePeca>): boolean {
    return this.estoqueCampoInvalido(model, 'quantidadeAtual', false) ||
      this.estoqueCampoInvalido(model, 'quantidadeReservada', false) ||
      this.estoqueCampoInvalido(model, 'estoqueMinimo', false) ||
      this.estoqueCampoInvalido(model, 'estoqueCritico', false) ||
      this.validarRegrasNumericasEstoque(model) !== null;
  }

  reposicaoEstoquePendente(model: Partial<EstoquePeca>): boolean {
    return this.validarReposicaoEstoque(model) !== null;
  }

  private ajustarPaginaAtual(): void {
    if (this.paginaAtual > this.totalPaginas) {
      this.paginaAtual = this.totalPaginas;
    }

    if (this.paginaAtual < 1) {
      this.paginaAtual = 1;
    }
  }

  private ordenarEstoques(lista: EstoquePeca[]): EstoquePeca[] {
    return [...lista].sort((a, b) => {
      const valorA = this.valorOrdenacao(a, this.colunaOrdenacao);
      const valorB = this.valorOrdenacao(b, this.colunaOrdenacao);
      const multiplicador = this.direcaoOrdenacao === 'asc' ? 1 : -1;

      if (typeof valorA === 'number' && typeof valorB === 'number') {
        return (valorA - valorB) * multiplicador;
      }

      return String(valorA).localeCompare(String(valorB), 'pt-BR') * multiplicador;
    });
  }

  private valorOrdenacao(item: EstoquePeca, coluna: ColunaOrdenacaoEstoque): string | number {
    if (coluna === 'quantidadeAtual' || coluna === 'quantidadeReservada' || coluna === 'estoqueMinimo' || coluna === 'custoMedio') {
      return Number(this.converterQuantidadeParaBackend((item as any)[coluna])) || 0;
    }

    return this.normalizarTexto((item as any)[coluna]);
  }

  private calcularProgressoEstoque(model: Partial<EstoquePeca>, validarPecaELocal: boolean): number {
    const verificacoes = [
      !this.estoqueCampoInvalido(model, 'idPeca', validarPecaELocal),
      !this.estoqueCampoInvalido(model, 'idLocalEstoque', validarPecaELocal),
      !this.estoqueCampoInvalido(model, 'quantidadeAtual', false),
      !this.estoqueCampoInvalido(model, 'quantidadeReservada', false),
      !this.estoqueCampoInvalido(model, 'estoqueMinimo', false),
      !this.estoqueCampoInvalido(model, 'estoqueCritico', false),
      !this.validarRegrasNumericasEstoque(model),
      !this.validarReposicaoEstoque(model)
    ];

    const concluidos = verificacoes.filter(Boolean).length;

    return Math.round((concluidos / verificacoes.length) * 100);
  }


  trackByEstoque = (_: number, item: EstoquePeca) => item.id ?? item.idPeca ?? _;
  trackByPeca = (_: number, item: PecaResumo) => item.id ?? item.nome;
  trackByLocal = (_: number, item: LocalEstoque) => item.id ?? item.nome;
  trackByMovimentacao = (_: number, item: MovimentacaoEstoquePeca) => item.id ?? _;
  trackByAlerta = (_: number, item: AlertaEstoquePeca) => item.id ?? _;

  // ======================================================
  // CADASTRO / EDIÇÃO DO CONTROLE DE ESTOQUE
  // ======================================================

  abrirModalCadastro(): void {
    this.abaCadastroEstoque = 'identificacao';
    this.mensagemErroModal = '';

    this.novoEstoque = {
      idPeca: undefined,
      nomePeca: '',
      fabricantePeca: '',
      modeloPeca: '',
      unidadePeca: '',

      idLocalEstoque: this.locais.length === 1 ? this.locais[0].id : undefined,
      nomeLocalEstoque: this.locais.length === 1 ? this.locais[0].nome : '',

      quantidadeAtual: '0',
      quantidadeReservada: '0',

      estoqueMinimo: '',
      estoqueCritico: '',
      estoqueMaximo: '',

      pontoReposicao: '',
      quantidadeReposicaoSugerida: '',

      custoMedio: '',
      localizacaoFisica: '',

      ativo: true
    };

    const el = document.getElementById('modalCadastroEstoquePeca');

    if (!el) {
      console.error('Modal modalCadastroEstoquePeca não encontrado.');
      return;
    }

    this.modalCadastro = bootstrap.Modal.getOrCreateInstance(el);
    this.modalCadastro.show();
  }

  salvarNovoEstoque(): void {
    const erroValidacao = this.validarEstoque(this.novoEstoque, true);

    if (erroValidacao) {
      this.mensagemErroModal = erroValidacao;
      this.direcionarAbaErroEstoque(this.novoEstoque, true, 'cadastro');
      return;
    }

    const payload = this.montarPayloadEstoque(this.novoEstoque);

    this.service.cadastrarEstoque(payload).subscribe({
      next: () => {
        this.modalCadastro?.hide();
        alert('Controle de estoque cadastrado com sucesso.');
        this.recarregar();
      },
      error: (erro) => {
        console.error('Erro ao cadastrar controle de estoque:', erro);

        this.mensagemErroModal = this.extrairMensagemErro(
          erro,
          'Erro ao cadastrar controle de estoque.'
        );
      }
    });
  }

  abrirModalEdicao(item: EstoquePeca): void {
    this.abaEdicaoEstoque = 'quantidades';
    this.mensagemErroModal = '';
    this.editId = item.id ?? null;

    this.edit = {
      ...item,
      quantidadeAtual: this.normalizarDecimalParaExibicao(item.quantidadeAtual),
      quantidadeReservada: this.normalizarDecimalParaExibicao(item.quantidadeReservada),
      estoqueMinimo: this.normalizarDecimalParaExibicao(item.estoqueMinimo),
      estoqueCritico: this.normalizarDecimalParaExibicao(item.estoqueCritico),
      estoqueMaximo: this.normalizarDecimalParaExibicao(item.estoqueMaximo),
      pontoReposicao: this.normalizarDecimalParaExibicao(item.pontoReposicao),
      quantidadeReposicaoSugerida: this.normalizarDecimalParaExibicao(item.quantidadeReposicaoSugerida),
      custoMedio: this.formatarMoedaBR(item.custoMedio)
    };

    const el = document.getElementById('modalEdicaoEstoquePeca');

    if (!el) {
      console.error('Modal modalEdicaoEstoquePeca não encontrado.');
      return;
    }

    this.modalEdicao = bootstrap.Modal.getOrCreateInstance(el);
    this.modalEdicao.show();
  }

  salvarEdicao(): void {
    if (!this.editId) {
      return;
    }

    const erroValidacao = this.validarEstoque(this.edit, false);

    if (erroValidacao) {
      this.mensagemErroModal = erroValidacao;
      this.direcionarAbaErroEstoque(this.edit, false, 'edicao');
      return;
    }

    const payload = this.montarPayloadEstoque(this.edit);

    this.service.atualizarEstoque(this.editId, payload).subscribe({
      next: () => {
        this.modalEdicao?.hide();
        alert('Controle de estoque atualizado com sucesso.');
        this.recarregar();
      },
      error: (erro) => {
        console.error('Erro ao atualizar controle de estoque:', erro);

        this.mensagemErroModal = this.extrairMensagemErro(
          erro,
          'Erro ao atualizar controle de estoque.'
        );
      }
    });
  }

  private validarEstoque(model: Partial<EstoquePeca>, validarPecaELocal: boolean): string | null {
    if (validarPecaELocal && !model.idPeca) {
      return 'Selecione uma peça ou insumo para controlar o estoque.';
    }

    if (validarPecaELocal && !model.idLocalEstoque) {
      return 'Selecione o local de estoque.';
    }

    if (this.quantidadeObrigatoriaInvalida(model.quantidadeAtual, true)) {
      return 'Informe a quantidade atual com valor igual ou maior que zero.';
    }

    if (this.quantidadeObrigatoriaInvalida(model.quantidadeReservada, true)) {
      return 'Informe a quantidade reservada com valor igual ou maior que zero.';
    }

    if (this.quantidadeObrigatoriaInvalida(model.estoqueMinimo, true)) {
      return 'Informe o estoque mínimo com valor igual ou maior que zero.';
    }

    if (this.quantidadeObrigatoriaInvalida(model.estoqueCritico, true)) {
      return 'Informe o estoque crítico com valor igual ou maior que zero.';
    }

    const erroNumerico = this.validarRegrasNumericasEstoque(model);

    if (erroNumerico) {
      return erroNumerico;
    }

    const erroReposicao = this.validarReposicaoEstoque(model);

    if (erroReposicao) {
      return erroReposicao;
    }

    return null;
  }

  private validarRegrasNumericasEstoque(model: Partial<EstoquePeca>): string | null {
    const atual = Number(this.converterQuantidadeParaBackend(model.quantidadeAtual));
    const reservada = Number(this.converterQuantidadeParaBackend(model.quantidadeReservada));
    const minimo = Number(this.converterQuantidadeParaBackend(model.estoqueMinimo));
    const critico = Number(this.converterQuantidadeParaBackend(model.estoqueCritico));

    if (Number.isNaN(atual) || atual < 0) {
      return 'A quantidade atual não pode ser negativa.';
    }

    if (Number.isNaN(reservada) || reservada < 0) {
      return 'A quantidade reservada não pode ser negativa.';
    }

    if (reservada > atual) {
      return 'A quantidade reservada não pode ser maior que a quantidade atual.';
    }

    if (Number.isNaN(minimo) || minimo < 0) {
      return 'O estoque mínimo não pode ser negativo.';
    }

    if (Number.isNaN(critico) || critico < 0) {
      return 'O estoque crítico não pode ser negativo.';
    }

    if (critico > minimo) {
      return 'O estoque crítico não pode ser maior que o estoque mínimo.';
    }

    return null;
  }

  private validarReposicaoEstoque(model: Partial<EstoquePeca>): string | null {
    const minimo = Number(this.converterQuantidadeParaBackend(model.estoqueMinimo));

    if (model.estoqueMaximo !== null && model.estoqueMaximo !== undefined && String(model.estoqueMaximo).trim() !== '') {
      const maximo = Number(this.converterQuantidadeParaBackend(model.estoqueMaximo));

      if (Number.isNaN(maximo) || maximo < minimo) {
        return 'O estoque máximo não pode ser menor que o estoque mínimo.';
      }
    }

    if (model.pontoReposicao !== null && model.pontoReposicao !== undefined && String(model.pontoReposicao).trim() !== '') {
      const pontoReposicao = Number(this.converterQuantidadeParaBackend(model.pontoReposicao));

      if (Number.isNaN(pontoReposicao) || pontoReposicao < 0) {
        return 'O ponto de reposição não pode ser negativo.';
      }
    }

    if (model.quantidadeReposicaoSugerida !== null && model.quantidadeReposicaoSugerida !== undefined && String(model.quantidadeReposicaoSugerida).trim() !== '') {
      const reposicao = Number(this.converterQuantidadeParaBackend(model.quantidadeReposicaoSugerida));

      if (Number.isNaN(reposicao) || reposicao < 0) {
        return 'A quantidade de reposição sugerida não pode ser negativa.';
      }
    }

    return null;
  }

  private quantidadeObrigatoriaInvalida(valor: any, permitirZero: boolean): boolean {
    if (valor === null || valor === undefined || String(valor).trim() === '') {
      return true;
    }

    const numero = Number(this.converterQuantidadeParaBackend(valor));

    if (Number.isNaN(numero)) {
      return true;
    }

    return permitirZero ? numero < 0 : numero <= 0;
  }

  private direcionarAbaErroEstoque(model: Partial<EstoquePeca>, validarPecaELocal: boolean, modo: 'cadastro' | 'edicao'): void {
    let aba: AbaEstoque = 'identificacao';

    if (this.identificacaoEstoquePendente(model, validarPecaELocal)) {
      aba = 'identificacao';
    } else if (this.quantidadesEstoquePendentes(model)) {
      aba = 'quantidades';
    } else if (this.reposicaoEstoquePendente(model)) {
      aba = 'reposicao';
    }

    if (modo === 'cadastro') {
      this.abaCadastroEstoque = aba;
    } else {
      this.abaEdicaoEstoque = aba;
    }
  }

  private montarPayloadEstoque(model: Partial<EstoquePeca>): EstoquePecaRequest {
    return {
      idPeca: model.idPeca ?? null,
      idLocalEstoque: model.idLocalEstoque ?? null,

      quantidadeAtual: this.converterQuantidadeParaBackend(model.quantidadeAtual),
      quantidadeReservada: this.converterQuantidadeParaBackend(model.quantidadeReservada),

      estoqueMinimo: this.converterQuantidadeParaBackend(model.estoqueMinimo),
      estoqueCritico: this.converterQuantidadeParaBackend(model.estoqueCritico),
      estoqueMaximo: this.converterQuantidadeOpcionalParaBackend(model.estoqueMaximo),

      pontoReposicao: this.converterQuantidadeOpcionalParaBackend(model.pontoReposicao),
      quantidadeReposicaoSugerida: this.converterQuantidadeOpcionalParaBackend(model.quantidadeReposicaoSugerida),

      custoMedio: this.converterMoedaOpcionalParaNumero(model.custoMedio),
      localizacaoFisica: this.limparOpcional(model.localizacaoFisica),

      ativo: model.ativo === null || model.ativo === undefined
        ? true
        : Boolean(model.ativo)
    };
  }

  // ======================================================
  // SELEÇÃO DE PEÇA
  // ======================================================

  abrirModalPeca(modo: ModoSelecaoPeca): void {
    this.modoSelecaoPeca = modo;
    this.origemModalPeca = modo;
    this.filtroPeca = '';
    this.aplicarFiltroPeca();

    if (modo === 'cadastro') {
      this.modalCadastro?.hide();
    } else {
      this.modalEdicao?.hide();
    }

    setTimeout(() => {
      const el = document.getElementById('modalSelecionarPecaEstoque');

      if (!el) {
        console.error('Modal modalSelecionarPecaEstoque não encontrado.');
        return;
      }

      this.modalPeca = bootstrap.Modal.getOrCreateInstance(el, {
        backdrop: 'static',
        keyboard: false
      });
      this.modalPeca.show();
    }, 250);
  }

  aplicarFiltroPeca(): void {
    const t = this.filtroPeca.trim().toLowerCase();

    if (!t) {
      this.pecasFiltradas = [...this.pecas];
      return;
    }

    this.pecasFiltradas = this.pecas.filter(peca => {
      return (
        (peca.nome || '').toLowerCase().includes(t) ||
        (peca.fabricante || '').toLowerCase().includes(t) ||
        (peca.modelo || '').toLowerCase().includes(t) ||
        (peca.tipo || '').toLowerCase().includes(t) ||
        (peca.especificacao || '').toLowerCase().includes(t)
      );
    });
  }

  selecionarPeca(peca: PecaResumo): void {
    if (!peca.id) {
      return;
    }

    const target = this.modoSelecaoPeca === 'cadastro'
      ? this.novoEstoque
      : this.edit;

    target.idPeca = peca.id;
    target.nomePeca = peca.nome;
    target.fabricantePeca = peca.fabricante;
    target.modeloPeca = peca.modelo;
    target.unidadePeca = peca.unidade;

    this.fecharModalPeca(true);
  }

  fecharModalPeca(reabrirOrigem = true): void {
    this.modalPeca?.hide();

    if (!reabrirOrigem || !this.origemModalPeca) {
      this.origemModalPeca = null;
      return;
    }

    const origem = this.origemModalPeca;
    this.origemModalPeca = null;

    setTimeout(() => {
      const modalId = origem === 'cadastro'
        ? 'modalCadastroEstoquePeca'
        : 'modalEdicaoEstoquePeca';

      const el = document.getElementById(modalId);

      if (!el) {
        return;
      }

      const modal = bootstrap.Modal.getOrCreateInstance(el);

      if (origem === 'cadastro') {
        this.modalCadastro = modal;
      } else {
        this.modalEdicao = modal;
      }

      modal.show();
    }, 250);
  }

  pecaTexto(model: Partial<EstoquePeca>): string {
    if (!model.nomePeca) {
      return '';
    }

    const fabricante = model.fabricantePeca ? ` - ${model.fabricantePeca}` : '';
    const modelo = model.modeloPeca ? ` / ${model.modeloPeca}` : '';

    return `${model.nomePeca}${fabricante}${modelo}`;
  }

  // ======================================================
  // LOCAL DE ESTOQUE
  // ======================================================

  abrirModalNovoLocal(): void {
    this.novoLocal = {
      nome: '',
      descricao: '',
      ativo: true
    };

    const el = document.getElementById('modalNovoLocalEstoque');

    if (!el) {
      console.error('Modal modalNovoLocalEstoque não encontrado.');
      return;
    }

    this.modalNovoLocal = bootstrap.Modal.getOrCreateInstance(el);
    this.modalNovoLocal.show();
  }

  salvarNovoLocal(): void {
    if (!String(this.novoLocal.nome ?? '').trim()) {
      alert('Informe o nome do local de estoque.');
      return;
    }

    const payload: LocalEstoqueRequest = {
      nome: this.capitalizar(this.novoLocal.nome),
      descricao: this.limparOpcional(this.novoLocal.descricao),
      ativo: this.novoLocal.ativo === null || this.novoLocal.ativo === undefined
        ? true
        : Boolean(this.novoLocal.ativo)
    };

    this.service.cadastrarLocal(payload).subscribe({
      next: () => {
        this.modalNovoLocal?.hide();
        alert('Local de estoque cadastrado com sucesso.');
        this.carregarLocais();
      },
      error: (erro) => {
        console.error('Erro ao cadastrar local de estoque:', erro);

        alert(
          this.extrairMensagemErro(
            erro,
            'Erro ao cadastrar local de estoque.'
          )
        );
      }
    });
  }

  atualizarNomeLocalCadastro(): void {
    const local = this.locais.find(l => l.id === Number(this.novoEstoque.idLocalEstoque));
    this.novoEstoque.nomeLocalEstoque = local?.nome ?? '';
  }

  atualizarNomeLocalEdicao(): void {
    const local = this.locais.find(l => l.id === Number(this.edit.idLocalEstoque));
    this.edit.nomeLocalEstoque = local?.nome ?? this.edit.nomeLocalEstoque ?? '';
  }

  // ======================================================
  // MOVIMENTAÇÃO
  // ======================================================

  abrirModalMovimentacao(item: EstoquePeca, tipo: TipoMovimentacaoTela): void {
  this.estoqueSelecionado = item;
  this.tipoMovimentacaoSelecionado = tipo;

  /*
   * Quando o usuário clicar no botão Ajuste da tabela,
   * o modal sempre abrirá inicialmente como AJUSTE_ENTRADA.
   */
  this.ajusteSaidaSelecionado = tipo === 'AJUSTE_SAIDA';

  this.movimento = {
    tipoMovimento: tipo,
    quantidade: '',
    valorUnitario: '',
    origem: this.isMovimentacaoAjuste() ? 'AJUSTE_MANUAL' : 'MANUAL',
    documentoReferencia: '',
    motivo: this.motivoPadraoMovimentacao(),
    observacoes: '',
    idUsuario: null
  };

  const el = document.getElementById('modalMovimentacaoEstoque');

  if (!el) {
    console.error('Modal modalMovimentacaoEstoque não encontrado.');
    return;
  }

  this.modalMovimentacao = bootstrap.Modal.getOrCreateInstance(el);
  this.modalMovimentacao.show();
}

alternarTipoAjuste(): void {
  if (!this.isMovimentacaoAjuste()) {
    return;
  }

  this.tipoMovimentacaoSelecionado = this.ajusteSaidaSelecionado
    ? 'AJUSTE_SAIDA'
    : 'AJUSTE_ENTRADA';

  this.movimento.tipoMovimento = this.tipoMovimentacaoSelecionado;
  this.movimento.motivo = this.motivoPadraoMovimentacao();

  /*
   * Ajuste de saída não usa valor unitário.
   * Limpamos o campo para evitar envio desnecessário.
   */
  if (this.tipoMovimentacaoSelecionado === 'AJUSTE_SAIDA') {
    this.movimento.valorUnitario = '';
  }
}

isMovimentacaoAjuste(): boolean {
  return (
    this.tipoMovimentacaoSelecionado === 'AJUSTE_ENTRADA' ||
    this.tipoMovimentacaoSelecionado === 'AJUSTE_SAIDA'
  );
}

private isMovimentacaoSaida(): boolean {
  return (
    this.tipoMovimentacaoSelecionado === 'SAIDA' ||
    this.tipoMovimentacaoSelecionado === 'AJUSTE_SAIDA'
  );
}

textoAjudaTipoMovimentacao(): string {
  if (this.tipoMovimentacaoSelecionado === 'AJUSTE_ENTRADA') {
    return 'Use esta opção quando o saldo físico encontrado for maior do que o saldo registrado no sistema.';
  }

  if (this.tipoMovimentacaoSelecionado === 'AJUSTE_SAIDA') {
    return 'Use esta opção quando o saldo físico encontrado for menor do que o saldo registrado no sistema.';
  }

  if (this.tipoMovimentacaoSelecionado === 'ENTRADA') {
    return 'Use esta opção para registrar entrada real de peças no estoque, como compra ou reposição.';
  }

  return 'Use esta opção para registrar consumo, retirada ou baixa real de peças do estoque.';
}

rotuloQuantidadeMovimentacao(): string {
  if (this.isMovimentacaoSaida()) {
    return 'Quantidade a retirar *';
  }

  return 'Quantidade a adicionar *';
}

placeholderQuantidadeMovimentacao(): string {
  if (this.isMovimentacaoSaida()) {
    return 'Ex.: 1 peça retirada';
  }

  return 'Ex.: 1 peça adicionada';
}

classePainelMovimentacao(): string {
  if (this.tipoMovimentacaoSelecionado === 'ENTRADA') {
    return 'movimento-painel movimento-entrada';
  }

  if (this.tipoMovimentacaoSelecionado === 'SAIDA') {
    return 'movimento-painel movimento-saida';
  }

  if (this.tipoMovimentacaoSelecionado === 'AJUSTE_ENTRADA') {
    return 'movimento-painel movimento-ajuste-entrada';
  }

  return 'movimento-painel movimento-ajuste-saida';
}

motivoPadraoMovimentacao(): string {
  if (this.tipoMovimentacaoSelecionado === 'AJUSTE_ENTRADA') {
    return 'Correção administrativa de entrada';
  }

  if (this.tipoMovimentacaoSelecionado === 'AJUSTE_SAIDA') {
    return 'Correção administrativa de saída';
  }

  return '';
}

  salvarMovimentacao(): void {
  if (!this.estoqueSelecionado?.id) {
    return;
  }

  const erroValidacao = this.validarMovimentacao();

  if (erroValidacao) {
    alert(erroValidacao);
    return;
  }

  const payload = this.montarPayloadMovimentacao();

  const id = this.estoqueSelecionado.id;

  let request$;

  if (this.tipoMovimentacaoSelecionado === 'ENTRADA') {
    request$ = this.service.registrarEntrada(id, payload);
  } else if (this.tipoMovimentacaoSelecionado === 'SAIDA') {
    request$ = this.service.registrarSaida(id, payload);
  } else {
    request$ = this.service.registrarAjuste(id, payload);
  }

  request$.subscribe({
    next: () => {
      this.modalMovimentacao?.hide();
      alert('Movimentação registrada com sucesso.');
      this.recarregar();
    },
    error: (erro: any) => {
      console.error('Erro ao registrar movimentação:', erro);

      alert(
        this.extrairMensagemErro(
          erro,
          'Erro ao registrar movimentação.'
        )
      );
    }
  });
}

  private validarMovimentacao(): string | null {
    if (!String(this.movimento.quantidade ?? '').trim()) {
      return 'Informe a quantidade da movimentação.';
    }

    const quantidade = Number(this.converterQuantidadeParaBackend(this.movimento.quantidade));

    if (Number.isNaN(quantidade) || quantidade <= 0) {
      return 'A quantidade da movimentação deve ser maior que zero.';
    }

    if (
      this.tipoMovimentacaoSelecionado === 'SAIDA' ||
      this.tipoMovimentacaoSelecionado === 'AJUSTE_SAIDA'
    ) {
      const saldoAtual = Number(this.converterQuantidadeParaBackend(this.estoqueSelecionado?.quantidadeAtual));

      if (quantidade > saldoAtual) {
        return 'A quantidade informada é maior que o saldo disponível.';
      }
    }

    return null;
  }

  private montarPayloadMovimentacao(): MovimentacaoEstoquePecaRequest {
  return {
    tipoMovimento: this.tipoMovimentacaoSelecionado,
    quantidade: this.converterQuantidadeParaBackend(this.movimento.quantidade),
    valorUnitario: this.exibirCampoValorUnitario()
      ? this.converterMoedaOpcionalParaNumero(this.movimento.valorUnitario)
      : '',
    origem: this.limparOpcional(this.movimento.origem),
    documentoReferencia: this.limparOpcional(this.movimento.documentoReferencia),
    motivo: this.limparOpcional(this.movimento.motivo),
    observacoes: this.limparOpcional(this.movimento.observacoes),
    idUsuario: this.movimento.idUsuario ?? null
  };
}

  abrirModalMovimentacoes(item: EstoquePeca): void {
    if (!item.id) {
      return;
    }

    this.estoqueSelecionado = item;
    this.movimentacoes = [];

    this.service.listarMovimentacoes(item.id).subscribe({
      next: (lista) => {
        this.movimentacoes = lista ?? [];

        const el = document.getElementById('modalHistoricoMovimentacoes');

        if (!el) {
          console.error('Modal modalHistoricoMovimentacoes não encontrado.');
          return;
        }

        this.modalMovimentacoes = bootstrap.Modal.getOrCreateInstance(el);
        this.modalMovimentacoes.show();
      },
      error: (erro) => {
        console.error('Erro ao carregar movimentações:', erro);

        alert(
          this.extrairMensagemErro(
            erro,
            'Erro ao carregar movimentações do estoque.'
          )
        );
      }
    });
  }

  tituloMovimentacao(): string {
    if (this.tipoMovimentacaoSelecionado === 'ENTRADA') {
      return 'Registrar Entrada de Estoque';
    }

    if (this.tipoMovimentacaoSelecionado === 'SAIDA') {
      return 'Registrar Saída de Estoque';
    }

    if (this.tipoMovimentacaoSelecionado === 'AJUSTE_ENTRADA') {
      return 'Registrar Ajuste de Entrada';
    }

    return 'Registrar Ajuste de Saída';
  }

  descricaoMovimentacao(): string {
    if (!this.estoqueSelecionado) {
      return '';
    }

    return `${this.estoqueSelecionado.nomePeca} | Saldo atual: ${this.formatarQuantidade(this.estoqueSelecionado.quantidadeAtual, this.estoqueSelecionado.unidadePeca)}`;
  }

  exibirCampoValorUnitario(): boolean {
    return (
      this.tipoMovimentacaoSelecionado === 'ENTRADA' ||
      this.tipoMovimentacaoSelecionado === 'AJUSTE_ENTRADA'
    );
  }

  // ======================================================
  // ALERTAS
  // ======================================================

  abrirModalAlertas(): void {
    this.service.listarAlertasAbertos().subscribe({
      next: (lista) => {
        this.alertasAbertos = lista ?? [];

        const el = document.getElementById('modalAlertasEstoque');

        if (!el) {
          console.error('Modal modalAlertasEstoque não encontrado.');
          return;
        }

        this.modalAlertas = bootstrap.Modal.getOrCreateInstance(el);
        this.modalAlertas.show();

        this.atualizarResumo();
      },
      error: (erro) => {
        console.error('Erro ao carregar alertas:', erro);

        alert(
          this.extrairMensagemErro(
            erro,
            'Erro ao carregar alertas de estoque.'
          )
        );
      }
    });
  }

  resolverAlerta(alerta: AlertaEstoquePeca): void {
    if (!alerta.id) {
      return;
    }

    if (!confirm('Confirma marcar este alerta como resolvido?')) {
      return;
    }

    this.service.resolverAlerta(alerta.id).subscribe({
      next: () => {
        alert('Alerta resolvido com sucesso.');
        this.carregarAlertas();
        this.abrirModalAlertas();
      },
      error: (erro) => {
        console.error('Erro ao resolver alerta:', erro);

        alert(
          this.extrairMensagemErro(
            erro,
            'Erro ao resolver alerta.'
          )
        );
      }
    });
  }

  reenviarWhatsapp(alerta: AlertaEstoquePeca): void {
    if (!alerta.id) {
      return;
    }

    this.service.reenviarWhatsapp(alerta.id).subscribe({
      next: (resposta) => {
        if (resposta.whatsappEnviado) {
          alert('Alerta reenviado por WhatsApp com sucesso.');
        } else {
          alert(
            resposta.ultimoErro ||
            'O alerta foi processado, mas o WhatsApp não foi enviado.'
          );
        }

        this.carregarAlertas();
        this.abrirModalAlertas();
      },
      error: (erro) => {
        console.error('Erro ao reenviar WhatsApp:', erro);

        alert(
          this.extrairMensagemErro(
            erro,
            'Erro ao reenviar alerta por WhatsApp.'
          )
        );
      }
    });
  }

  // ======================================================
  // FORMATAÇÕES
  // ======================================================

  formatarQuantidade(valor: any, unidade?: string | null): string {
    if (valor === null || valor === undefined || valor === '') {
      return `0 ${unidade || 'un.'}`;
    }

    const numero = Number(valor);

    if (Number.isNaN(numero)) {
      return `${valor} ${unidade || 'un.'}`;
    }

    const texto = numero.toLocaleString('pt-BR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 3
    });

    return `${texto} ${unidade || 'un.'}`;
  }

  formatarQuantidadeSemUnidade(valor: any): string {
    if (valor === null || valor === undefined || valor === '') {
      return '0';
    }

    const numero = Number(valor);

    if (Number.isNaN(numero)) {
      return valor.toString();
    }

    return numero.toLocaleString('pt-BR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 3
    });
  }

  formatarMoedaBR(valor: any): string {
    if (valor === null || valor === undefined || valor === '') {
      return '';
    }

    let numero: number;

    if (typeof valor === 'number') {
      numero = valor;
    } else {
      let texto = valor
        .toString()
        .replace('R$', '')
        .replace(/\s/g, '')
        .trim();

      if (/^\d+\.\d{1,2}$/.test(texto)) {
        numero = Number(texto);
      } else if (texto.includes(',')) {
        texto = texto.replace(/\./g, '').replace(',', '.');
        numero = Number(texto);
      } else {
        numero = Number(texto);
      }
    }

    if (Number.isNaN(numero)) {
      return '';
    }

    return numero.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  formatarValorUnitarioMovimento(): void {
    this.movimento.valorUnitario = this.formatarMoedaBR(this.movimento.valorUnitario);
  }

  formatarCustoMedioCadastro(): void {
    this.novoEstoque.custoMedio = this.formatarMoedaBR(this.novoEstoque.custoMedio);
  }

  formatarCustoMedioEdicao(): void {
    this.edit.custoMedio = this.formatarMoedaBR(this.edit.custoMedio);
  }

  formatarStatus(status?: string): string {
    if (!status) {
      return '';
    }

    if (status === 'NORMAL') {
      return 'Normal';
    }

    if (status === 'ATENCAO') {
      return 'Atenção';
    }

    if (status === 'CRITICO') {
      return 'Crítico';
    }

    if (status === 'ZERADO') {
      return 'Zerado';
    }

    return status;
  }

  statusBadgeClass(status?: string): string {
    if (status === 'NORMAL') {
      return 'bg-success';
    }

    if (status === 'ATENCAO') {
      return 'bg-warning text-dark';
    }

    if (status === 'CRITICO') {
      return 'bg-danger';
    }

    if (status === 'ZERADO') {
      return 'bg-dark';
    }

    return 'bg-secondary';
  }

  movimentoBadgeClass(tipo?: string): string {
    if (tipo === 'ENTRADA' || tipo === 'AJUSTE_ENTRADA') {
      return 'bg-success';
    }

    if (tipo === 'SAIDA' || tipo === 'AJUSTE_SAIDA') {
      return 'bg-danger';
    }

    return 'bg-secondary';
  }

  formatarTipoMovimento(tipo?: string): string {
    if (!tipo) {
      return '';
    }

    if (tipo === 'ENTRADA') {
      return 'Entrada';
    }

    if (tipo === 'SAIDA') {
      return 'Saída';
    }

    if (tipo === 'AJUSTE_ENTRADA') {
      return 'Ajuste Entrada';
    }

    if (tipo === 'AJUSTE_SAIDA') {
      return 'Ajuste Saída';
    }

    return tipo;
  }

  formatarDataHora(data?: string | null): string {
    if (!data) {
      return '';
    }

    const d = new Date(data);

    if (Number.isNaN(d.getTime())) {
      return '';
    }

    return d.toLocaleString('pt-BR');
  }

  capitalizar(texto: string | null | undefined): string {
    if (!texto) {
      return '';
    }

    return texto
      .trim()
      .split(' ')
      .filter(parte => parte.length > 0)
      .map(parte => parte.charAt(0).toUpperCase() + parte.slice(1).toLowerCase())
      .join(' ');
  }

  normalizarTexto(valor: any): string {
    return (valor ?? '')
      .toString()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  private onlyDigits(valor: any): string {
    return (valor ?? '').toString().replace(/\D/g, '');
  }


  voltar(): void {
    this.location.back();
  }

  // ======================================================
  // CONVERSÕES
  // ======================================================

  private converterQuantidadeParaBackend(valor: any): string {
    if (valor === null || valor === undefined || valor === '') {
      return '0';
    }

    if (typeof valor === 'number') {
      return valor.toString();
    }

    let texto = valor
      .toString()
      .replace(/\s/g, '')
      .trim();

    if (texto.includes(',')) {
      texto = texto.replace(/\./g, '').replace(',', '.');
    }

    const numero = Number(texto);

    if (Number.isNaN(numero)) {
      return '0';
    }

    return numero.toString();
  }

  private converterQuantidadeOpcionalParaBackend(valor: any): string {
    if (valor === null || valor === undefined || valor === '') {
      return '';
    }

    return this.converterQuantidadeParaBackend(valor);
  }

  private converterMoedaOpcionalParaNumero(valor: any): string {
    if (valor === null || valor === undefined || valor === '') {
      return '';
    }

    if (typeof valor === 'number') {
      return valor.toFixed(2);
    }

    let texto = valor
      .toString()
      .replace('R$', '')
      .replace(/\s/g, '')
      .trim();

    if (/^\d+\.\d{1,2}$/.test(texto)) {
      return Number(texto).toFixed(2);
    }

    if (texto.includes(',')) {
      texto = texto.replace(/\./g, '').replace(',', '.');
      return Number(texto).toFixed(2);
    }

    const numero = Number(texto);

    if (Number.isNaN(numero)) {
      return '';
    }

    return numero.toFixed(2);
  }

  private normalizarDecimalParaExibicao(valor: any): string {
    if (valor === null || valor === undefined || valor === '') {
      return '';
    }

    const numero = Number(valor);

    if (Number.isNaN(numero)) {
      return valor.toString();
    }

    return numero.toLocaleString('pt-BR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 3
    });
  }

  private limparOpcional(valor: string | null | undefined): string | undefined {
    if (valor === null || valor === undefined || valor.trim() === '') {
      return undefined;
    }

    return valor.trim();
  }

  private extrairMensagemErro(erro: any, mensagemPadrao: string): string {
    if (typeof erro?.error === 'string') {
      return erro.error;
    }

    if (typeof erro?.error?.mensagem === 'string') {
      return erro.error.mensagem;
    }

    if (typeof erro?.message === 'string') {
      return erro.message;
    }

    return mensagemPadrao;
  }
}
