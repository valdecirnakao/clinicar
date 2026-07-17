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

  modalCadastro: any;
  modalEdicao: any;
  modalFornecedor: any;
  modalServico: any;

  loading = false;
  errorMsg = '';
  camposInvalidos: string[] = [];

  fornecedores: Fornecedor[] = [];
  fornecedoresFiltrados: Fornecedor[] = [];
  fornecedorFiltro = '';

  servicos: Servico[] = [];
  servicosFiltrados: Servico[] = [];
  servicoFiltro = '';

  private modoSelecaoFornecedor: ModoSelecao = 'cadastro';
  private modoSelecaoServico: ModoSelecao = 'cadastro';

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

  recarregar(): void {
    this.loading = true;
    this.errorMsg = '';

    this.fornecimentoServicoService.listarTodos().subscribe({
      next: (lista) => {
        this.todos = lista ?? [];
        this.fornecimentosServicos = [...this.todos];

        this.loading = false;
        this.cancelarEdicao();
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

  filtrar(term: string): void {
    const t = (term || '').trim().toLowerCase();
    const tNum = this.onlyDigits(t);

    if (!t) {
      this.fornecimentosServicos = [...this.todos];
      return;
    }

    this.fornecimentosServicos = this.todos.filter(item => {
      const fornecedor = (item.razaoSocialFornecedor || '').toLowerCase();
      const cnpj = this.onlyDigits(item.cnpjFornecedor);
      const servico = (item.nomeServico || '').toLowerCase();
      const categoria = (item.categoriaServico || '').toLowerCase();
      const disponibilidade = this.formatarDisponibilidade(item.disponibilidade).toLowerCase();
      const status = item.ativo ? 'ativo' : 'inativo';

      return (
        fornecedor.includes(t) ||
        cnpj.includes(tNum) ||
        servico.includes(t) ||
        categoria.includes(t) ||
        disponibilidade.includes(t) ||
        status.includes(t)
      );
    });
  }

  trackByFornecimentoServico = (_: number, item: FornecimentoServico) =>
    item.id ?? `${item.idFornecedor}-${item.idServico}`;

  abrirModalCadastro(): void {
    this.camposInvalidos = [];

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

    this.modalCadastro = bootstrap.Modal.getOrCreateInstance(el);
    this.modalCadastro.show();
  }

  salvarNovoFornecimento(): void {
    const erroValidacao = this.validarFornecimento(this.novoFornecimento);

    if (erroValidacao) {
      alert(erroValidacao);
      return;
    }

    const payload = this.montarPayload(this.novoFornecimento);

    this.fornecimentoServicoService.cadastrarFornecimentoServico(payload).subscribe({
      next: () => {
        this.modalCadastro?.hide();
        alert('Fornecimento de serviço cadastrado com sucesso.');
        this.recarregar();
      },
      error: (erro) => {
        console.error('Erro ao cadastrar fornecimento de serviço:', erro);

        alert(
          this.extrairMensagemErro(
            erro,
            'Erro ao cadastrar fornecimento de serviço.'
          )
        );
      }
    });
  }

  abrirModalEdicao(item: FornecimentoServico): void {
    this.camposInvalidos = [];
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

    this.modalEdicao = bootstrap.Modal.getOrCreateInstance(el);
    this.modalEdicao.show();
  }

  salvarEdicaoModal(): void {
    if (!this.editId) {
      return;
    }

    const erroValidacao = this.validarFornecimento(this.edit);

    if (erroValidacao) {
      alert(erroValidacao);
      return;
    }

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

          alert(
            this.extrairMensagemErro(
              erro,
              'Erro ao atualizar fornecimento de serviço.'
            )
          );
        }
      });
  }

  cancelarEdicao(): void {
    this.editId = null;
    this.edit = {};
    this.fornecedorFiltro = '';
    this.servicoFiltro = '';
  }

  ativar(id?: number): void {
    if (!id) {
      return;
    }

    this.fornecimentoServicoService.ativarFornecimentoServico(id).subscribe({
      next: () => {
        alert('Fornecimento de serviço ativado com sucesso.');
        this.recarregar();
      },
      error: (erro) => {
        console.error('Erro ao ativar fornecimento de serviço:', erro);

        alert(
          this.extrairMensagemErro(
            erro,
            'Erro ao ativar fornecimento de serviço.'
          )
        );
      }
    });
  }

  inativar(id?: number): void {
    if (!id) {
      return;
    }

    if (!confirm('Confirma inativar este fornecimento de serviço?')) {
      return;
    }

    this.fornecimentoServicoService.inativarFornecimentoServico(id).subscribe({
      next: () => {
        alert('Fornecimento de serviço inativado com sucesso.');
        this.recarregar();
      },
      error: (erro) => {
        console.error('Erro ao inativar fornecimento de serviço:', erro);

        alert(
          this.extrairMensagemErro(
            erro,
            'Erro ao inativar fornecimento de serviço.'
          )
        );
      }
    });
  }

  excluir(id?: number): void {
    if (!id) {
      return;
    }

    if (!confirm('Confirma a exclusão lógica deste fornecimento de serviço? Ele será marcado como inativo.')) {
      return;
    }

    this.fornecimentoServicoService.removerFornecimentoServico(id).subscribe({
      next: () => {
        alert('Fornecimento de serviço inativado com sucesso.');
        this.recarregar();
      },
      error: (erro) => {
        console.error('Erro ao remover fornecimento de serviço:', erro);

        alert(
          this.extrairMensagemErro(
            erro,
            'Erro ao remover fornecimento de serviço.'
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

  abrirModalFornecedor(modo: ModoSelecao): void {
    this.modoSelecaoFornecedor = modo;
    this.fornecedorFiltro = '';
    this.aplicarFiltroFornecedor();

    const el = document.getElementById('modalFornecedorFornecimentoServico');

    if (!el) {
      console.error('Modal modalFornecedorFornecimentoServico não encontrado.');
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

    const target = this.modoSelecaoFornecedor === 'cadastro'
      ? this.novoFornecimento
      : this.edit;

    target.idFornecedor = fornecedor.id;
    target.razaoSocialFornecedor = fornecedor.razaoSocial;
    target.cnpjFornecedor = fornecedor.cnpj;

    this.modalFornecedor?.hide();
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
    this.servicoFiltro = '';
    this.aplicarFiltroServico();

    const el = document.getElementById('modalServicoFornecimentoServico');

    if (!el) {
      console.error('Modal modalServicoFornecimentoServico não encontrado.');
      return;
    }

    this.modalServico = bootstrap.Modal.getOrCreateInstance(el);
    this.modalServico.show();
  }

  aplicarFiltroServico(): void {
    const t = this.servicoFiltro.trim().toLowerCase();

    if (!t) {
      this.servicosFiltrados = [...this.servicos];
      return;
    }

    this.servicosFiltrados = this.servicos.filter(servico => {
      const nome = (servico.nome || '').toLowerCase();
      const categoria = (servico.categoria || '').toLowerCase();
      const prestador = (servico.tipoDoPrestador || '').toLowerCase();

      return (
        nome.includes(t) ||
        categoria.includes(t) ||
        prestador.includes(t)
      );
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

    this.modalServico?.hide();
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
  // FORMATAÇÕES
  // ======================================================

  formatarValorCustoCadastro(): void {
    this.novoFornecimento.valorCusto = this.formatarMoedaBR(
      this.novoFornecimento.valorCusto
    );
  }

  formatarValorCustoEdicao(): void {
    this.edit.valorCusto = this.formatarMoedaBR(
      this.edit.valorCusto
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

  formatarPrazo(item: Partial<FornecimentoServico>): string {
    const prazo = this.normalizarDecimalParaExibicao(item.prazoExecucao);
    const unidade = this.formatarUnidade(item.unidadePrazo);

    if (!prazo) {
      return '';
    }

    return `${prazo} ${unidade}`;
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

  formatarVigencia(item: FornecimentoServico): string {
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

  // ======================================================
  // PAYLOAD E VALIDAÇÃO
  // ======================================================

  private validarFornecimento(model: Partial<FornecimentoServico>): string | null {
    if (!model.idFornecedor) {
      return 'Selecione um fornecedor.';
    }

    if (!model.idServico) {
      return 'Selecione um serviço.';
    }

    if (!String(model.valorCusto ?? '').trim()) {
      return 'Informe o valor de custo.';
    }

    const valorCusto = Number(this.converterMoedaParaNumero(model.valorCusto));

    if (Number.isNaN(valorCusto) || valorCusto < 0) {
      return 'O valor de custo não pode ser negativo.';
    }

    if (!String(model.unidadeCobranca ?? '').trim()) {
      return 'Informe a unidade de cobrança.';
    }

    if (!String(model.prazoExecucao ?? '').trim()) {
      return 'Informe o prazo de execução.';
    }

    const prazoExecucao = Number(
      this.converterDecimalParaBackend(model.prazoExecucao)
    );

    if (Number.isNaN(prazoExecucao) || prazoExecucao <= 0) {
      return 'O prazo de execução deve ser maior que zero.';
    }

    if (!String(model.unidadePrazo ?? '').trim()) {
      return 'Informe a unidade do prazo.';
    }

    const quantidadeMinima = Number(model.quantidadeMinima ?? 1);

    if (Number.isNaN(quantidadeMinima) || quantidadeMinima < 1) {
      return 'A quantidade mínima deve ser maior ou igual a 1.';
    }

    if (!String(model.disponibilidade ?? '').trim()) {
      return 'Informe a disponibilidade.';
    }

    const dataInicio = this.asInputDateString(model.dataInicioVigencia);
    const dataFim = this.asInputDateString(model.dataFimVigencia);

    if (dataInicio && dataFim && dataFim < dataInicio) {
      return 'A data fim da vigência não pode ser anterior à data de início.';
    }

    return null;
  }

  private montarPayload(model: Partial<FornecimentoServico>): FornecimentoServicoRequest {
    return {
      idFornecedor: model.idFornecedor,
      idServico: model.idServico,

      valorCusto: this.converterMoedaParaNumero(model.valorCusto),
      unidadeCobranca: (model.unidadeCobranca || '').toString().toUpperCase(),

      prazoExecucao: this.converterDecimalParaBackend(model.prazoExecucao),
      unidadePrazo: (model.unidadePrazo || '').toString().toUpperCase(),

      quantidadeMinima: Number(model.quantidadeMinima ?? 1),

      disponibilidade: (model.disponibilidade || 'SOB_DEMANDA')
        .toString()
        .toUpperCase(),

      contratoReferencia: this.limparOpcional(model.contratoReferencia),

      dataInicioVigencia: this.asInputDateString(model.dataInicioVigencia) || null,
      dataFimVigencia: this.asInputDateString(model.dataFimVigencia) || null,

      ativo: model.ativo === null || model.ativo === undefined
        ? true
        : Boolean(model.ativo),

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
