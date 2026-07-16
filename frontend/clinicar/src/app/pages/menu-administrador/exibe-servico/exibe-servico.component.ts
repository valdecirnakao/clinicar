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

type ModoSelecaoFornecedor = 'cadastro' | 'edicao';

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

  modalCadastro: any;
  modalEdicao: any;
  modalFornecedor: any;

  loading = false;
  errorMsg = '';
  camposInvalidos: string[] = [];

  fornecedores: Fornecedor[] = [];
  fornecedoresFiltrados: Fornecedor[] = [];
  fornecedorFiltro = '';

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
    'Outro'
  ];

  readonly tiposPrestadorSugeridos = [
    'Mecânico',
    'Eletricista Automotivo',
    'Funileiro',
    'Borracheiro',
    'Fornecedor Externo',
    'Técnico Especializado',
    'Outro'
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
      },
      error: (erro) => {
        console.error('Erro ao carregar serviços:', erro);

        this.loading = false;
        this.errorMsg = this.extrairMensagemErro(
          erro,
          'Falha ao carregar serviços.'
        );
      }
    });
  }

  filtrar(term: string): void {
    const t = (term || '').trim().toLowerCase();

    if (!t) {
      this.servicos = [...this.todos];
      return;
    }

    this.servicos = this.todos.filter(servico => {
      const status = servico.ativo ? 'ativo' : 'inativo';
      const necessitaPecas = servico.necessitaPecas ? 'necessita peças sim' : 'não necessita peças';

      return (
        (servico.nome || '').toLowerCase().includes(t) ||
        (servico.descricao || '').toLowerCase().includes(t) ||
        (servico.categoria || '').toLowerCase().includes(t) ||
        (servico.tipoDoPrestador || '').toLowerCase().includes(t) ||
        (servico.unidadeDuracao || '').toLowerCase().includes(t) ||
        (servico.unidadeCobranca || '').toLowerCase().includes(t) ||
        (servico.razaoSocialFornecedor || '').toLowerCase().includes(t) ||
        status.includes(t) ||
        necessitaPecas.includes(t)
      );
    });
  }

  trackByServico = (_: number, servico: Servico) => servico.id ?? servico.nome;

  abrirModalCadastro(): void {
    this.camposInvalidos = [];

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
    const erroValidacao = this.validarServico(this.novoServico);

    if (erroValidacao) {
      alert(erroValidacao);
      return;
    }

    const payload = this.montarPayload(this.novoServico);

    this.servicoService.cadastrarServico(payload).subscribe({
      next: () => {
        this.modalCadastro?.hide();
        alert('Serviço cadastrado com sucesso.');
        this.recarregar();
      },
      error: (erro) => {
        console.error('Erro ao cadastrar serviço:', erro);

        alert(
          this.extrairMensagemErro(
            erro,
            'Erro ao cadastrar serviço.'
          )
        );
      }
    });
  }

  abrirModalEdicao(servico: Servico): void {
    this.camposInvalidos = [];
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

    const erroValidacao = this.validarServico(this.edit);

    if (erroValidacao) {
      alert(erroValidacao);
      return;
    }

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

        alert(
          this.extrairMensagemErro(
            erro,
            'Erro ao atualizar serviço.'
          )
        );
      }
    });
  }

  cancelarEdicao(): void {
    this.editId = null;
    this.edit = {};
    this.fornecedorFiltro = '';
  }

  inativar(id?: number): void {
    if (!id) {
      return;
    }

    if (!confirm('Confirma inativar este serviço?')) {
      return;
    }

    this.servicoService.inativarServico(id).subscribe({
      next: () => {
        alert('Serviço inativado com sucesso.');
        this.recarregar();
      },
      error: (erro) => {
        console.error('Erro ao inativar serviço:', erro);

        alert(
          this.extrairMensagemErro(
            erro,
            'Erro ao inativar serviço.'
          )
        );
      }
    });
  }

  ativar(id?: number): void {
    if (!id) {
      return;
    }

    this.servicoService.ativarServico(id).subscribe({
      next: () => {
        alert('Serviço ativado com sucesso.');
        this.recarregar();
      },
      error: (erro) => {
        console.error('Erro ao ativar serviço:', erro);

        alert(
          this.extrairMensagemErro(
            erro,
            'Erro ao ativar serviço.'
          )
        );
      }
    });
  }

  excluir(id?: number): void {
    if (!id) {
      return;
    }

    if (!confirm('Confirma a exclusão lógica deste serviço? Ele será marcado como inativo.')) {
      return;
    }

    this.servicoService.removerServico(id).subscribe({
      next: () => {
        alert('Serviço inativado com sucesso.');
        this.recarregar();
      },
      error: (erro) => {
        console.error('Erro ao remover serviço:', erro);

        alert(
          this.extrairMensagemErro(
            erro,
            'Erro ao remover serviço.'
          )
        );
      }
    });
  }

  voltar(): void {
    this.location.back();
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

  abrirModalFornecedor(modo: ModoSelecaoFornecedor): void {
    this.modoSelecaoFornecedor = modo;
    this.fornecedorFiltro = '';
    this.aplicarFiltroFornecedor();

    const el = document.getElementById('modalFornecedorServico');

    if (!el) {
      console.error('Modal modalFornecedorServico não encontrado.');
      return;
    }

    this.modalFornecedor = bootstrap.Modal.getOrCreateInstance(el);
    this.modalFornecedor.show();
  }

  aplicarFiltroFornecedor(): void {
    const t = this.fornecedorFiltro.trim().toLowerCase();
    const tNum = this.onlyDigits(t);

    if (!t) {
      this.fornecedoresFiltrados = [...this.fornecedores];
      return;
    }

    this.fornecedoresFiltrados = this.fornecedores.filter(fornecedor => {
      const razao = (fornecedor.razaoSocial || '').toLowerCase();
      const fantasia = (fornecedor.nomeFantasia || '').toLowerCase();
      const cnpj = this.onlyDigits(fornecedor.cnpj);

      return (
        razao.includes(t) ||
        fantasia.includes(t) ||
        cnpj.includes(tNum)
      );
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
  }

  removerFornecedorSelecionado(model: Partial<Servico>): void {
    model.idFornecedor = null;
    model.razaoSocialFornecedor = '';
  }

  fornecedorTexto(model: Partial<Servico>): string {
    return model.razaoSocialFornecedor || '';
  }

  // ======================================================
  // FORMATAÇÕES
  // ======================================================

  formatarValorBaseCadastro(): void {
    this.novoServico.valorBase = this.formatarMoedaBR(
      this.novoServico.valorBase
    );
  }

  formatarValorBaseEdicao(): void {
    this.edit.valorBase = this.formatarMoedaBR(
      this.edit.valorBase
    );
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

  converterMoedaParaNumero(valor: any): string {
    if (valor === null || valor === undefined || valor === '') {
      return '0';
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
      return '0';
    }

    return numero.toFixed(2);
  }

  formatarDuracao(servico: Servico): string {
    const duracao = this.normalizarDecimalParaExibicao(servico.duracaoEstimada);
    const unidade = servico.unidadeDuracao || '';

    if (!duracao) {
      return '';
    }

    return `${duracao} ${this.formatarUnidade(unidade)}`;
  }

  formatarUnidade(unidade: string | null | undefined): string {
    if (!unidade) {
      return '';
    }

    const u = unidade.toUpperCase();

    if (u === 'MINUTO') {
      return 'minuto(s)';
    }

    if (u === 'HORA') {
      return 'hora(s)';
    }

    if (u === 'DIA') {
      return 'dia(s)';
    }

    if (u === 'SERVICO') {
      return 'serviço';
    }

    if (u === 'DIARIA') {
      return 'diária';
    }

    if (u === 'PACOTE') {
      return 'pacote';
    }

    if (u === 'UNIDADE') {
      return 'unidade';
    }

    return unidade;
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

  formatarCNPJ(cnpj?: string): string {
    const d = this.onlyDigits(cnpj);

    if (d.length !== 14) {
      return cnpj ?? '';
    }

    return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12, 14)}`;
  }

  formatarDataBr(data: string | Date | null | undefined): string {
    if (!data) {
      return '';
    }

    const d = new Date(data);

    if (Number.isNaN(d.getTime())) {
      return '';
    }

    return d.toLocaleDateString('pt-BR');
  }

  // ======================================================
  // PAYLOAD E VALIDAÇÃO
  // ======================================================

  private validarServico(model: Partial<Servico>): string | null {
    if (!String(model.nome ?? '').trim()) {
      return 'Informe o nome do serviço.';
    }

    if (!String(model.categoria ?? '').trim()) {
      return 'Informe a categoria do serviço.';
    }

    if (!String(model.tipoDoPrestador ?? '').trim()) {
      return 'Informe o tipo do prestador.';
    }

    if (!String(model.duracaoEstimada ?? '').trim()) {
      return 'Informe a duração estimada.';
    }

    const duracao = Number(
      this.converterDecimalParaBackend(model.duracaoEstimada)
    );

    if (Number.isNaN(duracao) || duracao <= 0) {
      return 'A duração estimada deve ser maior que zero.';
    }

    if (!String(model.unidadeDuracao ?? '').trim()) {
      return 'Informe a unidade de duração.';
    }

    if (!String(model.valorBase ?? '').trim()) {
      return 'Informe o valor base.';
    }

    const valorBase = Number(this.converterMoedaParaNumero(model.valorBase));

    if (Number.isNaN(valorBase) || valorBase < 0) {
      return 'O valor base não pode ser negativo.';
    }

    if (!String(model.unidadeCobranca ?? '').trim()) {
      return 'Informe a unidade de cobrança.';
    }

    const garantia = Number(model.garantiaDias ?? 0);

    if (Number.isNaN(garantia) || garantia < 0) {
      return 'A garantia em dias não pode ser negativa.';
    }

    return null;
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

      garantiaDias: Number(model.garantiaDias ?? 0),
      necessitaPecas: Boolean(model.necessitaPecas),
      ativo: model.ativo === null || model.ativo === undefined
        ? true
        : Boolean(model.ativo),

      observacoes: this.limparOpcional(model.observacoes),

      idFornecedor: model.idFornecedor ?? null
    };
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
