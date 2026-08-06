import { Component, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';

import {
  ExibeFornecimentoServicosService,
  FornecimentoServico,
  FornecimentoServicoRequest
} from './exibe-fornecimento-servicos.service';

import {
  ExibeFornecedorService,
  Fornecedor
} from '../exibe-fornecedor/exibe-fornecedor.service';

import {
  ExibeServicoService,
  Servico
} from '../exibe-servico/exibe-servico.service';

declare var bootstrap: any;

type ModoSelecao = 'cadastro' | 'edicao';
type AbaFornecimentoServico = 'vinculo' | 'condicoes' | 'revisao';
type DirecaoOrdenacao = 'asc' | 'desc';
type TipoConfirmacao = 'ativar' | 'inativar' | 'excluir';
type ModalOrigemSelecao = 'cadastro' | 'edicao' | null;

type ColunaOrdenacaoFornecimentoServico =
  | 'fornecedor'
  | 'servico'
  | 'categoria'
  | 'valorCusto'
  | 'prazoExecucao'
  | 'quantidadeMinima'
  | 'disponibilidade'
  | 'vigencia'
  | 'ativo';

type CampoObrigatorioFornecimentoServico =
  | 'fornecedor'
  | 'servico'
  | 'valorCusto'
  | 'unidadeCobranca'
  | 'prazoExecucao'
  | 'unidadePrazo'
  | 'quantidadeMinima'
  | 'disponibilidade';

@Component({
  selector: 'app-exibe-fornecimento-servicos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './exibe-fornecimento-servicos.component.html',
  styleUrls: ['./exibe-fornecimento-servicos.component.css']
})
export class ExibeFornecimentoServicosComponent implements OnInit {

  fornecimentosServicos: FornecimentoServico[] = [];
  private todos: FornecimentoServico[] = [];

  novoFornecimento: Partial<FornecimentoServico> = {};
  edit: Partial<FornecimentoServico> = {};
  editId: number | null = null;

  fornecimentoDetalhe: FornecimentoServico | null = null;
  fornecimentoAcao: FornecimentoServico | null = null;
  tipoConfirmacao: TipoConfirmacao = 'inativar';

  modalCadastro: any;
  modalEdicao: any;
  modalFornecedor: any;
  modalServico: any;
  modalDetalhes: any;
  modalConfirmacao: any;

  loading = false;
  errorMsg = '';
  mensagemErroModal = '';
  camposInvalidos: CampoObrigatorioFornecimentoServico[] = [];

  fornecedores: Fornecedor[] = [];
  fornecedoresFiltrados: Fornecedor[] = [];
  fornecedorFiltro = '';

  servicos: Servico[] = [];
  servicosFiltrados: Servico[] = [];
  servicoFiltro = '';

  filtroTexto = '';
  filtroStatus = '';
  filtroFornecedor = '';
  filtroServico = '';
  filtroDisponibilidade = '';

  paginaAtual = 1;
  itensPorPagina = 10;
  opcoesItensPorPagina = [5, 10, 20, 50];

  colunaOrdenacao: ColunaOrdenacaoFornecimentoServico = 'fornecedor';
  direcaoOrdenacao: DirecaoOrdenacao = 'asc';

  abaCadastroFornecimento: AbaFornecimentoServico = 'vinculo';
  abaEdicaoFornecimento: AbaFornecimentoServico = 'vinculo';

  private modoSelecaoFornecedor: ModoSelecao = 'cadastro';
  private modoSelecaoServico: ModoSelecao = 'cadastro';
  private modalOrigemFornecedor: ModalOrigemSelecao = null;
  private modalOrigemServico: ModalOrigemSelecao = null;

  readonly unidadesCobranca = [
    'SERVICO',
    'HORA',
    'DIARIA',
    'PACOTE',
    'UNIDADE'
  ];

  readonly unidadesPrazo = [
    'MINUTO',
    'HORA',
    'DIA'
  ];

  readonly disponibilidades = [
    'SOB_DEMANDA',
    'IMEDIATA',
    'AGENDAMENTO',
    'INDISPONIVEL'
  ];

  private readonly camposObrigatorios: CampoObrigatorioFornecimentoServico[] = [
    'fornecedor',
    'servico',
    'valorCusto',
    'unidadeCobranca',
    'prazoExecucao',
    'unidadePrazo',
    'quantidadeMinima',
    'disponibilidade'
  ];

  constructor(
    private readonly fornecimentoServicoService: ExibeFornecimentoServicosService,
    private readonly fornecedorService: ExibeFornecedorService,
    private readonly servicoService: ExibeServicoService,
    private readonly location: Location
  ) {}

  ngOnInit(): void {
    this.carregarFornecedores();
    this.carregarServicos();
    this.recarregar();
  }

  // ======================================================
  // CARREGAMENTO E LISTAGEM
  // ======================================================

  recarregar(): void {
    this.loading = true;
    this.errorMsg = '';

    this.fornecimentoServicoService.listarTodos().subscribe({
      next: (lista) => {
        this.todos = lista ?? [];
        this.fornecimentosServicos = [...this.todos];
        this.loading = false;
        this.cancelarEdicao();
        this.ajustarPaginaAtual();
      },
      error: (erro) => {
        console.error('Erro ao carregar fornecimentos de serviços:', erro);

        this.loading = false;
        this.errorMsg = this.extrairMensagemErro(
          erro,
          'Falha ao carregar fornecimentos de serviços.'
        );
      }
    });
  }

  get totalFornecimentos(): number {
    return this.todos.length;
  }

  get totalAtivos(): number {
    return this.todos.filter(item => this.fornecimentoAtivo(item)).length;
  }

  get totalInativos(): number {
    return this.todos.filter(item => !this.fornecimentoAtivo(item)).length;
  }

  get totalFornecedoresVinculados(): number {
    return new Set(
      this.todos
        .map(item => Number(item.idFornecedor || 0))
        .filter(id => id > 0)
    ).size;
  }

  get totalServicosVinculados(): number {
    return new Set(
      this.todos
        .map(item => Number(item.idServico || 0))
        .filter(id => id > 0)
    ).size;
  }

  get valorMedioFornecimento(): number {
    const valores = this.todos
      .map(item => this.moedaParaNumero(item.valorCusto))
      .filter(valor => valor > 0);

    if (!valores.length) {
      return 0;
    }

    return valores.reduce((acc, valor) => acc + valor, 0) / valores.length;
  }

  get fornecedoresFiltroDisponiveis(): FornecimentoServico[] {
    const mapa = new Map<number, FornecimentoServico>();

    this.todos.forEach(item => {
      if (item.idFornecedor) {
        mapa.set(Number(item.idFornecedor), item);
      }
    });

    return Array.from(mapa.values())
      .sort((a, b) => this.fornecedorNome(a).localeCompare(this.fornecedorNome(b), 'pt-BR'));
  }

  get servicosFiltroDisponiveis(): FornecimentoServico[] {
    const mapa = new Map<number, FornecimentoServico>();

    this.todos.forEach(item => {
      if (item.idServico) {
        mapa.set(Number(item.idServico), item);
      }
    });

    return Array.from(mapa.values())
      .sort((a, b) => this.servicoNome(a).localeCompare(this.servicoNome(b), 'pt-BR'));
  }

  get possuiFiltrosAplicados(): boolean {
    return !!(
      this.filtroTexto.trim() ||
      this.filtroStatus.trim() ||
      this.filtroFornecedor.trim() ||
      this.filtroServico.trim() ||
      this.filtroDisponibilidade.trim()
    );
  }

  get fornecimentosFiltrados(): FornecimentoServico[] {
    const texto = this.normalizarTexto(this.filtroTexto);
    const textoNumerico = this.onlyDigits(this.filtroTexto);
    const status = this.filtroStatus.trim();
    const idFornecedor = Number(this.filtroFornecedor || 0);
    const idServico = Number(this.filtroServico || 0);
    const disponibilidade = this.filtroDisponibilidade.trim();

    const filtrados = this.todos.filter(item => {
      const atendeTexto = !texto ||
        this.normalizarTexto(this.fornecedorNome(item)).includes(texto) ||
        this.onlyDigits(item.cnpjFornecedor).includes(textoNumerico) ||
        this.normalizarTexto(this.servicoNome(item)).includes(texto) ||
        this.normalizarTexto(item.categoriaServico).includes(texto) ||
        this.normalizarTexto(this.formatarDisponibilidade(item.disponibilidade)).includes(texto) ||
        this.normalizarTexto(this.formatarUnidade(item.unidadeCobranca)).includes(texto) ||
        this.normalizarTexto(this.formatarUnidade(item.unidadePrazo)).includes(texto) ||
        this.normalizarTexto(item.contratoReferencia).includes(texto) ||
        this.normalizarTexto(item.observacoes).includes(texto);

      const atendeStatus = !status ||
        (status === 'ativo' && this.fornecimentoAtivo(item)) ||
        (status === 'inativo' && !this.fornecimentoAtivo(item));

      const atendeFornecedor = !idFornecedor || Number(item.idFornecedor) === idFornecedor;
      const atendeServico = !idServico || Number(item.idServico) === idServico;
      const atendeDisponibilidade = !disponibilidade || (item.disponibilidade || '') === disponibilidade;

      return atendeTexto && atendeStatus && atendeFornecedor && atendeServico && atendeDisponibilidade;
    });

    return this.ordenarFornecimentos(filtrados);
  }

  get totalRegistrosFiltrados(): number {
    return this.fornecimentosFiltrados.length;
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

  get fornecimentosPaginados(): FornecimentoServico[] {
    this.ajustarPaginaAtual();

    const inicio = (this.paginaAtual - 1) * this.itensPorPagina;
    const fim = inicio + this.itensPorPagina;

    return this.fornecimentosFiltrados.slice(inicio, fim);
  }

  filtrar(term: string): void {
    this.filtroTexto = term || '';
    this.aoAlterarFiltros();
  }

  aoAlterarFiltros(): void {
    this.paginaAtual = 1;
  }

  limparFiltros(): void {
    this.filtroTexto = '';
    this.filtroStatus = '';
    this.filtroFornecedor = '';
    this.filtroServico = '';
    this.filtroDisponibilidade = '';
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
    const inicio = Math.max(1, atual - 2);
    const fim = Math.min(total, atual + 2);
    const paginas: number[] = [];

    for (let i = inicio; i <= fim; i++) {
      paginas.push(i);
    }

    return paginas;
  }

  ordenarPor(coluna: ColunaOrdenacaoFornecimentoServico): void {
    if (this.colunaOrdenacao === coluna) {
      this.direcaoOrdenacao = this.direcaoOrdenacao === 'asc' ? 'desc' : 'asc';
      return;
    }

    this.colunaOrdenacao = coluna;
    this.direcaoOrdenacao = 'asc';
  }

  iconeOrdenacao(coluna: ColunaOrdenacaoFornecimentoServico): string {
    if (this.colunaOrdenacao !== coluna) {
      return 'bi-arrow-down-up';
    }

    return this.direcaoOrdenacao === 'asc' ? 'bi-sort-up' : 'bi-sort-down';
  }

  private ordenarFornecimentos(lista: FornecimentoServico[]): FornecimentoServico[] {
    const fator = this.direcaoOrdenacao === 'asc' ? 1 : -1;

    return [...lista].sort((a, b) => {
      let valorA: string | number = '';
      let valorB: string | number = '';

      switch (this.colunaOrdenacao) {
        case 'fornecedor':
          valorA = this.fornecedorNome(a);
          valorB = this.fornecedorNome(b);
          break;
        case 'servico':
          valorA = this.servicoNome(a);
          valorB = this.servicoNome(b);
          break;
        case 'categoria':
          valorA = a.categoriaServico || '';
          valorB = b.categoriaServico || '';
          break;
        case 'valorCusto':
          valorA = this.moedaParaNumero(a.valorCusto);
          valorB = this.moedaParaNumero(b.valorCusto);
          break;
        case 'prazoExecucao':
          valorA = Number(this.converterDecimalParaBackend(a.prazoExecucao)) || 0;
          valorB = Number(this.converterDecimalParaBackend(b.prazoExecucao)) || 0;
          break;
        case 'quantidadeMinima':
          valorA = Number(a.quantidadeMinima || 0);
          valorB = Number(b.quantidadeMinima || 0);
          break;
        case 'disponibilidade':
          valorA = a.disponibilidade || '';
          valorB = b.disponibilidade || '';
          break;
        case 'vigencia':
          valorA = this.asInputDateString(a.dataInicioVigencia) || '';
          valorB = this.asInputDateString(b.dataInicioVigencia) || '';
          break;
        case 'ativo':
          valorA = this.fornecimentoAtivo(a) ? 1 : 0;
          valorB = this.fornecimentoAtivo(b) ? 1 : 0;
          break;
      }

      if (typeof valorA === 'number' && typeof valorB === 'number') {
        return (valorA - valorB) * fator;
      }

      return String(valorA).localeCompare(String(valorB), 'pt-BR') * fator;
    });
  }

  private ajustarPaginaAtual(): void {
    if (this.paginaAtual > this.totalPaginas) {
      this.paginaAtual = this.totalPaginas;
    }

    if (this.paginaAtual < 1) {
      this.paginaAtual = 1;
    }
  }

  trackByFornecimentoServico = (_: number, item: FornecimentoServico) =>
    item.id ?? `${item.idFornecedor}-${item.idServico}`;

  trackByFornecedor = (_: number, item: Fornecedor) => item.id ?? item.cnpj ?? item.razaoSocial;

  trackByServico = (_: number, item: Servico) => item.id ?? item.nome;

  // ======================================================
  // CADASTRO, EDIÇÃO, DETALHES E CONFIRMAÇÃO
  // ======================================================

  abrirModalCadastro(): void {
    this.camposInvalidos = [];
    this.mensagemErroModal = '';
    this.abaCadastroFornecimento = 'vinculo';

    this.novoFornecimento = {
      idFornecedor: undefined,
      razaoSocialFornecedor: '',
      cnpjFornecedor: '',
      idServico: undefined,
      nomeServico: '',
      categoriaServico: '',
      valorCusto: '',
      unidadeCobranca: 'SERVICO',
      prazoExecucao: '',
      unidadePrazo: 'HORA',
      quantidadeMinima: 1,
      disponibilidade: 'SOB_DEMANDA',
      contratoReferencia: '',
      dataInicioVigencia: this.hojeInputDate(),
      dataFimVigencia: '',
      ativo: true,
      observacoes: ''
    };

    const el = document.getElementById('modalCadastroFornecimentoServico');

    if (!el) {
      console.error('Modal modalCadastroFornecimentoServico não encontrado.');
      return;
    }

    this.modalCadastro = bootstrap.Modal.getOrCreateInstance(el, {
      backdrop: 'static',
      keyboard: false
    });
    this.modalCadastro.show();
  }

  salvarNovoFornecimento(): void {
    const erroValidacao = this.validarFornecimento(this.novoFornecimento, true);

    if (erroValidacao) {
      this.mensagemErroModal = erroValidacao;
      return;
    }

    this.mensagemErroModal = '';
    const payload = this.montarPayload(this.novoFornecimento);

    this.fornecimentoServicoService.cadastrarFornecimentoServico(payload).subscribe({
      next: () => {
        this.modalCadastro?.hide();
        alert('Fornecimento de serviço cadastrado com sucesso.');
        this.recarregar();
      },
      error: (erro) => {
        console.error('Erro ao cadastrar fornecimento de serviço:', erro);
        this.mensagemErroModal = this.extrairMensagemErro(
          erro,
          'Erro ao cadastrar fornecimento de serviço.'
        );
      }
    });
  }

  abrirModalEdicao(item: FornecimentoServico): void {
    this.camposInvalidos = [];
    this.mensagemErroModal = '';
    this.abaEdicaoFornecimento = 'vinculo';
    this.editId = item.id ?? null;

    this.edit = {
      ...item,
      valorCusto: this.formatarMoedaBR(item.valorCusto),
      prazoExecucao: this.normalizarDecimalParaExibicao(item.prazoExecucao),
      dataInicioVigencia: this.asInputDateString(item.dataInicioVigencia),
      dataFimVigencia: this.asInputDateString(item.dataFimVigencia)
    };

    const el = document.getElementById('modalEdicaoFornecimentoServico');

    if (!el) {
      console.error('Modal modalEdicaoFornecimentoServico não encontrado.');
      return;
    }

    this.modalEdicao = bootstrap.Modal.getOrCreateInstance(el, {
      backdrop: 'static',
      keyboard: false
    });
    this.modalEdicao.show();
  }

  salvarEdicaoModal(): void {
    if (!this.editId) {
      return;
    }

    const erroValidacao = this.validarFornecimento(this.edit, true);

    if (erroValidacao) {
      this.mensagemErroModal = erroValidacao;
      return;
    }

    this.mensagemErroModal = '';
    const payload = this.montarPayload(this.edit);

    this.fornecimentoServicoService
      .atualizarFornecimentoServico(this.editId, payload)
      .subscribe({
        next: () => {
          this.modalEdicao?.hide();
          this.cancelarEdicao();
          alert('Fornecimento de serviço atualizado com sucesso.');
          this.recarregar();
        },
        error: (erro) => {
          console.error('Erro ao atualizar fornecimento de serviço:', erro);
          this.mensagemErroModal = this.extrairMensagemErro(
            erro,
            'Erro ao atualizar fornecimento de serviço.'
          );
        }
      });
  }

  cancelarEdicao(): void {
    this.editId = null;
    this.edit = {};
    this.fornecedorFiltro = '';
    this.servicoFiltro = '';
    this.camposInvalidos = [];
    this.mensagemErroModal = '';
  }

  abrirModalDetalhes(item: FornecimentoServico): void {
    this.fornecimentoDetalhe = item;

    const el = document.getElementById('modalDetalhesFornecimentoServico');

    if (!el) {
      console.error('Modal modalDetalhesFornecimentoServico não encontrado.');
      return;
    }

    this.modalDetalhes = bootstrap.Modal.getOrCreateInstance(el);
    this.modalDetalhes.show();
  }

  abrirConfirmacao(item: FornecimentoServico, tipo: TipoConfirmacao): void {
    this.fornecimentoAcao = item;
    this.tipoConfirmacao = tipo;

    const el = document.getElementById('modalConfirmacaoFornecimentoServico');

    if (!el) {
      console.error('Modal modalConfirmacaoFornecimentoServico não encontrado.');
      return;
    }

    this.modalConfirmacao = bootstrap.Modal.getOrCreateInstance(el);
    this.modalConfirmacao.show();
  }

  executarConfirmacao(): void {
    if (!this.fornecimentoAcao?.id) {
      return;
    }

    const id = this.fornecimentoAcao.id;

    if (this.tipoConfirmacao === 'ativar') {
      this.ativar(id);
      return;
    }

    if (this.tipoConfirmacao === 'inativar') {
      this.inativar(id);
      return;
    }

    this.excluir(id);
  }

  ativar(id?: number): void {
    if (!id) {
      return;
    }

    this.fornecimentoServicoService.ativarFornecimentoServico(id).subscribe({
      next: () => {
        this.modalConfirmacao?.hide();
        alert('Fornecimento de serviço ativado com sucesso.');
        this.recarregar();
      },
      error: (erro) => {
        console.error('Erro ao ativar fornecimento de serviço:', erro);
        alert(this.extrairMensagemErro(erro, 'Erro ao ativar fornecimento de serviço.'));
      }
    });
  }

  inativar(id?: number): void {
    if (!id) {
      return;
    }

    this.fornecimentoServicoService.inativarFornecimentoServico(id).subscribe({
      next: () => {
        this.modalConfirmacao?.hide();
        alert('Fornecimento de serviço inativado com sucesso.');
        this.recarregar();
      },
      error: (erro) => {
        console.error('Erro ao inativar fornecimento de serviço:', erro);
        alert(this.extrairMensagemErro(erro, 'Erro ao inativar fornecimento de serviço.'));
      }
    });
  }

  excluir(id?: number): void {
    if (!id) {
      return;
    }

    this.fornecimentoServicoService.removerFornecimentoServico(id).subscribe({
      next: () => {
        this.modalConfirmacao?.hide();
        alert('Fornecimento de serviço inativado com sucesso.');
        this.recarregar();
      },
      error: (erro) => {
        console.error('Erro ao remover fornecimento de serviço:', erro);
        alert(this.extrairMensagemErro(erro, 'Erro ao remover fornecimento de serviço.'));
      }
    });
  }

  voltar(): void {
    this.location.back();
  }

  // ======================================================
  // ABAS E VALIDAÇÃO VISUAL
  // ======================================================

  trocarAbaCadastroFornecimento(aba: AbaFornecimentoServico): void {
    this.abaCadastroFornecimento = aba;
  }

  trocarAbaEdicaoFornecimento(aba: AbaFornecimentoServico): void {
    this.abaEdicaoFornecimento = aba;
  }

  cadastroAbaAnterior(): void {
    const ordem: AbaFornecimentoServico[] = ['vinculo', 'condicoes', 'revisao'];
    const indice = ordem.indexOf(this.abaCadastroFornecimento);

    if (indice > 0) {
      this.abaCadastroFornecimento = ordem[indice - 1];
    }
  }

  cadastroAbaProxima(): void {
    const ordem: AbaFornecimentoServico[] = ['vinculo', 'condicoes', 'revisao'];
    const indice = ordem.indexOf(this.abaCadastroFornecimento);

    if (indice >= 0 && indice < ordem.length - 1) {
      this.abaCadastroFornecimento = ordem[indice + 1];
    }
  }

  edicaoAbaAnterior(): void {
    const ordem: AbaFornecimentoServico[] = ['vinculo', 'condicoes', 'revisao'];
    const indice = ordem.indexOf(this.abaEdicaoFornecimento);

    if (indice > 0) {
      this.abaEdicaoFornecimento = ordem[indice - 1];
    }
  }

  edicaoAbaProxima(): void {
    const ordem: AbaFornecimentoServico[] = ['vinculo', 'condicoes', 'revisao'];
    const indice = ordem.indexOf(this.abaEdicaoFornecimento);

    if (indice >= 0 && indice < ordem.length - 1) {
      this.abaEdicaoFornecimento = ordem[indice + 1];
    }
  }

  cadastroEhPrimeiraAba(): boolean {
    return this.abaCadastroFornecimento === 'vinculo';
  }

  cadastroEhUltimaAba(): boolean {
    return this.abaCadastroFornecimento === 'revisao';
  }

  edicaoEhPrimeiraAba(): boolean {
    return this.abaEdicaoFornecimento === 'vinculo';
  }

  edicaoEhUltimaAba(): boolean {
    return this.abaEdicaoFornecimento === 'revisao';
  }

  get cadastroProntoParaSalvar(): boolean {
    return this.validarFornecimento(this.novoFornecimento, false) === null;
  }

  get edicaoProntaParaSalvar(): boolean {
    return this.validarFornecimento(this.edit, false) === null;
  }

  get mensagemBloqueioCadastro(): string {
    return this.validarFornecimento(this.novoFornecimento, false) || '';
  }

  get mensagemBloqueioEdicao(): string {
    return this.validarFornecimento(this.edit, false) || '';
  }

  get progressoCadastroFornecimento(): number {
    return this.calcularProgresso(this.novoFornecimento);
  }

  get progressoEdicaoFornecimento(): number {
    return this.calcularProgresso(this.edit);
  }

  pendenciasCadastroAba(aba: AbaFornecimentoServico): number {
    return this.contarPendenciasAba(this.novoFornecimento, aba);
  }

  pendenciasEdicaoAba(aba: AbaFornecimentoServico): number {
    return this.contarPendenciasAba(this.edit, aba);
  }

  campoInvalido(campo: CampoObrigatorioFornecimentoServico): boolean {
    return this.camposInvalidos.includes(campo);
  }

  limparCampoInvalido(campo: CampoObrigatorioFornecimentoServico): void {
    if (!this.camposInvalidos.includes(campo)) {
      return;
    }

    this.camposInvalidos = this.camposInvalidos.filter(item => item !== campo);

    if (!this.camposInvalidos.length) {
      this.mensagemErroModal = '';
    }
  }

  vinculoPendente(model: Partial<FornecimentoServico>): boolean {
    return !model.idFornecedor || !model.idServico;
  }

  condicoesPendentes(model: Partial<FornecimentoServico>): boolean {
    return this.valorCustoInvalido(model) ||
      !String(model.unidadeCobranca ?? '').trim() ||
      this.prazoExecucaoInvalido(model) ||
      !String(model.unidadePrazo ?? '').trim() ||
      this.quantidadeMinimaInvalida(model) ||
      !String(model.disponibilidade ?? '').trim() ||
      this.vigenciaInvalida(model);
  }

  private calcularProgresso(model: Partial<FornecimentoServico>): number {
    const checks = [
      !!model.idFornecedor,
      !!model.idServico,
      !this.valorCustoInvalido(model),
      !!String(model.unidadeCobranca ?? '').trim(),
      !this.prazoExecucaoInvalido(model),
      !!String(model.unidadePrazo ?? '').trim(),
      !this.quantidadeMinimaInvalida(model),
      !!String(model.disponibilidade ?? '').trim(),
      !this.vigenciaInvalida(model)
    ];

    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }

  private contarPendenciasAba(model: Partial<FornecimentoServico>, aba: AbaFornecimentoServico): number {
    if (aba === 'vinculo') {
      let total = 0;
      if (!model.idFornecedor) total++;
      if (!model.idServico) total++;
      return total;
    }

    if (aba === 'condicoes') {
      let total = 0;
      if (this.valorCustoInvalido(model)) total++;
      if (!String(model.unidadeCobranca ?? '').trim()) total++;
      if (this.prazoExecucaoInvalido(model)) total++;
      if (!String(model.unidadePrazo ?? '').trim()) total++;
      if (this.quantidadeMinimaInvalida(model)) total++;
      if (!String(model.disponibilidade ?? '').trim()) total++;
      if (this.vigenciaInvalida(model)) total++;
      return total;
    }

    return 0;
  }

  private abaPorCampo(campo: CampoObrigatorioFornecimentoServico): AbaFornecimentoServico {
    if (campo === 'fornecedor' || campo === 'servico') {
      return 'vinculo';
    }

    return 'condicoes';
  }

  // ======================================================
  // FORNECEDORES
  // ======================================================

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

  abrirModalFornecedor(modo: ModoSelecao): void {
    this.modoSelecaoFornecedor = modo;
    this.modalOrigemFornecedor = modo;
    this.fornecedorFiltro = '';
    this.aplicarFiltroFornecedor();

    if (modo === 'cadastro') {
      this.modalCadastro?.hide();
    } else {
      this.modalEdicao?.hide();
    }

    setTimeout(() => {
      const el = document.getElementById('modalFornecedorFornecimentoServico');

      if (!el) {
        console.error('Modal modalFornecedorFornecimentoServico não encontrado.');
        return;
      }

      this.modalFornecedor = bootstrap.Modal.getOrCreateInstance(el, {
        backdrop: 'static',
        keyboard: false
      });
      this.modalFornecedor.show();
    }, 150);
  }

  aplicarFiltroFornecedor(): void {
    const t = this.normalizarTexto(this.fornecedorFiltro);
    const tNum = this.onlyDigits(this.fornecedorFiltro);

    if (!t) {
      this.fornecedoresFiltrados = [...this.fornecedores];
      return;
    }

    this.fornecedoresFiltrados = this.fornecedores.filter(fornecedor => {
      const razao = this.normalizarTexto(fornecedor.razaoSocial);
      const fantasia = this.normalizarTexto(fornecedor.nomeFantasia);
      const cnpj = this.onlyDigits(fornecedor.cnpj);
      const item = this.normalizarTexto((fornecedor as any).itemFornecido);

      return razao.includes(t) || fantasia.includes(t) || cnpj.includes(tNum) || item.includes(t);
    });
  }

  selecionarFornecedor(fornecedor: Fornecedor): void {
    if (!fornecedor.id) {
      return;
    }

    const target = this.modoSelecaoFornecedor === 'cadastro'
      ? this.novoFornecimento
      : this.edit;

    target.idFornecedor = fornecedor.id;
    target.razaoSocialFornecedor = fornecedor.razaoSocial;
    target.cnpjFornecedor = fornecedor.cnpj;

    this.limparCampoInvalido('fornecedor');
    this.modalFornecedor?.hide();
    this.restaurarModalOrigemFornecedor();
  }

  cancelarSelecaoFornecedor(): void {
    this.modalFornecedor?.hide();
    this.restaurarModalOrigemFornecedor();
  }

  private restaurarModalOrigemFornecedor(): void {
    const origem = this.modalOrigemFornecedor;
    this.modalOrigemFornecedor = null;

    setTimeout(() => {
      if (origem === 'cadastro') {
        const el = document.getElementById('modalCadastroFornecimentoServico');
        this.modalCadastro = el ? bootstrap.Modal.getOrCreateInstance(el, { backdrop: 'static', keyboard: false }) : this.modalCadastro;
        this.modalCadastro?.show();
      }

      if (origem === 'edicao') {
        const el = document.getElementById('modalEdicaoFornecimentoServico');
        this.modalEdicao = el ? bootstrap.Modal.getOrCreateInstance(el, { backdrop: 'static', keyboard: false }) : this.modalEdicao;
        this.modalEdicao?.show();
      }
    }, 150);
  }

  fornecedorTexto(model: Partial<FornecimentoServico>): string {
    return model.razaoSocialFornecedor || '';
  }

  // ======================================================
  // SERVIÇOS
  // ======================================================

  private carregarServicos(): void {
    this.servicoService.listarTodos().subscribe({
      next: (lista) => {
        this.servicos = lista ?? [];
        this.servicosFiltrados = [...this.servicos];
      },
      error: (erro) => {
        console.error('Erro ao carregar serviços:', erro);
      }
    });
  }

  abrirModalServico(modo: ModoSelecao): void {
    this.modoSelecaoServico = modo;
    this.modalOrigemServico = modo;
    this.servicoFiltro = '';
    this.aplicarFiltroServico();

    if (modo === 'cadastro') {
      this.modalCadastro?.hide();
    } else {
      this.modalEdicao?.hide();
    }

    setTimeout(() => {
      const el = document.getElementById('modalServicoFornecimentoServico');

      if (!el) {
        console.error('Modal modalServicoFornecimentoServico não encontrado.');
        return;
      }

      this.modalServico = bootstrap.Modal.getOrCreateInstance(el, {
        backdrop: 'static',
        keyboard: false
      });
      this.modalServico.show();
    }, 150);
  }

  aplicarFiltroServico(): void {
    const t = this.normalizarTexto(this.servicoFiltro);

    if (!t) {
      this.servicosFiltrados = [...this.servicos];
      return;
    }

    this.servicosFiltrados = this.servicos.filter(servico => {
      const nome = this.normalizarTexto(servico.nome);
      const categoria = this.normalizarTexto(servico.categoria);
      const prestador = this.normalizarTexto(servico.tipoDoPrestador);
      const cobranca = this.normalizarTexto(servico.unidadeCobranca);

      return nome.includes(t) || categoria.includes(t) || prestador.includes(t) || cobranca.includes(t);
    });
  }

  selecionarServico(servico: Servico): void {
    if (!servico.id) {
      return;
    }

    const target = this.modoSelecaoServico === 'cadastro'
      ? this.novoFornecimento
      : this.edit;

    target.idServico = servico.id;
    target.nomeServico = servico.nome;
    target.categoriaServico = servico.categoria;

    if (!target.unidadeCobranca && servico.unidadeCobranca) {
      target.unidadeCobranca = servico.unidadeCobranca;
    }

    if (!target.prazoExecucao && servico.duracaoEstimada) {
      target.prazoExecucao = this.normalizarDecimalParaExibicao(servico.duracaoEstimada);
    }

    if (!target.unidadePrazo && servico.unidadeDuracao) {
      target.unidadePrazo = String(servico.unidadeDuracao).toUpperCase();
    }

    this.limparCampoInvalido('servico');
    this.modalServico?.hide();
    this.restaurarModalOrigemServico();
  }

  cancelarSelecaoServico(): void {
    this.modalServico?.hide();
    this.restaurarModalOrigemServico();
  }

  private restaurarModalOrigemServico(): void {
    const origem = this.modalOrigemServico;
    this.modalOrigemServico = null;

    setTimeout(() => {
      if (origem === 'cadastro') {
        const el = document.getElementById('modalCadastroFornecimentoServico');
        this.modalCadastro = el ? bootstrap.Modal.getOrCreateInstance(el, { backdrop: 'static', keyboard: false }) : this.modalCadastro;
        this.modalCadastro?.show();
      }

      if (origem === 'edicao') {
        const el = document.getElementById('modalEdicaoFornecimentoServico');
        this.modalEdicao = el ? bootstrap.Modal.getOrCreateInstance(el, { backdrop: 'static', keyboard: false }) : this.modalEdicao;
        this.modalEdicao?.show();
      }
    }, 150);
  }

  servicoTexto(model: Partial<FornecimentoServico>): string {
    if (!model.nomeServico) {
      return '';
    }

    if (model.categoriaServico) {
      return `${model.nomeServico} - ${model.categoriaServico}`;
    }

    return model.nomeServico;
  }

  // ======================================================
  // FORMATAÇÕES E EXIBIÇÃO
  // ======================================================

  fornecimentoAtivo(item: Partial<FornecimentoServico>): boolean {
    const ativo = item.ativo;

    if (ativo === null || ativo === undefined) {
      return true;
    }

    if (typeof ativo === 'string') {
      const s = String(ativo).toLowerCase();
      return s === 'true' || s === 'ativo';
    }

    return Boolean(ativo);
  }

  fornecedorNome(item: Partial<FornecimentoServico>): string {
    return item.razaoSocialFornecedor || 'Fornecedor não informado';
  }

  servicoNome(item: Partial<FornecimentoServico>): string {
    return item.nomeServico || 'Serviço não informado';
  }

  statusBadgeClass(item: Partial<FornecimentoServico>): string {
    return this.fornecimentoAtivo(item) ? 'badge-status-ativo' : 'badge-status-inativo';
  }

  disponibilidadeBadgeClass(valor: string | null | undefined): string {
    const d = String(valor || '').toUpperCase();

    if (d === 'IMEDIATA') return 'badge-disponibilidade-imediata';
    if (d === 'AGENDAMENTO') return 'badge-disponibilidade-agendamento';
    if (d === 'INDISPONIVEL') return 'badge-disponibilidade-indisponivel';

    return 'badge-disponibilidade-demanda';
  }

  formatarValorCustoCadastro(): void {
    this.novoFornecimento.valorCusto = this.formatarMoedaBR(this.novoFornecimento.valorCusto);
    this.limparCampoInvalido('valorCusto');
  }

  formatarValorCustoEdicao(): void {
    this.edit.valorCusto = this.formatarMoedaBR(this.edit.valorCusto);
    this.limparCampoInvalido('valorCusto');
  }

  normalizarQuantidadeMinimaCadastro(): void {
    this.novoFornecimento.quantidadeMinima = this.quantidadeMinimaParaNumero(this.novoFornecimento);
    this.limparCampoInvalido('quantidadeMinima');
  }

  normalizarQuantidadeMinimaEdicao(): void {
    this.edit.quantidadeMinima = this.quantidadeMinimaParaNumero(this.edit);
    this.limparCampoInvalido('quantidadeMinima');
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

  converterMoedaParaNumero(valor: any): string {
    return this.moedaParaNumero(valor).toFixed(2);
  }

  formatarPrazo(item: Partial<FornecimentoServico>): string {
    const prazo = this.normalizarDecimalParaExibicao(item.prazoExecucao);
    const unidade = this.formatarUnidade(item.unidadePrazo);

    if (!prazo) {
      return '';
    }

    return `${prazo} ${unidade}`.trim();
  }

  formatarUnidade(unidade: string | null | undefined): string {
    if (!unidade) {
      return '';
    }

    const u = unidade.toUpperCase();

    if (u === 'MINUTO') return 'minuto(s)';
    if (u === 'HORA') return 'hora(s)';
    if (u === 'DIA') return 'dia(s)';
    if (u === 'SERVICO') return 'serviço';
    if (u === 'DIARIA') return 'diária';
    if (u === 'PACOTE') return 'pacote';
    if (u === 'UNIDADE') return 'unidade';

    return unidade;
  }

  formatarDisponibilidade(valor: string | null | undefined): string {
    if (!valor) {
      return '';
    }

    const v = valor.toUpperCase();

    if (v === 'SOB_DEMANDA') return 'Sob demanda';
    if (v === 'IMEDIATA') return 'Imediata';
    if (v === 'AGENDAMENTO') return 'Agendamento';
    if (v === 'INDISPONIVEL') return 'Indisponível';

    return valor;
  }

  formatarVigencia(item: Partial<FornecimentoServico>): string {
    const inicio = this.formatarDataBr(item.dataInicioVigencia);
    const fim = this.formatarDataBr(item.dataFimVigencia);

    if (inicio && fim) {
      return `${inicio} até ${fim}`;
    }

    if (inicio && !fim) {
      return `Desde ${inicio}`;
    }

    if (!inicio && fim) {
      return `Até ${fim}`;
    }

    return '—';
  }

  formatarDataBr(data: string | Date | null | undefined): string {
    const input = this.asInputDateString(data);

    if (!input) {
      return '';
    }

    const [ano, mes, dia] = input.split('-');

    return `${dia}/${mes}/${ano}`;
  }

  formatarCNPJ(cnpj?: string): string {
    const d = this.onlyDigits(cnpj);

    if (d.length !== 14) {
      return cnpj ?? '';
    }

    return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12, 14)}`;
  }

  capitalizar(texto: string | null | undefined): string {
    const valor = String(texto || '').trim();

    if (!valor) {
      return '';
    }

    return valor
      .split(' ')
      .filter(parte => parte.length > 0)
      .map(parte => parte.charAt(0).toUpperCase() + parte.slice(1).toLowerCase())
      .join(' ');
  }

  textoConfirmacao(): string {
    const item = this.fornecimentoAcao;

    if (!item) {
      return '';
    }

    if (this.tipoConfirmacao === 'ativar') {
      return `Confirma ativar o fornecimento do serviço ${this.servicoNome(item)} pelo fornecedor ${this.fornecedorNome(item)}?`;
    }

    if (this.tipoConfirmacao === 'inativar') {
      return `Confirma inativar o fornecimento do serviço ${this.servicoNome(item)} pelo fornecedor ${this.fornecedorNome(item)}?`;
    }

    return `Confirma a exclusão lógica deste fornecimento de serviço? Ele será marcado como inativo.`;
  }

  tituloConfirmacao(): string {
    if (this.tipoConfirmacao === 'ativar') return 'Ativar fornecimento';
    if (this.tipoConfirmacao === 'inativar') return 'Inativar fornecimento';
    return 'Excluir fornecimento';
  }

  iconeConfirmacao(): string {
    if (this.tipoConfirmacao === 'ativar') return 'bi-check-circle';
    if (this.tipoConfirmacao === 'inativar') return 'bi-pause-circle';
    return 'bi-trash';
  }

  classeBotaoConfirmacao(): string {
    if (this.tipoConfirmacao === 'ativar') return 'btn-success';
    if (this.tipoConfirmacao === 'inativar') return 'btn-warning';
    return 'btn-danger';
  }

  labelBotaoConfirmacao(): string {
    if (this.tipoConfirmacao === 'ativar') return 'Ativar';
    if (this.tipoConfirmacao === 'inativar') return 'Inativar';
    return 'Excluir';
  }

  // ======================================================
  // PAYLOAD E VALIDAÇÃO
  // ======================================================

  private validarFornecimento(
    model: Partial<FornecimentoServico>,
    marcarInvalidos: boolean
  ): string | null {
    const camposInvalidos: CampoObrigatorioFornecimentoServico[] = [];

    if (!model.idFornecedor) {
      camposInvalidos.push('fornecedor');
    }

    if (!model.idServico) {
      camposInvalidos.push('servico');
    }

    if (this.valorCustoInvalido(model)) {
      camposInvalidos.push('valorCusto');
    }

    if (!String(model.unidadeCobranca ?? '').trim()) {
      camposInvalidos.push('unidadeCobranca');
    }

    if (this.prazoExecucaoInvalido(model)) {
      camposInvalidos.push('prazoExecucao');
    }

    if (!String(model.unidadePrazo ?? '').trim()) {
      camposInvalidos.push('unidadePrazo');
    }

    if (this.quantidadeMinimaInvalida(model)) {
      camposInvalidos.push('quantidadeMinima');
    }

    if (!String(model.disponibilidade ?? '').trim()) {
      camposInvalidos.push('disponibilidade');
    }

    if (camposInvalidos.length) {
      if (marcarInvalidos) {
        this.camposInvalidos = camposInvalidos;
        const aba = this.abaPorCampo(camposInvalidos[0]);
        this.abaCadastroFornecimento = aba;
        this.abaEdicaoFornecimento = aba;
      }

      return this.mensagemCampoInvalido(camposInvalidos[0]);
    }

    if (this.vigenciaInvalida(model)) {
      if (marcarInvalidos) {
        this.camposInvalidos = [];
        this.abaCadastroFornecimento = 'condicoes';
        this.abaEdicaoFornecimento = 'condicoes';
      }

      return 'A data fim da vigência não pode ser anterior à data de início.';
    }

    if (marcarInvalidos) {
      this.camposInvalidos = [];
    }

    return null;
  }

  private mensagemCampoInvalido(campo: CampoObrigatorioFornecimentoServico): string {
    const mensagens: Record<CampoObrigatorioFornecimentoServico, string> = {
      fornecedor: 'Selecione um fornecedor.',
      servico: 'Selecione um serviço.',
      valorCusto: 'Informe um valor de custo válido, maior ou igual a zero.',
      unidadeCobranca: 'Informe a unidade de cobrança.',
      prazoExecucao: 'Informe um prazo de execução maior que zero.',
      unidadePrazo: 'Informe a unidade do prazo.',
      quantidadeMinima: 'Informe uma quantidade mínima maior ou igual a 1.',
      disponibilidade: 'Informe a disponibilidade.'
    };

    return mensagens[campo];
  }

  private valorCustoInvalido(model: Partial<FornecimentoServico>): boolean {
    const texto = String(model.valorCusto ?? '').trim();

    if (!texto) {
      return true;
    }

    const valor = this.moedaParaNumero(model.valorCusto);

    return Number.isNaN(valor) || valor < 0;
  }

  private prazoExecucaoInvalido(model: Partial<FornecimentoServico>): boolean {
    const texto = String(model.prazoExecucao ?? '').trim();

    if (!texto) {
      return true;
    }

    const prazo = Number(this.converterDecimalParaBackend(model.prazoExecucao));

    return Number.isNaN(prazo) || prazo <= 0;
  }

  private quantidadeMinimaInvalida(model: Partial<FornecimentoServico>): boolean {
    const valor = Number(model.quantidadeMinima ?? 0);

    return Number.isNaN(valor) || valor < 1;
  }

  private quantidadeMinimaParaNumero(model: Partial<FornecimentoServico>): number {
    const valor = Number(model.quantidadeMinima ?? 1);

    if (Number.isNaN(valor) || valor < 1) {
      return 1;
    }

    return Math.floor(valor);
  }

  private vigenciaInvalida(model: Partial<FornecimentoServico>): boolean {
    const dataInicio = this.asInputDateString(model.dataInicioVigencia);
    const dataFim = this.asInputDateString(model.dataFimVigencia);

    return !!(dataInicio && dataFim && dataFim < dataInicio);
  }

  private montarPayload(model: Partial<FornecimentoServico>): FornecimentoServicoRequest {
    return {
      idFornecedor: model.idFornecedor,
      idServico: model.idServico,
      valorCusto: this.converterMoedaParaNumero(model.valorCusto),
      unidadeCobranca: (model.unidadeCobranca || '').toString().toUpperCase(),
      prazoExecucao: this.converterDecimalParaBackend(model.prazoExecucao),
      unidadePrazo: (model.unidadePrazo || '').toString().toUpperCase(),
      quantidadeMinima: this.quantidadeMinimaParaNumero(model),
      disponibilidade: (model.disponibilidade || 'SOB_DEMANDA').toString().toUpperCase(),
      contratoReferencia: this.limparOpcional(model.contratoReferencia),
      dataInicioVigencia: this.asInputDateString(model.dataInicioVigencia) || null,
      dataFimVigencia: this.asInputDateString(model.dataFimVigencia) || null,
      ativo: model.ativo === null || model.ativo === undefined ? true : Boolean(model.ativo),
      observacoes: this.limparOpcional(model.observacoes)
    };
  }

  private converterDecimalParaBackend(valor: any): string {
    if (valor === null || valor === undefined || valor === '') {
      return '';
    }

    if (typeof valor === 'number') {
      return valor.toString();
    }

    let texto = String(valor)
      .replace(/\s/g, '')
      .trim();

    if (texto.includes(',')) {
      texto = texto.replace(/\./g, '').replace(',', '.');
    }

    return texto;
  }

  private normalizarDecimalParaExibicao(valor: any): string {
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

  private asInputDateString(data: any): string {
    if (!data) {
      return '';
    }

    if (typeof data === 'string') {
      if (/^\d{4}-\d{2}-\d{2}$/.test(data)) {
        return data;
      }

      const matchBr = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(data);

      if (matchBr) {
        return `${matchBr[3]}-${matchBr[2]}-${matchBr[1]}`;
      }

      const d = new Date(data);

      return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
    }

    if (data instanceof Date) {
      return data.toISOString().slice(0, 10);
    }

    return '';
  }

  private hojeInputDate(): string {
    return new Date().toISOString().slice(0, 10);
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

  private normalizarTexto(valor: any): string {
    return String(valor ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
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
