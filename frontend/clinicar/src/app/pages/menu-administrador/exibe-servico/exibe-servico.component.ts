import { Component, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';

import {
  ExibeServicoService,
  Servico,
  ServicoRequest
} from './exibe-servico.service';

import {
  ExibeFornecedorService,
  Fornecedor
} from '../exibe-fornecedor/exibe-fornecedor.service';

declare var bootstrap: any;

type AbaServico = 'dados' | 'cobranca' | 'fornecedor' | 'revisao';
type ModoSelecaoFornecedor = 'cadastro' | 'edicao';
type DirecaoOrdenacao = 'asc' | 'desc';
type TipoAcaoConfirmacao = 'ativar' | 'inativar' | 'excluir';

type ColunaOrdenacaoServico =
  | 'nome'
  | 'categoria'
  | 'tipoDoPrestador'
  | 'duracaoEstimada'
  | 'valorBase'
  | 'garantiaDias'
  | 'necessitaPecas'
  | 'ativo'
  | 'razaoSocialFornecedor';

type CampoObrigatorioServico =
  | 'nome'
  | 'categoria'
  | 'tipoDoPrestador'
  | 'duracaoEstimada'
  | 'unidadeDuracao'
  | 'valorBase'
  | 'unidadeCobranca'
  | 'garantiaDias';

@Component({
  selector: 'app-exibe-servico',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './exibe-servico.component.html',
  styleUrls: ['./exibe-servico.component.css']
})
export class ExibeServicoComponent implements OnInit {

  servicos: Servico[] = [];
  private todos: Servico[] = [];

  novoServico: Partial<Servico> = {};
  edit: Partial<Servico> = {};
  editId: number | null = null;
  servicoDetalhe: Servico | null = null;

  modalCadastro: any;
  modalEdicao: any;
  modalDetalhes: any;
  modalFornecedor: any;
  modalConfirmacao: any;

  loading = false;
  errorMsg = '';
  mensagemErroCadastro = '';
  mensagemErroEdicao = '';
  camposInvalidos: CampoObrigatorioServico[] = [];

  fornecedores: Fornecedor[] = [];
  fornecedoresFiltrados: Fornecedor[] = [];
  fornecedorFiltro = '';

  filtroTexto = '';
  filtroStatus = '';
  filtroCategoria = '';
  filtroFornecedor = '';

  paginaAtual = 1;
  itensPorPagina = 10;
  readonly opcoesItensPorPagina = [5, 10, 20, 50];

  colunaOrdenacao: ColunaOrdenacaoServico = 'nome';
  direcaoOrdenacao: DirecaoOrdenacao = 'asc';

  abaCadastroServico: AbaServico = 'dados';
  abaEdicaoServico: AbaServico = 'dados';

  acaoConfirmacao: TipoAcaoConfirmacao | null = null;
  servicoConfirmacao: Servico | null = null;

  private modoSelecaoFornecedor: ModoSelecaoFornecedor = 'cadastro';

  readonly unidadesDuracao = [
    'MINUTO',
    'HORA',
    'DIA'
  ];

  readonly unidadesCobranca = [
    'SERVICO',
    'HORA',
    'DIARIA',
    'PACOTE',
    'UNIDADE'
  ];

  readonly categoriasSugeridas = [
    'Manutenção Preventiva',
    'Freios',
    'Suspensão',
    'Motor',
    'Elétrica',
    'Diagnóstico',
    'Pneus',
    'Funilaria',
    'Alinhamento e Balanceamento',
    'Troca de Óleo',
    'Arrefecimento',
    'Higienização',
    'Outro'
  ];

  readonly tiposPrestadorSugeridos = [
    'Mecânico',
    'Eletricista Automotivo',
    'Funileiro',
    'Borracheiro',
    'Centro Automotivo',
    'Fornecedor Externo',
    'Técnico Especializado',
    'Terceirizado',
    'Outro'
  ];

  private readonly camposObrigatorios: CampoObrigatorioServico[] = [
    'nome',
    'categoria',
    'tipoDoPrestador',
    'duracaoEstimada',
    'unidadeDuracao',
    'valorBase',
    'unidadeCobranca',
    'garantiaDias'
  ];

  constructor(
    private readonly servicoService: ExibeServicoService,
    private readonly fornecedorService: ExibeFornecedorService,
    private readonly location: Location
  ) {}

  ngOnInit(): void {
    this.carregarFornecedores();
    this.recarregar();
  }

  recarregar(): void {
    this.loading = true;
    this.errorMsg = '';

    this.servicoService.listarTodos().subscribe({
      next: (lista) => {
        this.todos = lista ?? [];
        this.servicos = [...this.todos];
        this.loading = false;
        this.cancelarEdicao();
        this.ajustarPaginaAtual();
      },
      error: (erro) => {
        console.error('Erro ao carregar serviços:', erro);
        this.loading = false;
        this.errorMsg = this.extrairMensagemErro(erro, 'Falha ao carregar serviços.');
      }
    });
  }

  voltar(): void {
    this.location.back();
  }

  trackByServico = (_: number, servico: Servico) => servico.id ?? servico.nome;
  trackByFornecedor = (_: number, fornecedor: Fornecedor) => fornecedor.id ?? fornecedor.razaoSocial;

  get totalServicos(): number {
    return this.todos.length;
  }

  get totalAtivos(): number {
    return this.todos.filter(servico => servico.ativo).length;
  }

  get totalInativos(): number {
    return this.todos.filter(servico => !servico.ativo).length;
  }

  get totalNecessitaPecas(): number {
    return this.todos.filter(servico => servico.necessitaPecas).length;
  }

  get valorMedioBase(): string {
    if (!this.todos.length) {
      return this.formatarMoedaBR(0);
    }

    const total = this.todos.reduce((acc, servico) => acc + this.moedaParaNumero(servico.valorBase), 0);
    return this.formatarMoedaBR(total / this.todos.length);
  }

  get categoriasDisponiveis(): string[] {
    const categoriasDoCadastro = this.todos
      .map(servico => (servico.categoria || '').trim())
      .filter(Boolean);

    return Array.from(new Set([...this.categoriasSugeridas, ...categoriasDoCadastro]))
      .sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }

  get fornecedoresDisponiveisFiltro(): Fornecedor[] {
    const idsUtilizados = new Set(
      this.todos
        .map(servico => Number(servico.idFornecedor))
        .filter(id => !Number.isNaN(id) && id > 0)
    );

    return this.fornecedores
      .filter(fornecedor => fornecedor.id && idsUtilizados.has(Number(fornecedor.id)))
      .sort((a, b) => (a.razaoSocial || '').localeCompare(b.razaoSocial || '', 'pt-BR'));
  }

  get possuiFiltrosAplicados(): boolean {
    return !!(
      this.filtroTexto.trim() ||
      this.filtroStatus.trim() ||
      this.filtroCategoria.trim() ||
      this.filtroFornecedor.trim()
    );
  }

  get servicosFiltrados(): Servico[] {
    const texto = this.normalizarTexto(this.filtroTexto);
    const status = this.filtroStatus;
    const categoria = this.normalizarTexto(this.filtroCategoria);
    const fornecedor = Number(this.filtroFornecedor);

    const filtrados = this.todos.filter(servico => {
      const statusTexto = servico.ativo ? 'ativo' : 'inativo';
      const pecasTexto = servico.necessitaPecas ? 'necessita peças sim' : 'não necessita peças';
      const fornecedorTexto = servico.razaoSocialFornecedor || '';

      const atendeTexto = !texto ||
        this.normalizarTexto(servico.nome).includes(texto) ||
        this.normalizarTexto(servico.descricao).includes(texto) ||
        this.normalizarTexto(servico.categoria).includes(texto) ||
        this.normalizarTexto(servico.tipoDoPrestador).includes(texto) ||
        this.normalizarTexto(servico.unidadeDuracao).includes(texto) ||
        this.normalizarTexto(servico.unidadeCobranca).includes(texto) ||
        this.normalizarTexto(fornecedorTexto).includes(texto) ||
        this.normalizarTexto(statusTexto).includes(texto) ||
        this.normalizarTexto(pecasTexto).includes(texto);

      const atendeStatus = !status ||
        (status === 'ATIVO' && servico.ativo) ||
        (status === 'INATIVO' && !servico.ativo) ||
        (status === 'PECAS' && servico.necessitaPecas);

      const atendeCategoria = !categoria || this.normalizarTexto(servico.categoria) === categoria;
      const atendeFornecedor = !fornecedor || Number(servico.idFornecedor) === fornecedor;

      return atendeTexto && atendeStatus && atendeCategoria && atendeFornecedor;
    });

    return this.ordenarServicos(filtrados);
  }

  get totalRegistrosFiltrados(): number {
    return this.servicosFiltrados.length;
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

  get servicosPaginados(): Servico[] {
    this.ajustarPaginaAtual();
    const inicio = (this.paginaAtual - 1) * this.itensPorPagina;
    return this.servicosFiltrados.slice(inicio, inicio + this.itensPorPagina);
  }

  aoAlterarFiltros(): void {
    this.paginaAtual = 1;
  }

  limparFiltros(): void {
    this.filtroTexto = '';
    this.filtroStatus = '';
    this.filtroCategoria = '';
    this.filtroFornecedor = '';
    this.paginaAtual = 1;
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
    const total = this.totalPaginas;
    const atual = this.paginaAtual;
    const paginas: number[] = [];
    const inicio = Math.max(1, atual - 2);
    const fim = Math.min(total, atual + 2);

    for (let i = inicio; i <= fim; i++) {
      paginas.push(i);
    }

    return paginas;
  }

  ordenarPor(coluna: ColunaOrdenacaoServico): void {
    if (this.colunaOrdenacao === coluna) {
      this.direcaoOrdenacao = this.direcaoOrdenacao === 'asc' ? 'desc' : 'asc';
      return;
    }

    this.colunaOrdenacao = coluna;
    this.direcaoOrdenacao = 'asc';
  }

  iconeOrdenacao(coluna: ColunaOrdenacaoServico): string {
    if (this.colunaOrdenacao !== coluna) {
      return 'bi-arrow-down-up';
    }

    return this.direcaoOrdenacao === 'asc' ? 'bi-sort-up' : 'bi-sort-down';
  }

  private ordenarServicos(lista: Servico[]): Servico[] {
    return [...lista].sort((a, b) => {
      const va = this.valorOrdenacao(a, this.colunaOrdenacao);
      const vb = this.valorOrdenacao(b, this.colunaOrdenacao);

      let resultado = 0;

      if (typeof va === 'number' && typeof vb === 'number') {
        resultado = va - vb;
      } else {
        resultado = String(va).localeCompare(String(vb), 'pt-BR', { numeric: true });
      }

      return this.direcaoOrdenacao === 'asc' ? resultado : resultado * -1;
    });
  }

  private valorOrdenacao(servico: Servico, coluna: ColunaOrdenacaoServico): string | number {
    if (coluna === 'duracaoEstimada') {
      return Number(this.converterDecimalParaBackend(servico.duracaoEstimada)) || 0;
    }

    if (coluna === 'valorBase') {
      return this.moedaParaNumero(servico.valorBase);
    }

    if (coluna === 'garantiaDias') {
      return Number(servico.garantiaDias || 0);
    }

    if (coluna === 'necessitaPecas') {
      return servico.necessitaPecas ? 1 : 0;
    }

    if (coluna === 'ativo') {
      return servico.ativo ? 1 : 0;
    }

    return this.normalizarTexto((servico as any)[coluna]);
  }

  private ajustarPaginaAtual(): void {
    if (this.paginaAtual > this.totalPaginas) {
      this.paginaAtual = this.totalPaginas;
    }

    if (this.paginaAtual < 1) {
      this.paginaAtual = 1;
    }
  }

  abrirModalCadastro(): void {
    this.camposInvalidos = [];
    this.mensagemErroCadastro = '';
    this.abaCadastroServico = 'dados';

    this.novoServico = {
      nome: '',
      descricao: '',
      categoria: '',
      tipoDoPrestador: '',
      duracaoEstimada: '',
      unidadeDuracao: 'MINUTO',
      valorBase: '',
      unidadeCobranca: 'SERVICO',
      garantiaDias: 0,
      necessitaPecas: false,
      ativo: true,
      observacoes: '',
      idFornecedor: null,
      razaoSocialFornecedor: ''
    };

    const el = document.getElementById('modalCadastroServico');

    if (!el) {
      console.error('Modal modalCadastroServico não encontrado.');
      return;
    }

    this.modalCadastro = bootstrap.Modal.getOrCreateInstance(el);
    this.modalCadastro.show();
  }

  salvarNovoServico(): void {
    const erroValidacao = this.validarServico(this.novoServico, true);

    if (erroValidacao) {
      this.mensagemErroCadastro = erroValidacao;
      return;
    }

    this.mensagemErroCadastro = '';
    const payload = this.montarPayload(this.novoServico);

    this.servicoService.cadastrarServico(payload).subscribe({
      next: () => {
        this.modalCadastro?.hide();
        alert('Serviço cadastrado com sucesso.');
        this.recarregar();
      },
      error: (erro) => {
        console.error('Erro ao cadastrar serviço:', erro);
        this.mensagemErroCadastro = this.extrairMensagemErro(erro, 'Erro ao cadastrar serviço.');
      }
    });
  }

  abrirModalEdicao(servico: Servico): void {
    this.camposInvalidos = [];
    this.mensagemErroEdicao = '';
    this.abaEdicaoServico = 'dados';
    this.editId = servico.id ?? null;

    this.edit = {
      ...servico,
      duracaoEstimada: this.normalizarDecimalParaExibicao(servico.duracaoEstimada),
      valorBase: this.formatarMoedaBR(servico.valorBase),
      idFornecedor: servico.idFornecedor ?? null,
      razaoSocialFornecedor: servico.razaoSocialFornecedor ?? ''
    };

    const el = document.getElementById('modalEdicaoServico');

    if (!el) {
      console.error('Modal modalEdicaoServico não encontrado.');
      return;
    }

    this.modalEdicao = bootstrap.Modal.getOrCreateInstance(el);
    this.modalEdicao.show();
  }

  salvarEdicaoModal(): void {
    if (!this.editId) {
      return;
    }

    const erroValidacao = this.validarServico(this.edit, true);

    if (erroValidacao) {
      this.mensagemErroEdicao = erroValidacao;
      return;
    }

    this.mensagemErroEdicao = '';
    const payload = this.montarPayload(this.edit);

    this.servicoService.atualizarServico(this.editId, payload).subscribe({
      next: () => {
        this.modalEdicao?.hide();
        this.cancelarEdicao();
        alert('Serviço atualizado com sucesso.');
        this.recarregar();
      },
      error: (erro) => {
        console.error('Erro ao atualizar serviço:', erro);
        this.mensagemErroEdicao = this.extrairMensagemErro(erro, 'Erro ao atualizar serviço.');
      }
    });
  }

  cancelarEdicao(): void {
    this.editId = null;
    this.edit = {};
    this.fornecedorFiltro = '';
  }

  abrirDetalhes(servico: Servico): void {
    this.servicoDetalhe = servico;

    const el = document.getElementById('modalDetalhesServico');

    if (!el) {
      console.error('Modal modalDetalhesServico não encontrado.');
      return;
    }

    this.modalDetalhes = bootstrap.Modal.getOrCreateInstance(el);
    this.modalDetalhes.show();
  }

  abrirConfirmacao(servico: Servico, acao: TipoAcaoConfirmacao): void {
    this.servicoConfirmacao = servico;
    this.acaoConfirmacao = acao;

    const el = document.getElementById('modalConfirmacaoServico');

    if (!el) {
      console.error('Modal modalConfirmacaoServico não encontrado.');
      return;
    }

    this.modalConfirmacao = bootstrap.Modal.getOrCreateInstance(el);
    this.modalConfirmacao.show();
  }

  executarAcaoConfirmada(): void {
    if (!this.servicoConfirmacao?.id || !this.acaoConfirmacao) {
      return;
    }

    const id = this.servicoConfirmacao.id;

    if (this.acaoConfirmacao === 'ativar') {
      this.servicoService.ativarServico(id).subscribe({
        next: () => this.acaoExecutadaComSucesso('Serviço ativado com sucesso.'),
        error: (erro) => this.tratarErroAcao(erro, 'Erro ao ativar serviço.')
      });
      return;
    }

    if (this.acaoConfirmacao === 'inativar') {
      this.servicoService.inativarServico(id).subscribe({
        next: () => this.acaoExecutadaComSucesso('Serviço inativado com sucesso.'),
        error: (erro) => this.tratarErroAcao(erro, 'Erro ao inativar serviço.')
      });
      return;
    }

    this.servicoService.removerServico(id).subscribe({
      next: () => this.acaoExecutadaComSucesso('Serviço inativado com sucesso.'),
      error: (erro) => this.tratarErroAcao(erro, 'Erro ao remover serviço.')
    });
  }

  private acaoExecutadaComSucesso(mensagem: string): void {
    this.modalConfirmacao?.hide();
    alert(mensagem);
    this.servicoConfirmacao = null;
    this.acaoConfirmacao = null;
    this.recarregar();
  }

  private tratarErroAcao(erro: any, mensagemPadrao: string): void {
    console.error(mensagemPadrao, erro);
    alert(this.extrairMensagemErro(erro, mensagemPadrao));
  }

  tituloConfirmacao(): string {
    if (this.acaoConfirmacao === 'ativar') {
      return 'Ativar serviço';
    }

    if (this.acaoConfirmacao === 'inativar') {
      return 'Inativar serviço';
    }

    return 'Excluir serviço';
  }

  mensagemConfirmacao(): string {
    const nome = this.servicoConfirmacao?.nome || 'este serviço';

    if (this.acaoConfirmacao === 'ativar') {
      return `Confirma a reativação de ${nome}?`;
    }

    if (this.acaoConfirmacao === 'inativar') {
      return `Confirma a inativação de ${nome}?`;
    }

    return `Confirma a exclusão lógica de ${nome}? O serviço será marcado como inativo.`;
  }

  classeBotaoConfirmacao(): string {
    if (this.acaoConfirmacao === 'ativar') {
      return 'btn btn-success';
    }

    if (this.acaoConfirmacao === 'inativar') {
      return 'btn btn-warning';
    }

    return 'btn btn-danger';
  }

  iconeBotaoConfirmacao(): string {
    if (this.acaoConfirmacao === 'ativar') {
      return 'bi bi-toggle-on';
    }

    if (this.acaoConfirmacao === 'inativar') {
      return 'bi bi-toggle-off';
    }

    return 'bi bi-trash';
  }

  textoBotaoConfirmacao(): string {
    if (this.acaoConfirmacao === 'ativar') {
      return 'Ativar';
    }

    if (this.acaoConfirmacao === 'inativar') {
      return 'Inativar';
    }

    return 'Excluir';
  }

  trocarAbaCadastroServico(aba: AbaServico): void {
    this.abaCadastroServico = aba;
  }

  trocarAbaEdicaoServico(aba: AbaServico): void {
    this.abaEdicaoServico = aba;
  }

  cadastroAbaAnterior(): void {
    const ordem: AbaServico[] = ['dados', 'cobranca', 'fornecedor', 'revisao'];
    const indice = ordem.indexOf(this.abaCadastroServico);

    if (indice > 0) {
      this.abaCadastroServico = ordem[indice - 1];
    }
  }

  cadastroAbaProxima(): void {
    const ordem: AbaServico[] = ['dados', 'cobranca', 'fornecedor', 'revisao'];
    const indice = ordem.indexOf(this.abaCadastroServico);

    if (indice >= 0 && indice < ordem.length - 1) {
      this.abaCadastroServico = ordem[indice + 1];
    }
  }

  cadastroEhPrimeiraAba(): boolean {
    return this.abaCadastroServico === 'dados';
  }

  cadastroEhUltimaAba(): boolean {
    return this.abaCadastroServico === 'revisao';
  }

  edicaoAbaAnterior(): void {
    const ordem: AbaServico[] = ['dados', 'cobranca', 'fornecedor', 'revisao'];
    const indice = ordem.indexOf(this.abaEdicaoServico);

    if (indice > 0) {
      this.abaEdicaoServico = ordem[indice - 1];
    }
  }

  edicaoAbaProxima(): void {
    const ordem: AbaServico[] = ['dados', 'cobranca', 'fornecedor', 'revisao'];
    const indice = ordem.indexOf(this.abaEdicaoServico);

    if (indice >= 0 && indice < ordem.length - 1) {
      this.abaEdicaoServico = ordem[indice + 1];
    }
  }

  edicaoEhPrimeiraAba(): boolean {
    return this.abaEdicaoServico === 'dados';
  }

  edicaoEhUltimaAba(): boolean {
    return this.abaEdicaoServico === 'revisao';
  }

  get cadastroServicoProntoParaSalvar(): boolean {
    return this.validarServico(this.novoServico, false) === null;
  }

  get edicaoServicoProntoParaSalvar(): boolean {
    return this.validarServico(this.edit, false) === null;
  }

  get mensagemBloqueioCadastro(): string {
    return this.validarServico(this.novoServico, false) || '';
  }

  get mensagemBloqueioEdicao(): string {
    return this.validarServico(this.edit, false) || '';
  }

  get progressoCadastroServico(): number {
    return this.calcularProgresso(this.novoServico);
  }

  get progressoEdicaoServico(): number {
    return this.calcularProgresso(this.edit);
  }

  pendenciasCadastroAba(aba: AbaServico): number {
    return this.pendenciasAba(this.novoServico, aba);
  }

  pendenciasEdicaoAba(aba: AbaServico): number {
    return this.pendenciasAba(this.edit, aba);
  }

  campoMarcadoInvalido(model: Partial<Servico>, campo: CampoObrigatorioServico): boolean {
    const campoInvalido = this.campoInvalido(model, campo);
    return this.camposInvalidos.includes(campo) && campoInvalido;
  }

  limparCampoInvalido(campo: CampoObrigatorioServico): void {
    if (!this.camposInvalidos.includes(campo)) {
      return;
    }

    this.camposInvalidos = this.camposInvalidos.filter(item => item !== campo);
    this.mensagemErroCadastro = '';
    this.mensagemErroEdicao = '';
  }

  dadosServicoPendentes(model: Partial<Servico>): boolean {
    return this.campoInvalido(model, 'nome') ||
      this.campoInvalido(model, 'categoria') ||
      this.campoInvalido(model, 'tipoDoPrestador');
  }

  cobrancaServicoPendente(model: Partial<Servico>): boolean {
    return this.campoInvalido(model, 'duracaoEstimada') ||
      this.campoInvalido(model, 'unidadeDuracao') ||
      this.campoInvalido(model, 'valorBase') ||
      this.campoInvalido(model, 'unidadeCobranca') ||
      this.campoInvalido(model, 'garantiaDias');
  }

  private calcularProgresso(model: Partial<Servico>): number {
    const preenchidos = this.camposObrigatorios.filter(campo => !this.campoInvalido(model, campo)).length;
    const percentual = Math.round((preenchidos / this.camposObrigatorios.length) * 100);
    return Math.max(0, Math.min(100, percentual));
  }

  private pendenciasAba(model: Partial<Servico>, aba: AbaServico): number {
    const camposPorAba: Record<AbaServico, CampoObrigatorioServico[]> = {
      dados: ['nome', 'categoria', 'tipoDoPrestador'],
      cobranca: ['duracaoEstimada', 'unidadeDuracao', 'valorBase', 'unidadeCobranca', 'garantiaDias'],
      fornecedor: [],
      revisao: []
    };

    return camposPorAba[aba].filter(campo => this.campoInvalido(model, campo)).length;
  }

  private campoInvalido(model: Partial<Servico>, campo: CampoObrigatorioServico): boolean {
    if (campo === 'duracaoEstimada') {
      const valor = Number(this.converterDecimalParaBackend(model.duracaoEstimada));
      return !String(model.duracaoEstimada ?? '').trim() || Number.isNaN(valor) || valor <= 0;
    }

    if (campo === 'valorBase') {
      const valor = this.moedaParaNumero(model.valorBase);
      return !String(model.valorBase ?? '').trim() || Number.isNaN(valor) || valor < 0;
    }

    if (campo === 'garantiaDias') {
      const valor = Number(model.garantiaDias ?? 0);
      return Number.isNaN(valor) || valor < 0;
    }

    return !String((model as any)[campo] ?? '').trim();
  }

  private validarServico(model: Partial<Servico>, marcarInvalidos: boolean): string | null {
    const faltando = this.camposObrigatorios.filter(campo => this.campoInvalido(model, campo));

    if (faltando.length) {
      if (marcarInvalidos) {
        this.camposInvalidos = [...faltando];
        this.abaPorCampo(faltando[0], model === this.novoServico ? 'cadastro' : 'edicao');
      }

      const primeiroCampo = faltando[0];

      if (primeiroCampo === 'nome') {
        return 'Informe o nome do serviço.';
      }

      if (primeiroCampo === 'categoria') {
        return 'Informe a categoria do serviço.';
      }

      if (primeiroCampo === 'tipoDoPrestador') {
        return 'Informe o tipo do prestador.';
      }

      if (primeiroCampo === 'duracaoEstimada') {
        return 'Informe uma duração estimada maior que zero.';
      }

      if (primeiroCampo === 'valorBase') {
        return 'Informe um valor base válido.';
      }

      if (primeiroCampo === 'garantiaDias') {
        return 'A garantia em dias não pode ser negativa.';
      }

      return 'Preencha todos os campos obrigatórios antes de salvar o serviço.';
    }

    if (marcarInvalidos) {
      this.camposInvalidos = [];
    }

    return null;
  }

  private abaPorCampo(campo: CampoObrigatorioServico, contexto: 'cadastro' | 'edicao'): void {
    let aba: AbaServico = 'dados';

    if (['duracaoEstimada', 'unidadeDuracao', 'valorBase', 'unidadeCobranca', 'garantiaDias'].includes(campo)) {
      aba = 'cobranca';
    }

    if (contexto === 'cadastro') {
      this.abaCadastroServico = aba;
    } else {
      this.abaEdicaoServico = aba;
    }
  }

  private montarPayload(model: Partial<Servico>): ServicoRequest {
    return {
      nome: this.capitalizar(model.nome),
      descricao: this.limparOpcional(model.descricao),
      categoria: this.capitalizar(model.categoria),
      tipoDoPrestador: this.capitalizar(model.tipoDoPrestador),
      duracaoEstimada: this.converterDecimalParaBackend(model.duracaoEstimada),
      unidadeDuracao: (model.unidadeDuracao || '').toString().toUpperCase(),
      valorBase: this.converterMoedaParaNumero(model.valorBase),
      unidadeCobranca: (model.unidadeCobranca || '').toString().toUpperCase(),
      garantiaDias: Math.floor(Number(model.garantiaDias ?? 0)),
      necessitaPecas: Boolean(model.necessitaPecas),
      ativo: model.ativo === null || model.ativo === undefined ? true : Boolean(model.ativo),
      observacoes: this.limparOpcional(model.observacoes),
      idFornecedor: model.idFornecedor ?? null
    };
  }

  private carregarFornecedores(): void {
    this.fornecedorService.listarTodos().subscribe({
      next: (lista) => {
        this.fornecedores = lista ?? [];
        this.fornecedoresFiltrados = [...this.fornecedores];
      },
      error: (erro) => {
        console.error('Erro ao carregar fornecedores:', erro);
      }
    });
  }

  abrirModalFornecedor(modo: ModoSelecaoFornecedor): void {
    this.modoSelecaoFornecedor = modo;
    this.fornecedorFiltro = '';
    this.aplicarFiltroFornecedor();

    if (modo === 'cadastro') {
      this.modalCadastro?.hide();
    } else {
      this.modalEdicao?.hide();
    }

    const el = document.getElementById('modalFornecedorServico');

    if (!el) {
      console.error('Modal modalFornecedorServico não encontrado.');
      return;
    }

    this.modalFornecedor = bootstrap.Modal.getOrCreateInstance(el, {
      backdrop: 'static',
      keyboard: false
    });
    this.modalFornecedor.show();
  }

  cancelarSelecaoFornecedor(): void {
    this.modalFornecedor?.hide();
    this.restaurarModalOrigemFornecedor();
  }

  aplicarFiltroFornecedor(): void {
    const t = this.normalizarTexto(this.fornecedorFiltro);
    const tNum = this.onlyDigits(this.fornecedorFiltro);

    if (!t && !tNum) {
      this.fornecedoresFiltrados = [...this.fornecedores];
      return;
    }

    this.fornecedoresFiltrados = this.fornecedores.filter(fornecedor => {
      const razao = this.normalizarTexto(fornecedor.razaoSocial);
      const fantasia = this.normalizarTexto((fornecedor as any).nomeFantasia);
      const cnpj = this.onlyDigits((fornecedor as any).cnpj);
      const item = this.normalizarTexto((fornecedor as any).itemFornecido);

      return razao.includes(t) ||
        fantasia.includes(t) ||
        item.includes(t) ||
        (!!tNum && cnpj.includes(tNum));
    });
  }

  selecionarFornecedor(fornecedor: Fornecedor): void {
    if (!fornecedor.id) {
      return;
    }

    if (this.modoSelecaoFornecedor === 'cadastro') {
      this.novoServico.idFornecedor = fornecedor.id;
      this.novoServico.razaoSocialFornecedor = fornecedor.razaoSocial;
    } else {
      this.edit.idFornecedor = fornecedor.id;
      this.edit.razaoSocialFornecedor = fornecedor.razaoSocial;
    }

    this.modalFornecedor?.hide();
    this.restaurarModalOrigemFornecedor();
  }

  private restaurarModalOrigemFornecedor(): void {
    setTimeout(() => {
      if (this.modoSelecaoFornecedor === 'cadastro') {
        const elCadastro = document.getElementById('modalCadastroServico');
        if (elCadastro) {
          this.modalCadastro = bootstrap.Modal.getOrCreateInstance(elCadastro);
          this.modalCadastro.show();
        }
        return;
      }

      const elEdicao = document.getElementById('modalEdicaoServico');
      if (elEdicao) {
        this.modalEdicao = bootstrap.Modal.getOrCreateInstance(elEdicao);
        this.modalEdicao.show();
      }
    }, 180);
  }

  removerFornecedorSelecionado(model: Partial<Servico>): void {
    model.idFornecedor = null;
    model.razaoSocialFornecedor = '';
  }

  fornecedorTexto(model: Partial<Servico>): string {
    return model.razaoSocialFornecedor || '';
  }

  formatarValorBaseCadastro(): void {
    this.novoServico.valorBase = this.formatarMoedaBR(this.novoServico.valorBase);
  }

  formatarValorBaseEdicao(): void {
    this.edit.valorBase = this.formatarMoedaBR(this.edit.valorBase);
  }

  normalizarGarantia(model: Partial<Servico>): void {
    const valor = Number(model.garantiaDias ?? 0);
    model.garantiaDias = Number.isNaN(valor) || valor < 0 ? 0 : Math.floor(valor);
  }

  formatarDuracao(servico: Partial<Servico>): string {
    const duracao = this.normalizarDecimalParaExibicao(servico.duracaoEstimada);
    const unidade = servico.unidadeDuracao || '';

    if (!duracao) {
      return '—';
    }

    return `${duracao} ${this.formatarUnidade(unidade)}`;
  }

  formatarUnidade(unidade: string | null | undefined): string {
    if (!unidade) {
      return '';
    }

    const u = unidade.toUpperCase();

    const mapa: Record<string, string> = {
      MINUTO: 'minuto(s)',
      HORA: 'hora(s)',
      DIA: 'dia(s)',
      SERVICO: 'serviço',
      DIARIA: 'diária',
      PACOTE: 'pacote',
      UNIDADE: 'unidade'
    };

    return mapa[u] || unidade;
  }

  formatarValorServico(valor: any): string {
    return this.formatarMoedaBR(valor) || 'R$ 0,00';
  }

  formatarMoedaBR(valor: any): string {
    if (valor === null || valor === undefined || valor === '') {
      return '';
    }

    const numero = this.moedaParaNumero(valor);

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

  converterMoedaParaNumero(valor: any): string {
    const numero = this.moedaParaNumero(valor);
    return Number.isNaN(numero) ? '0.00' : numero.toFixed(2);
  }

  moedaParaNumero(valor: any): number {
    if (valor === null || valor === undefined || valor === '') {
      return 0;
    }

    if (typeof valor === 'number') {
      return Number.isNaN(valor) ? 0 : valor;
    }

    let texto = String(valor)
      .replace('R$', '')
      .replace(/\s/g, '')
      .trim();

    if (/^\d+\.\d{1,4}$/.test(texto)) {
      return Number(texto);
    }

    if (texto.includes(',')) {
      texto = texto.replace(/\./g, '').replace(',', '.');
    }

    const numero = Number(texto);
    return Number.isNaN(numero) ? 0 : numero;
  }

  private converterDecimalParaBackend(valor: any): string {
    if (valor === null || valor === undefined || valor === '') {
      return '';
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

    return texto;
  }

  normalizarDecimalParaExibicao(valor: any): string {
    if (valor === null || valor === undefined || valor === '') {
      return '';
    }

    const numero = Number(valor);

    if (Number.isNaN(numero)) {
      return valor.toString();
    }

    if (Number.isInteger(numero)) {
      return numero.toString();
    }

    return numero.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  formatarCNPJ(cnpj?: string): string {
    const d = this.onlyDigits(cnpj);

    if (d.length !== 14) {
      return cnpj ?? '';
    }

    return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12, 14)}`;
  }

  formatarDataBr(data: string | Date | null | undefined): string {
    if (!data) {
      return '—';
    }

    const texto = String(data);
    const matchIso = texto.match(/^(\d{4})-(\d{2})-(\d{2})/);

    if (matchIso) {
      return `${matchIso[3]}/${matchIso[2]}/${matchIso[1]}`;
    }

    const d = new Date(data);

    if (Number.isNaN(d.getTime())) {
      return '—';
    }

    return d.toLocaleDateString('pt-BR');
  }

  capitalizar(texto: string | null | undefined): string {
    if (!texto) {
      return '';
    }

    const minusculas = ['de', 'da', 'do', 'das', 'dos', 'e', 'em', 'para'];

    return texto
      .toString()
      .replace(/\s+/g, ' ')
      .trim()
      .split(' ')
      .map((parte, indice) => {
        const p = parte.toLowerCase();

        if (indice > 0 && minusculas.includes(p)) {
          return p;
        }

        return p.charAt(0).toUpperCase() + p.slice(1);
      })
      .join(' ');
  }

  statusBadgeClass(servico: Partial<Servico>): string {
    return servico.ativo ? 'badge bg-success' : 'badge bg-secondary';
  }

  pecasBadgeClass(servico: Partial<Servico>): string {
    return servico.necessitaPecas ? 'badge bg-warning text-dark' : 'badge bg-info text-dark';
  }

  statusTexto(servico: Partial<Servico>): string {
    return servico.ativo ? 'Ativo' : 'Inativo';
  }

  necessitaPecasTexto(servico: Partial<Servico>): string {
    return servico.necessitaPecas ? 'Necessita peças' : 'Não necessita peças';
  }

  descricaoCurta(servico: Partial<Servico>): string {
    const descricao = String(servico.descricao || '').trim();

    if (!descricao) {
      return 'Sem descrição cadastrada.';
    }

    return descricao.length > 100 ? `${descricao.substring(0, 100)}...` : descricao;
  }

  private normalizarTexto(valor: any): string {
    return (valor ?? '')
      .toString()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  private limparOpcional(valor: string | null | undefined): string | undefined {
    if (valor === null || valor === undefined || valor.trim() === '') {
      return undefined;
    }

    return valor.trim();
  }

  private onlyDigits(v: any): string {
    return (v ?? '').toString().replace(/\D/g, '');
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
