import { Component, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import {
  ExibeFornecedorService,
  Fornecedor
} from './exibe-fornecedor.service';

declare var bootstrap: any;

type AbaFornecedor = 'dados' | 'contato' | 'endereco' | 'revisao';
type DirecaoOrdenacao = 'asc' | 'desc';
type ColunaOrdenacaoFornecedor =
  | 'cnpj'
  | 'razaoSocial'
  | 'nomeFantasia'
  | 'itemFornecido'
  | 'email'
  | 'telefone'
  | 'cidade'
  | 'estado'
  | 'fundacao';

type CampoObrigatorioFornecedor =
  | 'cnpj'
  | 'razaoSocial'
  | 'nomeFantasia'
  | 'itemFornecido'
  | 'telefone'
  | 'email'
  | 'fundacao'
  | 'cep'
  | 'logradouro'
  | 'bairro'
  | 'cidade'
  | 'estado'
  | 'numeroEndereco';

@Component({
  selector: 'app-exibe-fornecedor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './exibe-fornecedor.component.html',
  styleUrls: ['./exibe-fornecedor.component.css']
})
export class ExibeFornecedorComponent implements OnInit {

  fornecedores: Fornecedor[] = [];
  private todos: Fornecedor[] = [];

  novoFornecedor: Partial<Fornecedor> = {};
  edit: Partial<Fornecedor> = {};
  editId: number | null = null;

  fornecedorDetalhes: Fornecedor | null = null;
  fornecedorParaExcluir: Fornecedor | null = null;

  modalCadastro: any;
  modalEdicao: any;
  modalDetalhes: any;
  modalConfirmacao: any;

  loading = false;
  errorMsg = '';
  mensagemErroModal = '';
  mensagemCepCadastro = '';
  mensagemCepEdicao = '';
  buscandoCepCadastro = false;
  buscandoCepEdicao = false;

  camposInvalidos: CampoObrigatorioFornecedor[] = [];

  filtroTexto = '';
  filtroEstado = '';
  filtroItemFornecido = '';

  readonly opcoesItemFornecidoFornecedor = [
    'Peças automotivas',
    'Óleos e lubrificantes',
    'Fluidos automotivos',
    'Peças e lubrificantes',
    'Serviços automotivos',
    'Equipamentos e ferramentas',
    'Materiais de consumo',
    'Outros'
  ];

  paginaAtual = 1;
  itensPorPagina = 10;
  opcoesItensPorPagina = [5, 10, 20, 50];

  colunaOrdenacao: ColunaOrdenacaoFornecedor = 'razaoSocial';
  direcaoOrdenacao: DirecaoOrdenacao = 'asc';

  abaCadastroFornecedor: AbaFornecedor = 'dados';
  abaEdicaoFornecedor: AbaFornecedor = 'dados';

  private readonly camposObrigatorios: CampoObrigatorioFornecedor[] = [
    'cnpj',
    'razaoSocial',
    'nomeFantasia',
    'itemFornecido',
    'telefone',
    'email',
    'fundacao',
    'cep',
    'logradouro',
    'bairro',
    'cidade',
    'estado',
    'numeroEndereco'
  ];

  constructor(
    private readonly fornecedorService: ExibeFornecedorService,
    private readonly http: HttpClient,
    private readonly location: Location
  ) {}

  ngOnInit(): void {
    this.recarregar();
  }

  recarregar(): void {
    this.loading = true;
    this.errorMsg = '';

    this.fornecedorService.listarTodos().subscribe({
      next: (lista) => {
        this.todos = (lista || []).map(f => this.normalizarFornecedorParaTela(f));
        this.fornecedores = [...this.todos];
        this.paginaAtual = 1;
        this.loading = false;
        this.cancelarEdicao();
      },
      error: (err) => {
        console.error(err);
        this.loading = false;
        this.errorMsg = this.extrairMensagemErro(
          err,
          'Falha ao carregar fornecedores.'
        );
      }
    });
  }

  get totalFornecedores(): number {
    return this.todos.length;
  }

  get totalEstadosAtendidos(): number {
    return new Set(
      this.todos
        .map(f => (f.estado || '').toUpperCase().trim())
        .filter(Boolean)
    ).size;
  }

  get totalCidadesAtendidas(): number {
    return new Set(
      this.todos
        .map(f => this.normalizarTexto(f.cidade))
        .filter(Boolean)
    ).size;
  }

  get totalComContato(): number {
    return this.todos.filter(f => this.telefoneValido(f.telefone) && this.emailValido(f.email)).length;
  }

  get estadosDisponiveis(): string[] {
    return Array.from(
      new Set(
        this.todos
          .map(f => (f.estado || '').toUpperCase().trim())
          .filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }

  get itensFornecidosDisponiveis(): string[] {
    const itensCadastradosForaDoPadrao = Array.from(
      new Set(
        this.todos
          .map(f => (f.itemFornecido || '').trim())
          .filter(Boolean)
          .filter(item => !this.opcoesItemFornecidoFornecedor.some(opcao =>
            this.normalizarTexto(opcao) === this.normalizarTexto(item)
          ))
      )
    ).sort((a, b) => a.localeCompare(b, 'pt-BR'));

    return [
      ...this.opcoesItemFornecidoFornecedor,
      ...itensCadastradosForaDoPadrao
    ];
  }

  get possuiFiltrosAplicados(): boolean {
    return !!(
      this.filtroTexto.trim() ||
      this.filtroEstado.trim() ||
      this.filtroItemFornecido.trim()
    );
  }

  get fornecedoresFiltrados(): Fornecedor[] {
    const texto = this.normalizarTexto(this.filtroTexto);
    const textoNumerico = this.onlyDigits(this.filtroTexto);
    const estado = (this.filtroEstado || '').toUpperCase().trim();
    const item = this.normalizarTexto(this.filtroItemFornecido);

    const filtrados = this.todos.filter(f => {
      const atendeTexto = !texto ||
        this.onlyDigits(f.cnpj).includes(textoNumerico) ||
        this.normalizarTexto(this.formatarCNPJ(f.cnpj)).includes(texto) ||
        this.normalizarTexto(f.razaoSocial).includes(texto) ||
        this.normalizarTexto(f.nomeFantasia).includes(texto) ||
        this.normalizarTexto(f.itemFornecido).includes(texto) ||
        this.normalizarTexto(f.email).includes(texto) ||
        this.normalizarTexto(f.telefone).includes(texto) ||
        this.onlyDigits(f.telefone).includes(textoNumerico) ||
        this.normalizarTexto(f.cidade).includes(texto) ||
        this.normalizarTexto(f.estado).includes(texto);

      const atendeEstado = !estado || (f.estado || '').toUpperCase().trim() === estado;
      const atendeItem = !item || this.normalizarTexto(f.itemFornecido) === item;

      return atendeTexto && atendeEstado && atendeItem;
    });

    return this.ordenarFornecedores(filtrados);
  }

  get totalRegistrosFiltrados(): number {
    return this.fornecedoresFiltrados.length;
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

  get fornecedoresPaginados(): Fornecedor[] {
    this.ajustarPaginaAtual();

    const inicio = (this.paginaAtual - 1) * this.itensPorPagina;
    const fim = inicio + this.itensPorPagina;

    return this.fornecedoresFiltrados.slice(inicio, fim);
  }

  get progressoCadastroFornecedor(): number {
    return this.calcularProgresso(this.novoFornecedor);
  }

  get progressoEdicaoFornecedor(): number {
    return this.calcularProgresso(this.edit);
  }

  get cadastroFornecedorProntoParaSalvar(): boolean {
    return this.validarFornecedor(this.novoFornecedor) === null;
  }

  get edicaoFornecedorProntaParaSalvar(): boolean {
    return this.validarFornecedor(this.edit) === null;
  }

  get mensagemBloqueioCadastro(): string {
    return this.validarFornecedor(this.novoFornecedor) || '';
  }

  get mensagemBloqueioEdicao(): string {
    return this.validarFornecedor(this.edit) || '';
  }

  filtrar(term: string): void {
    this.filtroTexto = term;
    this.aoAlterarFiltros();
  }

  aoAlterarFiltros(): void {
    this.paginaAtual = 1;
  }

  limparFiltros(): void {
    this.filtroTexto = '';
    this.filtroEstado = '';
    this.filtroItemFornecido = '';
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

  ordenarPor(coluna: ColunaOrdenacaoFornecedor): void {
    if (this.colunaOrdenacao === coluna) {
      this.direcaoOrdenacao = this.direcaoOrdenacao === 'asc' ? 'desc' : 'asc';
      return;
    }

    this.colunaOrdenacao = coluna;
    this.direcaoOrdenacao = 'asc';
  }

  iconeOrdenacao(coluna: ColunaOrdenacaoFornecedor): string {
    if (this.colunaOrdenacao !== coluna) {
      return 'bi-arrow-down-up';
    }

    return this.direcaoOrdenacao === 'asc' ? 'bi-sort-up' : 'bi-sort-down';
  }

  trackByFornecedor = (_: number, f: Fornecedor) => f.id ?? f.cnpj;

  abrirModalCadastro(): void {
    this.camposInvalidos = [];
    this.mensagemErroModal = '';
    this.mensagemCepCadastro = '';
    this.abaCadastroFornecedor = 'dados';

    this.novoFornecedor = {
      cnpj: '',
      razaoSocial: '',
      nomeFantasia: '',
      itemFornecido: '',
      telefone: '',
      email: '',
      fundacao: '',
      cep: '',
      logradouro: '',
      bairro: '',
      cidade: '',
      estado: '',
      complementoEndereco: '',
      numeroEndereco: ''
    };

    const el = document.getElementById('modalCadastroFornecedor');

    if (!el) {
      console.error('Modal modalCadastroFornecedor não encontrado.');
      return;
    }

    this.modalCadastro = bootstrap.Modal.getOrCreateInstance(el, {
      backdrop: 'static',
      keyboard: false
    });
    this.modalCadastro.show();
  }

  salvarNovoFornecedor(): void {
    const erro = this.validarFornecedor(this.novoFornecedor);

    if (erro) {
      this.camposInvalidos = this.camposObrigatorios.filter(campo => this.campoInvalido(this.novoFornecedor, campo));
      this.mensagemErroModal = erro;
      this.abaCadastroFornecedor = this.abaComPendencia(this.novoFornecedor) || 'dados';
      return;
    }

    const payload = this.montarPayloadFornecedor(this.novoFornecedor);

    this.fornecedorService.cadastrarFornecedor(payload).subscribe({
      next: () => {
        this.modalCadastro?.hide();
        this.mensagemErroModal = '';
        alert('Fornecedor cadastrado com sucesso.');
        this.recarregar();
      },
      error: (err) => {
        console.error(err);
        this.mensagemErroModal = this.extrairMensagemErro(
          err,
          'Erro ao cadastrar fornecedor.'
        );
      }
    });
  }

  abrirModalEdicao(fornecedor: Fornecedor): void {
    this.camposInvalidos = [];
    this.mensagemErroModal = '';
    this.mensagemCepEdicao = '';
    this.abaEdicaoFornecedor = 'dados';
    this.editId = fornecedor.id ?? null;

    this.edit = {
      ...fornecedor,
      fundacao: this.asInputDateString(fornecedor.fundacao),
      cnpj: this.formatarCNPJ(fornecedor.cnpj),
      cep: this.formatarCEP(fornecedor.cep),
      telefone: this.exibirTelefoneFormatado(fornecedor.telefone),
      estado: (fornecedor.estado || '').toUpperCase()
    };

    const el = document.getElementById('modalEdicaoFornecedor');

    if (!el) {
      console.error('Modal modalEdicaoFornecedor não encontrado.');
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

    const erro = this.validarFornecedor(this.edit);

    if (erro) {
      this.camposInvalidos = this.camposObrigatorios.filter(campo => this.campoInvalido(this.edit, campo));
      this.mensagemErroModal = erro;
      this.abaEdicaoFornecedor = this.abaComPendencia(this.edit) || 'dados';
      return;
    }

    const payload = this.montarPayloadFornecedor(this.edit);

    this.fornecedorService.atualizarFornecedor(this.editId, payload).subscribe({
      next: () => {
        this.modalEdicao?.hide();
        this.cancelarEdicao();
        alert('Fornecedor atualizado com sucesso.');
        this.recarregar();
      },
      error: (err) => {
        console.error(err);
        this.mensagemErroModal = this.extrairMensagemErro(
          err,
          'Erro ao salvar alterações do fornecedor.'
        );
      }
    });
  }

  cancelarEdicao(): void {
    this.editId = null;
    this.edit = {};
  }

  abrirDetalhes(fornecedor: Fornecedor): void {
    this.fornecedorDetalhes = fornecedor;

    const el = document.getElementById('modalDetalhesFornecedor');

    if (!el) {
      console.error('Modal modalDetalhesFornecedor não encontrado.');
      return;
    }

    this.modalDetalhes = bootstrap.Modal.getOrCreateInstance(el);
    this.modalDetalhes.show();
  }

  solicitarRemocao(fornecedor: Fornecedor): void {
    this.fornecedorParaExcluir = fornecedor;

    const el = document.getElementById('modalConfirmarExclusaoFornecedor');

    if (!el) {
      console.error('Modal modalConfirmarExclusaoFornecedor não encontrado.');
      return;
    }

    this.modalConfirmacao = bootstrap.Modal.getOrCreateInstance(el);
    this.modalConfirmacao.show();
  }

  confirmarRemocao(): void {
    if (!this.fornecedorParaExcluir?.id) {
      return;
    }

    const id = this.fornecedorParaExcluir.id;

    this.fornecedorService.removerFornecedor(id).subscribe({
      next: () => {
        this.modalConfirmacao?.hide();
        this.fornecedorParaExcluir = null;
        alert('Fornecedor removido com sucesso.');
        this.recarregar();
      },
      error: (err) => {
        console.error(err);
        alert(
          this.extrairMensagemErro(
            err,
            'Erro ao remover fornecedor.'
          )
        );
      }
    });
  }

  remover(id?: number): void {
    const fornecedor = this.todos.find(f => f.id === id);

    if (!fornecedor) {
      return;
    }

    this.solicitarRemocao(fornecedor);
  }

  trocarAbaCadastroFornecedor(aba: AbaFornecedor): void {
    this.abaCadastroFornecedor = aba;
  }

  trocarAbaEdicaoFornecedor(aba: AbaFornecedor): void {
    this.abaEdicaoFornecedor = aba;
  }

  proximaAbaCadastro(): void {
    this.abaCadastroFornecedor = this.proximaAba(this.abaCadastroFornecedor);
  }

  abaAnteriorCadastro(): void {
    this.abaCadastroFornecedor = this.abaAnterior(this.abaCadastroFornecedor);
  }

  proximaAbaEdicao(): void {
    this.abaEdicaoFornecedor = this.proximaAba(this.abaEdicaoFornecedor);
  }

  abaAnteriorEdicao(): void {
    this.abaEdicaoFornecedor = this.abaAnterior(this.abaEdicaoFornecedor);
  }

  onCepBlurCadastro(): void {
    this.consultarCep(this.novoFornecedor, 'cadastro');
  }

  onCepBlurEdicao(): void {
    this.consultarCep(this.edit, 'edicao');
  }

  dadosFornecedorPendentes(model: Partial<Fornecedor>): boolean {
    return this.cnpjInvalido(model) ||
      this.campoTextoInvalido(model.razaoSocial) ||
      this.campoTextoInvalido(model.nomeFantasia) ||
      this.itemFornecidoInvalido(model) ||
      this.fundacaoInvalida(model);
  }

  contatoFornecedorPendente(model: Partial<Fornecedor>): boolean {
    return this.telefoneInvalido(model) || this.emailInvalido(model);
  }

  enderecoFornecedorPendente(model: Partial<Fornecedor>): boolean {
    return this.cepInvalido(model) ||
      this.campoTextoInvalido(model.logradouro) ||
      this.campoTextoInvalido(model.bairro) ||
      this.campoTextoInvalido(model.cidade) ||
      this.estadoInvalido(model) ||
      this.campoTextoInvalido(model.numeroEndereco);
  }

  campoInvalido(model: Partial<Fornecedor>, campo: CampoObrigatorioFornecedor): boolean {
    switch (campo) {
      case 'cnpj':
        return this.cnpjInvalido(model);
      case 'telefone':
        return this.telefoneInvalido(model);
      case 'email':
        return this.emailInvalido(model);
      case 'itemFornecido':
        return this.itemFornecidoInvalido(model);
      case 'cep':
        return this.cepInvalido(model);
      case 'estado':
        return this.estadoInvalido(model);
      case 'fundacao':
        return this.fundacaoInvalida(model);
      default:
        return this.campoTextoInvalido(model[campo]);
    }
  }

  campoMarcadoInvalido(model: Partial<Fornecedor>, campo: CampoObrigatorioFornecedor): boolean {
    return this.camposInvalidos.includes(campo) && this.campoInvalido(model, campo);
  }

  cnpjInvalido(model: Partial<Fornecedor>): boolean {
    return !this.validarCNPJ(model.cnpj);
  }

  itemFornecidoInvalido(model: Partial<Fornecedor>): boolean {
    const item = (model.itemFornecido || '').toString().trim();

    if (!item) {
      return true;
    }

    return !this.opcoesItemFornecidoFornecedor.some(opcao =>
      this.normalizarTexto(opcao) === this.normalizarTexto(item)
    );
  }

  telefoneInvalido(model: Partial<Fornecedor>): boolean {
    return !this.telefoneValido(model.telefone);
  }

  emailInvalido(model: Partial<Fornecedor>): boolean {
    return !this.emailValido(model.email);
  }

  cepInvalido(model: Partial<Fornecedor>): boolean {
    return this.onlyDigits(model.cep).length !== 8;
  }

  estadoInvalido(model: Partial<Fornecedor>): boolean {
    return !/^[A-Z]{2}$/.test((model.estado || '').toString().trim().toUpperCase());
  }

  fundacaoInvalida(model: Partial<Fornecedor>): boolean {
    const data = this.asInputDateString(model.fundacao);

    if (!data) {
      return true;
    }

    return data > new Date().toISOString().slice(0, 10);
  }

  normalizarCnpjCadastro(): void {
    this.novoFornecedor.cnpj = this.formatarCNPJ(this.novoFornecedor.cnpj);
  }

  normalizarCnpjEdicao(): void {
    this.edit.cnpj = this.formatarCNPJ(this.edit.cnpj);
  }

  normalizarTelefoneCadastro(): void {
    this.novoFornecedor.telefone = this.exibirTelefoneFormatado(this.novoFornecedor.telefone);
  }

  normalizarTelefoneEdicao(): void {
    this.edit.telefone = this.exibirTelefoneFormatado(this.edit.telefone);
  }

  normalizarUfCadastro(): void {
    this.novoFornecedor.estado = (this.novoFornecedor.estado || '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 2);
  }

  normalizarUfEdicao(): void {
    this.edit.estado = (this.edit.estado || '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 2);
  }

  normalizarTextoCadastro(campo: keyof Fornecedor): void {
    const valor = this.novoFornecedor[campo];

    if (typeof valor === 'string') {
      (this.novoFornecedor as any)[campo] = this.capitalizar(valor);
    }
  }

  normalizarTextoEdicao(campo: keyof Fornecedor): void {
    const valor = this.edit[campo];

    if (typeof valor === 'string') {
      (this.edit as any)[campo] = this.capitalizar(valor);
    }
  }

  formatarCNPJ(cnpj: string | null | undefined): string {
    const d = this.onlyDigits(cnpj);

    if (d.length !== 14) {
      return cnpj ?? '';
    }

    return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12, 14)}`;
  }

  formatarCEP(cep: string | null | undefined): string {
    const d = this.onlyDigits(cep);

    if (d.length !== 8) {
      return cep ?? '';
    }

    return `${d.slice(0, 5)}-${d.slice(5, 8)}`;
  }

  exibirTelefoneFormatado(telefone: string | null | undefined): string {
    if (!telefone) {
      return '';
    }

    const n = this.onlyDigits(telefone);
    const codigoPais = '55';

    if (n.length >= 13 && n.startsWith('55')) {
      const ddd = n.slice(-11, -9);
      const parte1 = n.slice(-9, -4);
      const parte2 = n.slice(-4);

      return `+${codigoPais} (${ddd}) ${parte1}-${parte2}`;
    }

    if (n.length >= 11) {
      const ddd = n.slice(-11, -9);
      const parte1 = n.slice(-9, -4);
      const parte2 = n.slice(-4);

      return `+${codigoPais} (${ddd}) ${parte1}-${parte2}`;
    }

    if (n.length >= 10) {
      const ddd = n.slice(0, 2);
      const parte1 = n.slice(2, 6);
      const parte2 = n.slice(6, 10);

      return `+${codigoPais} (${ddd}) ${parte1}-${parte2}`;
    }

    return n;
  }

  formatarDataBr(data: string | Date | null | undefined): string {
    const input = this.asInputDateString(data);

    if (!input) {
      return '—';
    }

    const [ano, mes, dia] = input.split('-');

    return `${dia}/${mes}/${ano}`;
  }

  formatarTexto(valor: string | null | undefined): string {
    const texto = (valor || '').trim();
    return texto || '—';
  }

  enderecoCompleto(fornecedor: Partial<Fornecedor> | null | undefined): string {
    if (!fornecedor) {
      return '—';
    }

    const partes = [
      fornecedor.logradouro,
      fornecedor.numeroEndereco,
      fornecedor.complementoEndereco,
      fornecedor.bairro,
      fornecedor.cidade,
      fornecedor.estado
    ].map(p => (p || '').toString().trim()).filter(Boolean);

    return partes.length ? partes.join(' · ') : '—';
  }

  contatoValido(fornecedor: Fornecedor): boolean {
    return this.emailValido(fornecedor.email) && this.telefoneValido(fornecedor.telefone);
  }

  voltar(): void {
    this.location.back();
  }

  capitalizar(s: string | null | undefined): string {
    const texto = (s || '').toString().replace(/\s+/g, ' ').trim();

    if (!texto) {
      return '';
    }

    const excecoesMinusculas = ['de', 'da', 'do', 'das', 'dos', 'e'];

    return texto
      .split(' ')
      .map((p, index) => {
        const lower = p.toLowerCase();

        if (index > 0 && excecoesMinusculas.includes(lower)) {
          return lower;
        }

        return lower.charAt(0).toUpperCase() + lower.slice(1);
      })
      .join(' ');
  }

  private consultarCep(model: Partial<Fornecedor>, origem: 'cadastro' | 'edicao'): void {
    const cepNums = this.onlyDigits(model.cep);

    if (origem === 'cadastro') {
      this.mensagemCepCadastro = '';
    } else {
      this.mensagemCepEdicao = '';
    }

    if (!cepNums) {
      return;
    }

    if (cepNums.length !== 8) {
      const mensagem = 'CEP deve conter 8 dígitos.';
      origem === 'cadastro' ? this.mensagemCepCadastro = mensagem : this.mensagemCepEdicao = mensagem;
      return;
    }

    model.cep = this.formatarCEP(cepNums);
    origem === 'cadastro' ? this.buscandoCepCadastro = true : this.buscandoCepEdicao = true;

    this.http.get<any>(`https://viacep.com.br/ws/${cepNums}/json/`).subscribe({
      next: (resp) => {
        if (resp?.erro) {
          const mensagem = 'CEP não encontrado.';
          origem === 'cadastro' ? this.mensagemCepCadastro = mensagem : this.mensagemCepEdicao = mensagem;
          return;
        }

        model.logradouro = resp.logradouro || model.logradouro || '';
        model.bairro = resp.bairro || model.bairro || '';
        model.cidade = resp.localidade || model.cidade || '';
        model.estado = (resp.uf || model.estado || '').toUpperCase();

        if (!model.complementoEndereco && resp.complemento) {
          model.complementoEndereco = resp.complemento;
        }

        const mensagem = 'Endereço localizado e preenchido automaticamente.';
        origem === 'cadastro' ? this.mensagemCepCadastro = mensagem : this.mensagemCepEdicao = mensagem;
      },
      error: (err) => {
        console.error(err);
        const mensagem = 'Falha ao consultar o CEP.';
        origem === 'cadastro' ? this.mensagemCepCadastro = mensagem : this.mensagemCepEdicao = mensagem;
      },
      complete: () => {
        origem === 'cadastro' ? this.buscandoCepCadastro = false : this.buscandoCepEdicao = false;
      }
    });
  }

  private normalizarItemFornecido(itemFornecido: string | null | undefined): string {
    const item = (itemFornecido || '').toString().trim();

    const opcaoPadrao = this.opcoesItemFornecidoFornecedor.find(opcao =>
      this.normalizarTexto(opcao) === this.normalizarTexto(item)
    );

    return opcaoPadrao || item;
  }

  private montarPayloadFornecedor(model: Partial<Fornecedor>): Partial<Fornecedor> {
    return {
      ...model,
      cnpj: this.onlyDigits(model.cnpj),
      cep: this.onlyDigits(model.cep),
      telefone: this.onlyDigits(model.telefone),
      razaoSocial: (model.razaoSocial || '').trim(),
      nomeFantasia: (model.nomeFantasia || '').trim(),
      itemFornecido: this.normalizarItemFornecido(model.itemFornecido),
      email: (model.email || '').trim().toLowerCase(),
      logradouro: (model.logradouro || '').trim(),
      bairro: (model.bairro || '').trim(),
      cidade: (model.cidade || '').trim(),
      complementoEndereco: (model.complementoEndereco || '').trim(),
      numeroEndereco: (model.numeroEndereco || '').trim(),
      estado: (model.estado || '').toString().toUpperCase().trim(),
      fundacao: this.inputDateToBr(model.fundacao)
    };
  }

  private normalizarFornecedorParaTela(f: Fornecedor): Fornecedor {
    return {
      ...f,
      cnpj: this.formatarCNPJ(f.cnpj),
      cep: this.formatarCEP(f.cep),
      telefone: this.exibirTelefoneFormatado(f.telefone),
      fundacao: this.asInputDateString(f.fundacao),
      estado: (f.estado || '').toUpperCase()
    };
  }

  private validarFornecedor(model: Partial<Fornecedor>): string | null {
    if (this.cnpjInvalido(model)) {
      return 'Informe um CNPJ válido para o fornecedor.';
    }

    if (this.campoTextoInvalido(model.razaoSocial)) {
      return 'Informe a razão social do fornecedor.';
    }

    if (this.campoTextoInvalido(model.nomeFantasia)) {
      return 'Informe o nome fantasia do fornecedor.';
    }

    if (this.itemFornecidoInvalido(model)) {
      return 'Selecione a categoria de item fornecido pelo fornecedor.';
    }

    if (this.telefoneInvalido(model)) {
      return 'Informe um telefone válido com DDD.';
    }

    if (this.emailInvalido(model)) {
      return 'Informe um e-mail válido.';
    }

    if (this.fundacaoInvalida(model)) {
      return 'Informe uma data de fundação válida.';
    }

    if (this.cepInvalido(model)) {
      return 'Informe um CEP válido com 8 dígitos.';
    }

    if (this.campoTextoInvalido(model.logradouro)) {
      return 'Informe o logradouro do fornecedor.';
    }

    if (this.campoTextoInvalido(model.numeroEndereco)) {
      return 'Informe o número do endereço.';
    }

    if (this.campoTextoInvalido(model.bairro)) {
      return 'Informe o bairro.';
    }

    if (this.campoTextoInvalido(model.cidade)) {
      return 'Informe a cidade.';
    }

    if (this.estadoInvalido(model)) {
      return 'Informe a UF com 2 letras.';
    }

    return null;
  }

  private abaComPendencia(model: Partial<Fornecedor>): AbaFornecedor | null {
    if (this.dadosFornecedorPendentes(model)) {
      return 'dados';
    }

    if (this.contatoFornecedorPendente(model)) {
      return 'contato';
    }

    if (this.enderecoFornecedorPendente(model)) {
      return 'endereco';
    }

    return null;
  }

  private calcularProgresso(model: Partial<Fornecedor>): number {
    const total = this.camposObrigatorios.length;
    const preenchidos = this.camposObrigatorios.filter(campo => !this.campoInvalido(model, campo)).length;

    return Math.round((preenchidos / total) * 100);
  }

  private ordenarFornecedores(lista: Fornecedor[]): Fornecedor[] {
    const direcao = this.direcaoOrdenacao === 'asc' ? 1 : -1;

    return [...lista].sort((a, b) => {
      const va = this.valorOrdenacao(a, this.colunaOrdenacao);
      const vb = this.valorOrdenacao(b, this.colunaOrdenacao);

      return va.localeCompare(vb, 'pt-BR', { numeric: true }) * direcao;
    });
  }

  private valorOrdenacao(fornecedor: Fornecedor, coluna: ColunaOrdenacaoFornecedor): string {
    switch (coluna) {
      case 'cnpj':
        return this.onlyDigits(fornecedor.cnpj);
      case 'telefone':
        return this.onlyDigits(fornecedor.telefone);
      case 'fundacao':
        return this.asInputDateString(fornecedor.fundacao);
      default:
        return this.normalizarTexto(fornecedor[coluna]);
    }
  }

  private ajustarPaginaAtual(): void {
    if (this.paginaAtual > this.totalPaginas) {
      this.paginaAtual = this.totalPaginas;
    }

    if (this.paginaAtual < 1) {
      this.paginaAtual = 1;
    }
  }

  private proximaAba(aba: AbaFornecedor): AbaFornecedor {
    if (aba === 'dados') {
      return 'contato';
    }

    if (aba === 'contato') {
      return 'endereco';
    }

    return 'revisao';
  }

  private abaAnterior(aba: AbaFornecedor): AbaFornecedor {
    if (aba === 'revisao') {
      return 'endereco';
    }

    if (aba === 'endereco') {
      return 'contato';
    }

    return 'dados';
  }

  private campoTextoInvalido(valor: any): boolean {
    return !String(valor ?? '').trim();
  }

  private telefoneValido(telefone: string | null | undefined): boolean {
    const digitos = this.onlyDigits(telefone);
    return digitos.length >= 10 && digitos.length <= 13;
  }

  private emailValido(email: string | null | undefined): boolean {
    const texto = (email || '').trim();
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(texto);
  }

  private validarCNPJ(cnpj: string | null | undefined): boolean {
    /*
     * Para manter compatibilidade com os dados de teste do TCC,
     * a validação no frontend exige o formato com 14 dígitos.
     * A validação fiscal completa, se necessária, pode ficar no backend.
     */
    return this.onlyDigits(cnpj).length === 14;
  }

  private onlyDigits(v: any): string {
    return (v ?? '').toString().replace(/\D/g, '');
  }

  private normalizarTexto(valor: any): string {
    return (valor ?? '')
      .toString()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  private asInputDateString(v: any): string {
    if (!v) {
      return '';
    }

    if (typeof v === 'string') {
      if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
        return v;
      }

      const re = /^(\d{2})\/(\d{2})\/(\d{4})$/;
      const m = re.exec(v);

      if (m) {
        return `${m[3]}-${m[2]}-${m[1]}`;
      }

      const d = new Date(v);

      return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
    }

    if (v instanceof Date) {
      return v.toISOString().slice(0, 10);
    }

    try {
      const d = new Date(v);

      return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
    } catch {
      return '';
    }
  }

  private inputDateToBr(v: any): string {
    const input = this.asInputDateString(v);

    if (!input) {
      return '';
    }

    const [ano, mes, dia] = input.split('-');

    return `${dia}/${mes}/${ano}`;
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
