import { Component, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Peca, PecaService } from './exibe-peca.service';

declare var bootstrap: any;

type AbaPeca = 'dados' | 'classificacao' | 'revisao';
type DirecaoOrdenacao = 'asc' | 'desc';
type ColunaOrdenacaoPeca =
  | 'nome'
  | 'tipo'
  | 'especificacao'
  | 'fabricante'
  | 'modelo'
  | 'norma'
  | 'unidade';

type CampoObrigatorioPeca = 'nome' | 'fabricante' | 'unidade';

@Component({
  selector: 'app-exibe-peca',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './exibe-peca.component.html',
  styleUrls: ['./exibe-peca.component.css']
})
export class ExibePecaComponent implements OnInit {

  pecas: Peca[] = [];
  private todos: Peca[] = [];

  novaPeca: Partial<Peca> = this.novaPecaVazia();
  edit: Partial<Peca> = {};
  editId: number | null = null;
  pecaSelecionada: Peca | null = null;
  pecaParaExcluir: Peca | null = null;

  modalCadastro: any;
  modalEdicao: any;
  modalDetalhes: any;
  modalConfirmacaoExclusao: any;

  loading = false;
  errorMsg = '';
  mensagemErroModal = '';
  camposInvalidos: CampoObrigatorioPeca[] = [];

  filtroTexto = '';
  filtroTipo = '';
  filtroUnidade = '';

  paginaAtual = 1;
  itensPorPagina = 10;
  opcoesItensPorPagina = [5, 10, 20, 50];

  colunaOrdenacao: ColunaOrdenacaoPeca = 'nome';
  direcaoOrdenacao: DirecaoOrdenacao = 'asc';

  abaCadastroPeca: AbaPeca = 'dados';
  abaEdicaoPeca: AbaPeca = 'dados';

  readonly tiposPeca = [
    'Peça automotiva',
    'Lubrificante',
    'Fluido automotivo',
    'Consumível',
    'Acessório',
    'Ferramenta e equipamento',
    'Outro'
  ];

  readonly unidadesMedida = [
    'Unidade',
    'Litro',
    'Mililitro',
    'Quilograma',
    'Grama',
    'Metro',
    'Centímetro',
    'Par',
    'Jogo',
    'Kit',
    'Frasco',
    'Galão',
    'Caixa',
    'Pacote',
    'Outro'
  ];

  constructor(
    private readonly pecaService: PecaService,
    private readonly location: Location
  ) {}

  ngOnInit(): void {
    this.recarregar();
  }

  recarregar(): void {
    this.loading = true;
    this.errorMsg = '';

    this.pecaService.listarTodasPecas().subscribe({
      next: (lista) => {
        this.todos = (lista || []).map(p => this.normalizarPecaExibicao(p));
        this.pecas = [...this.todos];
        this.paginaAtual = 1;
        this.loading = false;
        this.cancelarEdicao();
      },
      error: (erro) => {
        console.error('Erro ao carregar peças:', erro);
        this.loading = false;
        this.errorMsg = this.extrairMensagemErro(erro, 'Falha ao carregar peças.');
      }
    });
  }

  voltar(): void {
    this.location.back();
  }

  get totalPecas(): number {
    return this.todos.length;
  }

  get totalTipos(): number {
    return new Set(this.todos.map(p => this.normalizarTexto(p.tipo)).filter(Boolean)).size;
  }

  get totalFabricantes(): number {
    return new Set(this.todos.map(p => this.normalizarTexto(p.fabricante)).filter(Boolean)).size;
  }

  get totalComNorma(): number {
    return this.todos.filter(p => !!String(p.norma || '').trim()).length;
  }

  get tiposParaFiltro(): string[] {
    const existentes = this.todos
      .map(p => this.capitalizarTexto(p.tipo))
      .filter(Boolean);

    return Array.from(new Set([...this.tiposPeca, ...existentes]))
      .sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }

  get unidadesParaFiltro(): string[] {
    const existentes = this.todos
      .map(p => this.capitalizarTexto(p.unidade))
      .filter(Boolean);

    return Array.from(new Set([...this.unidadesMedida, ...existentes]))
      .sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }

  get possuiFiltrosAplicados(): boolean {
    return !!(
      this.filtroTexto.trim() ||
      this.filtroTipo.trim() ||
      this.filtroUnidade.trim()
    );
  }

  get pecasFiltradas(): Peca[] {
    const texto = this.normalizarTexto(this.filtroTexto);
    const tipo = this.normalizarTexto(this.filtroTipo);
    const unidade = this.normalizarTexto(this.filtroUnidade);

    const filtradas = this.todos.filter(p => {
      const atendeTexto = !texto ||
        this.normalizarTexto(p.nome).includes(texto) ||
        this.normalizarTexto(p.tipo).includes(texto) ||
        this.normalizarTexto(p.especificacao).includes(texto) ||
        this.normalizarTexto(p.fabricante).includes(texto) ||
        this.normalizarTexto(p.modelo).includes(texto) ||
        this.normalizarTexto(p.norma).includes(texto) ||
        this.normalizarTexto(p.unidade).includes(texto);

      const atendeTipo = !tipo || this.normalizarTexto(p.tipo) === tipo;
      const atendeUnidade = !unidade || this.normalizarTexto(p.unidade) === unidade;

      return atendeTexto && atendeTipo && atendeUnidade;
    });

    return this.ordenarPecas(filtradas);
  }

  get totalRegistrosFiltrados(): number {
    return this.pecasFiltradas.length;
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

  get pecasPaginadas(): Peca[] {
    this.ajustarPaginaAtual();

    const inicio = (this.paginaAtual - 1) * this.itensPorPagina;
    const fim = inicio + this.itensPorPagina;

    return this.pecasFiltradas.slice(inicio, fim);
  }

  get cadastroPecaProntoParaSalvar(): boolean {
    return this.validarPeca(this.novaPeca) === null;
  }

  get edicaoPecaProntaParaSalvar(): boolean {
    return this.validarPeca(this.edit) === null;
  }

  get mensagemBloqueioCadastro(): string {
    return this.validarPeca(this.novaPeca) || '';
  }

  get mensagemBloqueioEdicao(): string {
    return this.validarPeca(this.edit) || '';
  }

  get progressoCadastroPeca(): number {
    return this.calcularProgressoPeca(this.novaPeca);
  }

  get progressoEdicaoPeca(): number {
    return this.calcularProgressoPeca(this.edit);
  }

  aoAlterarFiltros(): void {
    this.paginaAtual = 1;
  }

  limparFiltros(): void {
    this.filtroTexto = '';
    this.filtroTipo = '';
    this.filtroUnidade = '';
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
    const paginas: number[] = [];
    const inicio = Math.max(1, this.paginaAtual - 2);
    const fim = Math.min(this.totalPaginas, this.paginaAtual + 2);

    for (let i = inicio; i <= fim; i++) {
      paginas.push(i);
    }

    return paginas;
  }

  ordenarPor(coluna: ColunaOrdenacaoPeca): void {
    if (this.colunaOrdenacao === coluna) {
      this.direcaoOrdenacao = this.direcaoOrdenacao === 'asc' ? 'desc' : 'asc';
      return;
    }

    this.colunaOrdenacao = coluna;
    this.direcaoOrdenacao = 'asc';
  }

  iconeOrdenacao(coluna: ColunaOrdenacaoPeca): string {
    if (this.colunaOrdenacao !== coluna) {
      return 'bi-arrow-down-up';
    }

    return this.direcaoOrdenacao === 'asc' ? 'bi-sort-alpha-down' : 'bi-sort-alpha-up';
  }

  trackByPeca = (_: number, p: Peca) => p.id ?? `${p.nome}-${p.fabricante}-${p.modelo}`;

  abrirModalCadastro(): void {
    this.camposInvalidos = [];
    this.mensagemErroModal = '';
    this.abaCadastroPeca = 'dados';
    this.novaPeca = this.novaPecaVazia();

    const el = document.getElementById('modalCadastroPeca');

    if (!el) {
      console.error('Modal modalCadastroPeca não encontrado.');
      return;
    }

    this.modalCadastro = bootstrap.Modal.getOrCreateInstance(el);
    this.modalCadastro.show();
  }

  abrirModalEdicao(peca: Peca): void {
    this.camposInvalidos = [];
    this.mensagemErroModal = '';
    this.abaEdicaoPeca = 'dados';
    this.editId = peca.id ?? null;
    this.edit = { ...peca };

    const el = document.getElementById('modalEdicaoPeca');

    if (!el) {
      console.error('Modal modalEdicaoPeca não encontrado.');
      return;
    }

    this.modalEdicao = bootstrap.Modal.getOrCreateInstance(el);
    this.modalEdicao.show();
  }

  abrirDetalhes(peca: Peca): void {
    this.pecaSelecionada = peca;

    const el = document.getElementById('modalDetalhesPeca');

    if (!el) {
      console.error('Modal modalDetalhesPeca não encontrado.');
      return;
    }

    this.modalDetalhes = bootstrap.Modal.getOrCreateInstance(el);
    this.modalDetalhes.show();
  }

  trocarAbaCadastroPeca(aba: AbaPeca): void {
    this.abaCadastroPeca = aba;
  }

  trocarAbaEdicaoPeca(aba: AbaPeca): void {
    this.abaEdicaoPeca = aba;
  }

  proximaAbaCadastro(): void {
    if (this.abaCadastroPeca === 'dados') {
      this.abaCadastroPeca = 'classificacao';
      return;
    }

    if (this.abaCadastroPeca === 'classificacao') {
      this.abaCadastroPeca = 'revisao';
    }
  }

  abaAnteriorCadastro(): void {
    if (this.abaCadastroPeca === 'revisao') {
      this.abaCadastroPeca = 'classificacao';
      return;
    }

    if (this.abaCadastroPeca === 'classificacao') {
      this.abaCadastroPeca = 'dados';
    }
  }

  proximaAbaEdicao(): void {
    if (this.abaEdicaoPeca === 'dados') {
      this.abaEdicaoPeca = 'classificacao';
      return;
    }

    if (this.abaEdicaoPeca === 'classificacao') {
      this.abaEdicaoPeca = 'revisao';
    }
  }

  abaAnteriorEdicao(): void {
    if (this.abaEdicaoPeca === 'revisao') {
      this.abaEdicaoPeca = 'classificacao';
      return;
    }

    if (this.abaEdicaoPeca === 'classificacao') {
      this.abaEdicaoPeca = 'dados';
    }
  }

  salvarNovaPeca(): void {
    const erro = this.validarPeca(this.novaPeca);

    if (erro) {
      this.mensagemErroModal = erro;
      this.camposInvalidos = this.camposObrigatoriosInvalidos(this.novaPeca);
      this.abaCadastroPeca = 'dados';
      return;
    }

    const payload = this.montarPayloadCadastro(this.novaPeca);

    this.pecaService.cadastrar(payload).subscribe({
      next: () => {
        this.modalCadastro?.hide();
        alert('Peça cadastrada com sucesso.');
        this.recarregar();
      },
      error: (erroResponse) => {
        console.error('Erro ao cadastrar peça:', erroResponse);
        this.mensagemErroModal = this.extrairMensagemErro(erroResponse, 'Erro ao cadastrar peça.');
      }
    });
  }

  salvarEdicaoModal(): void {
    if (!this.editId) {
      return;
    }

    const erro = this.validarPeca(this.edit);

    if (erro) {
      this.mensagemErroModal = erro;
      this.camposInvalidos = this.camposObrigatoriosInvalidos(this.edit);
      this.abaEdicaoPeca = 'dados';
      return;
    }

    const payload = this.montarPayloadEdicao(this.edit);

    this.pecaService.atualizarPeca(this.editId, payload).subscribe({
      next: () => {
        this.modalEdicao?.hide();
        this.cancelarEdicao();
        alert('Peça atualizada com sucesso.');
        this.recarregar();
      },
      error: (erroResponse) => {
        console.error('Erro ao salvar alterações da peça:', erroResponse);
        this.mensagemErroModal = this.extrairMensagemErro(erroResponse, 'Erro ao salvar alterações da peça.');
      }
    });
  }

  cancelarEdicao(): void {
    this.editId = null;
    this.edit = {};
  }

  abrirConfirmacaoExclusao(peca: Peca): void {
    this.pecaParaExcluir = peca;

    const el = document.getElementById('modalConfirmacaoExclusaoPeca');

    if (!el) {
      console.error('Modal modalConfirmacaoExclusaoPeca não encontrado.');
      return;
    }

    this.modalConfirmacaoExclusao = bootstrap.Modal.getOrCreateInstance(el);
    this.modalConfirmacaoExclusao.show();
  }

  excluir(id?: number): void {
    const peca = this.todos.find(item => item.id === id);

    if (peca) {
      this.abrirConfirmacaoExclusao(peca);
      return;
    }

    if (id) {
      this.pecaParaExcluir = { id, nome: 'Peça selecionada', fabricante: '', unidade: '' };
      this.confirmarExclusao();
    }
  }

  confirmarExclusao(): void {
    const id = this.pecaParaExcluir?.id;

    if (!id) {
      return;
    }

    this.pecaService.removerPeca(id).subscribe({
      next: () => {
        this.modalConfirmacaoExclusao?.hide();
        this.pecaParaExcluir = null;
        alert('Peça removida com sucesso.');
        this.recarregar();
      },
      error: (erro) => {
        console.error('Erro ao excluir peça:', erro);
        alert(this.extrairMensagemErro(erro, 'Erro ao excluir peça.'));
      }
    });
  }

  campoMarcadoInvalido(model: Partial<Peca>, campo: CampoObrigatorioPeca): boolean {
    return this.camposInvalidos.includes(campo) && this.campoTextoInvalido(model[campo]);
  }

  dadosPecaPendentes(model: Partial<Peca>): boolean {
    return this.campoTextoInvalido(model.nome) ||
      this.campoTextoInvalido(model.fabricante) ||
      this.campoTextoInvalido(model.unidade);
  }

  classificacaoIncompleta(model: Partial<Peca>): boolean {
    return !String(model.tipo || '').trim() ||
      !String(model.especificacao || '').trim() ||
      !String(model.modelo || '').trim() ||
      !String(model.norma || '').trim();
  }

  normalizarCampoCapitalizado(model: Partial<Peca>, campo: keyof Peca): void {
    const valor = model[campo];

    if (typeof valor === 'string') {
      (model as any)[campo] = this.capitalizarTexto(valor);
    }
  }

  normalizarCampoCaixaAlta(model: Partial<Peca>, campo: keyof Peca): void {
    const valor = model[campo];

    if (typeof valor === 'string') {
      (model as any)[campo] = this.caixaAltaTexto(valor);
    }
  }

  aoSairCampoCapitalizar(model: Partial<Peca>, campo: keyof Peca): void {
    this.normalizarCampoCapitalizado(model, campo);
  }

  aoSairCampoCaixaAlta(model: Partial<Peca>, campo: keyof Peca): void {
    this.normalizarCampoCaixaAlta(model, campo);
  }

  exibirCapitalizado(valor: string | null | undefined): string {
    return this.capitalizarTexto(valor) || '—';
  }

  exibirCaixaAlta(valor: string | null | undefined): string {
    return this.caixaAltaTexto(valor) || '—';
  }


  tipoForaDaLista(tipo?: string): boolean {
    return !!tipo && !this.tiposPeca.includes(tipo);
  }

  unidadeForaDaLista(unidade?: string): boolean {
    return !!unidade && !this.unidadesMedida.includes(unidade);
  }

  tipoBadgeClass(tipo?: string): string {
    const normalizado = this.normalizarTexto(tipo);

    if (normalizado.includes('lubrificante')) {
      return 'badge-lubrificante';
    }

    if (normalizado.includes('fluido')) {
      return 'badge-fluido';
    }

    if (normalizado.includes('consumivel')) {
      return 'badge-consumivel';
    }

    if (normalizado.includes('acessorio')) {
      return 'badge-acessorio';
    }

    if (normalizado.includes('ferramenta')) {
      return 'badge-ferramenta';
    }

    return 'badge-peca';
  }

  private ajustarPaginaAtual(): void {
    if (this.paginaAtual > this.totalPaginas) {
      this.paginaAtual = this.totalPaginas;
    }

    if (this.paginaAtual < 1) {
      this.paginaAtual = 1;
    }
  }

  private ordenarPecas(lista: Peca[]): Peca[] {
    return [...lista].sort((a, b) => {
      const va = this.valorOrdenacao(a, this.colunaOrdenacao);
      const vb = this.valorOrdenacao(b, this.colunaOrdenacao);
      const comparacao = va.localeCompare(vb, 'pt-BR', { numeric: true, sensitivity: 'base' });

      return this.direcaoOrdenacao === 'asc' ? comparacao : -comparacao;
    });
  }

  private valorOrdenacao(peca: Peca, coluna: ColunaOrdenacaoPeca): string {
    return String((peca as any)[coluna] ?? '').trim();
  }

  private novaPecaVazia(): Partial<Peca> {
    return {
      nome: '',
      tipo: '',
      especificacao: '',
      fabricante: '',
      modelo: '',
      norma: '',
      unidade: ''
    };
  }

  private validarPeca(model: Partial<Peca>): string | null {
    if (this.campoTextoInvalido(model.nome)) {
      return 'Informe o nome da peça ou insumo.';
    }

    if (this.campoTextoInvalido(model.fabricante)) {
      return 'Informe o fabricante da peça ou insumo.';
    }

    if (this.campoTextoInvalido(model.unidade)) {
      return 'Selecione a unidade de medida.';
    }

    return null;
  }

  private camposObrigatoriosInvalidos(model: Partial<Peca>): CampoObrigatorioPeca[] {
    const campos: CampoObrigatorioPeca[] = ['nome', 'fabricante', 'unidade'];

    return campos.filter(campo => this.campoTextoInvalido(model[campo]));
  }

  private campoTextoInvalido(valor: any): boolean {
    return !String(valor ?? '').trim();
  }

  private calcularProgressoPeca(model: Partial<Peca>): number {
    const campos = [
      model.nome,
      model.fabricante,
      model.unidade,
      model.tipo,
      model.especificacao,
      model.modelo,
      model.norma
    ];

    const preenchidos = campos.filter(valor => !!String(valor ?? '').trim()).length;

    return Math.round((preenchidos / campos.length) * 100);
  }

  private montarPayloadCadastro(model: Partial<Peca>): Omit<Peca, 'id'> {
    return {
      nome: this.capitalizarTexto(model.nome),
      tipo: this.capitalizarTexto(model.tipo),
      especificacao: this.caixaAltaTexto(model.especificacao),
      fabricante: this.capitalizarTexto(model.fabricante),
      modelo: this.capitalizarTexto(model.modelo),
      norma: this.caixaAltaTexto(model.norma),
      unidade: this.capitalizarTexto(model.unidade)
    };
  }

  private montarPayloadEdicao(model: Partial<Peca>): Partial<Peca> {
    return {
      nome: this.capitalizarTexto(model.nome),
      tipo: this.capitalizarTexto(model.tipo),
      especificacao: this.caixaAltaTexto(model.especificacao),
      fabricante: this.capitalizarTexto(model.fabricante),
      modelo: this.capitalizarTexto(model.modelo),
      norma: this.caixaAltaTexto(model.norma),
      unidade: this.capitalizarTexto(model.unidade)
    };
  }

  private normalizarPecaExibicao(peca: Peca): Peca {
    return {
      ...peca,
      nome: this.capitalizarTexto(peca.nome),
      tipo: this.capitalizarTexto(peca.tipo),
      especificacao: this.caixaAltaTexto(peca.especificacao),
      fabricante: this.capitalizarTexto(peca.fabricante),
      modelo: this.capitalizarTexto(peca.modelo),
      norma: this.caixaAltaTexto(peca.norma),
      unidade: this.capitalizarTexto(peca.unidade)
    };
  }

  private capitalizarTexto(valor: string | null | undefined): string {
    const texto = (valor ?? '').toString().replace(/\s+/g, ' ').trim();

    if (!texto) {
      return '';
    }

    return texto
      .split(' ')
      .map(parte => {
        if (!parte) {
          return '';
        }

        if (/^(i|ii|iii|iv|v|vi|vii|viii|ix|x)$/i.test(parte)) {
          return parte.toUpperCase();
        }

        const minusculo = parte.toLowerCase();
        return minusculo.charAt(0).toUpperCase() + minusculo.slice(1);
      })
      .join(' ');
  }

  private caixaAltaTexto(valor: string | null | undefined): string {
    return (valor ?? '').toString().replace(/\s+/g, ' ').trim().toUpperCase();
  }

  private normalizarTexto(valor: any): string {
    return (valor ?? '')
      .toString()
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
