import { Component, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';

import {
  Agendamento,
  AgendamentoRequest,
  ExibeAgendamentosService,
  ServicoResumo,
  UsuarioResumo,
  VeiculoResumo
} from './exibe-agendamentos.service';

declare var bootstrap: any;

type ModoFormulario = 'cadastro' | 'edicao';
type TipoSelecao = 'cliente' | 'veiculo' | 'servico' | 'responsavel';

@Component({
  selector: 'app-exibe-agendamentos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './exibe-agendamentos.component.html',
  styleUrls: ['./exibe-agendamentos.component.css']
})
export class ExibeAgendamentosComponent implements OnInit {

  agendamentos: Agendamento[] = [];
  private todos: Agendamento[] = [];

  usuarios: UsuarioResumo[] = [];
  clientes: UsuarioResumo[] = [];
  responsaveis: UsuarioResumo[] = [];

  veiculos: VeiculoResumo[] = [];
  veiculosFiltradosParaCliente: VeiculoResumo[] = [];

  servicos: ServicoResumo[] = [];

  itensSelecao: any[] = [];
  itensSelecaoFiltrados: any[] = [];

  novoAgendamento: Partial<Agendamento> = {};
  edit: Partial<Agendamento> = {};
  editId: number | null = null;

  agendamentoSelecionado: Agendamento | null = null;
  motivoCancelamento = '';

  filtroTexto = '';
  filtroStatus = '';
  filtroPeriodoInicio = '';
  filtroPeriodoFim = '';
  filtroSelecao = '';

  modoFormulario: ModoFormulario = 'cadastro';
  tipoSelecao: TipoSelecao = 'cliente';

  loading = false;
  errorMsg = '';

  modalCadastro: any;
  modalEdicao: any;
  modalSelecao: any;
  modalCancelamento: any;
  modalDetalhes: any;

  readonly statusFiltro = [
    '',
    'AGENDADO',
    'CONFIRMADO',
    'EM_ATENDIMENTO',
    'CONCLUIDO',
    'CANCELADO',
    'NAO_COMPARECEU',
    'REAGENDADO'
  ];

  readonly canaisOrigem = [
    'SISTEMA',
    'TELEFONE',
    'WHATSAPP',
    'PRESENCIAL',
    'SITE'
  ];

  readonly prioridades = [
    'BAIXA',
    'NORMAL',
    'ALTA',
    'URGENTE'
  ];

  readonly tiposAtendimento = [
    'PRESENCIAL',
    'RETIRADA_ENTREGA',
    'GUINCHO'
  ];

  readonly statusFormulario = [
    'AGENDADO',
    'CONFIRMADO',
    'REAGENDADO'
  ];

  resumo = {
    total: 0,
    agendado: 0,
    confirmado: 0,
    emAtendimento: 0,
    concluido: 0,
    cancelado: 0,
    naoCompareceu: 0
  };

  constructor(
    private readonly service: ExibeAgendamentosService,
    private readonly location: Location
  ) {}

  ngOnInit(): void {
    this.carregarUsuarios();
    this.carregarVeiculos();
    this.carregarServicos();
    this.recarregar();
  }

  recarregar(): void {
    this.loading = true;
    this.errorMsg = '';

    this.service.listarTodos().subscribe({
      next: (lista) => {
        this.todos = lista ?? [];
        this.aplicarFiltrosLocais();
        this.atualizarResumo();
        this.loading = false;
      },
      error: (erro) => {
        console.error('Erro ao carregar agendamentos:', erro);
        this.errorMsg = this.extrairMensagemErro(
          erro,
          'Falha ao carregar os agendamentos.'
        );
        this.loading = false;
      }
    });
  }

  private carregarUsuarios(): void {
    this.service.listarUsuarios().subscribe({
      next: (lista) => {
        this.usuarios = lista ?? [];

        this.clientes = this.usuarios.filter(u =>
          this.tipoAcessoNormalizado(u.tipo_do_acesso) === 'CLIENTE' ||
          this.tipoAcessoNormalizado(u.tipo_do_acesso) === 'ADMINISTRADOR'
        );

        this.responsaveis = this.usuarios.filter(u =>
          this.tipoAcessoNormalizado(u.tipo_do_acesso) === 'COLABORADOR' ||
          this.tipoAcessoNormalizado(u.tipo_do_acesso) === 'ADMINISTRADOR'
        );
      },
      error: (erro) => {
        console.error('Erro ao carregar usuários:', erro);
      }
    });
  }

  private carregarVeiculos(): void {
    this.service.listarVeiculos().subscribe({
      next: (lista) => {
        this.veiculos = lista ?? [];
        this.veiculosFiltradosParaCliente = [...this.veiculos];
      },
      error: (erro) => {
        console.error('Erro ao carregar veículos:', erro);
      }
    });
  }

  private carregarServicos(): void {
    this.service.listarServicos().subscribe({
      next: (lista) => {
        this.servicos = (lista ?? []).filter(s => s.ativo !== false);
      },
      error: (erro) => {
        console.error('Erro ao carregar serviços:', erro);
      }
    });
  }

  filtrar(term: string): void {
    this.filtroTexto = term ?? '';
    this.aplicarFiltrosLocais();
  }

  aplicarFiltrosLocais(): void {
    const texto = this.filtroTexto.trim().toLowerCase();

    this.agendamentos = this.todos.filter(item => {
      const status = (item.statusAgendamento || '').toUpperCase();

      if (this.filtroStatus && status !== this.filtroStatus) {
        return false;
      }

      if (!texto) {
        return true;
      }

      return (
        (item.codigoAgendamento || '').toLowerCase().includes(texto) ||
        (item.nomeCliente || '').toLowerCase().includes(texto) ||
        (item.cpfCliente || '').toLowerCase().includes(texto) ||
        (item.placaVeiculo || '').toLowerCase().includes(texto) ||
        (item.fabricanteVeiculo || '').toLowerCase().includes(texto) ||
        (item.modeloVeiculo || '').toLowerCase().includes(texto) ||
        (item.nomeServico || '').toLowerCase().includes(texto) ||
        (item.nomeResponsavel || '').toLowerCase().includes(texto) ||
        (item.prioridade || '').toLowerCase().includes(texto) ||
        this.formatarStatus(status).toLowerCase().includes(texto)
      );
    });
  }

  filtrarPorPeriodo(): void {
    if (!this.filtroPeriodoInicio || !this.filtroPeriodoFim) {
      alert('Informe a data/hora inicial e final do período.');
      return;
    }

    this.loading = true;
    this.errorMsg = '';

    this.service.listarPorPeriodo(
      this.filtroPeriodoInicio,
      this.filtroPeriodoFim
    ).subscribe({
      next: (lista) => {
        this.todos = lista ?? [];
        this.aplicarFiltrosLocais();
        this.atualizarResumo();
        this.loading = false;
      },
      error: (erro) => {
        console.error('Erro ao filtrar por período:', erro);
        this.errorMsg = this.extrairMensagemErro(
          erro,
          'Falha ao filtrar agendamentos por período.'
        );
        this.loading = false;
      }
    });
  }

  limparPeriodo(): void {
    this.filtroPeriodoInicio = '';
    this.filtroPeriodoFim = '';
    this.recarregar();
  }

  private atualizarResumo(): void {
    this.resumo.total = this.todos.length;
    this.resumo.agendado = this.todos.filter(a => a.statusAgendamento === 'AGENDADO').length;
    this.resumo.confirmado = this.todos.filter(a => a.statusAgendamento === 'CONFIRMADO').length;
    this.resumo.emAtendimento = this.todos.filter(a => a.statusAgendamento === 'EM_ATENDIMENTO').length;
    this.resumo.concluido = this.todos.filter(a => a.statusAgendamento === 'CONCLUIDO').length;
    this.resumo.cancelado = this.todos.filter(a => a.statusAgendamento === 'CANCELADO').length;
    this.resumo.naoCompareceu = this.todos.filter(a => a.statusAgendamento === 'NAO_COMPARECEU').length;
  }

  trackByAgendamento = (_: number, item: Agendamento) => item.id ?? _;
  trackBySelecao = (_: number, item: any) => item.id ?? _;
  trackByStatus = (_: number, item: string) => item;

  // ======================================================
  // CADASTRO
  // ======================================================

  abrirModalCadastro(): void {
    this.modoFormulario = 'cadastro';

    this.novoAgendamento = {
      idCliente: undefined,
      nomeCliente: '',

      idVeiculo: undefined,
      placaVeiculo: '',

      idServico: undefined,
      nomeServico: '',

      idFornecedor: undefined,
      razaoSocialFornecedor: '',

      idResponsavel: undefined,
      nomeResponsavel: '',

      dataHoraInicio: '',
      dataHoraFim: '',

      statusAgendamento: 'AGENDADO',
      canalOrigem: 'SISTEMA',
      prioridade: 'NORMAL',
      tipoAtendimento: 'PRESENCIAL',

      quilometragemAtual: null,

      queixaCliente: '',
      diagnosticoPrevio: '',
      observacoes: '',

      valorEstimado: '',
      valorFinal: '',

      requerConfirmacao: true,
      confirmado: false
    };

    this.veiculosFiltradosParaCliente = [...this.veiculos];

    const el = document.getElementById('modalCadastroAgendamento');

    if (!el) {
      console.error('Modal modalCadastroAgendamento não encontrado.');
      return;
    }

    this.modalCadastro = bootstrap.Modal.getOrCreateInstance(el);
    this.modalCadastro.show();
  }

  salvarNovoAgendamento(): void {
    const erro = this.validarAgendamento(this.novoAgendamento);

    if (erro) {
      alert(erro);
      return;
    }

    const payload = this.montarPayload(this.novoAgendamento);

    this.service.criar(payload).subscribe({
      next: () => {
        this.modalCadastro?.hide();
        alert('Agendamento cadastrado com sucesso.');
        this.recarregar();
      },
      error: (erro) => {
        console.error('Erro ao cadastrar agendamento:', erro);
        alert(this.extrairMensagemErro(erro, 'Erro ao cadastrar agendamento.'));
      }
    });
  }

  // ======================================================
  // EDIÇÃO
  // ======================================================

  abrirModalEdicao(item: Agendamento): void {
    this.modoFormulario = 'edicao';
    this.editId = item.id ?? null;

    this.edit = {
      ...item,
      dataHoraInicio: this.asDateTimeLocal(item.dataHoraInicio),
      dataHoraFim: this.asDateTimeLocal(item.dataHoraFim),
      valorEstimado: this.formatarMoedaBR(item.valorEstimado),
      valorFinal: this.formatarMoedaBR(item.valorFinal)
    };

    this.atualizarVeiculosPorCliente(this.edit);

    const el = document.getElementById('modalEdicaoAgendamento');

    if (!el) {
      console.error('Modal modalEdicaoAgendamento não encontrado.');
      return;
    }

    this.modalEdicao = bootstrap.Modal.getOrCreateInstance(el);
    this.modalEdicao.show();
  }

  salvarEdicaoAgendamento(): void {
    if (!this.editId) {
      return;
    }

    const erro = this.validarAgendamento(this.edit);

    if (erro) {
      alert(erro);
      return;
    }

    const payload = this.montarPayload(this.edit);

    this.service.atualizar(this.editId, payload).subscribe({
      next: () => {
        this.modalEdicao?.hide();
        alert('Agendamento atualizado com sucesso.');
        this.recarregar();
      },
      error: (erro) => {
        console.error('Erro ao atualizar agendamento:', erro);
        alert(this.extrairMensagemErro(erro, 'Erro ao atualizar agendamento.'));
      }
    });
  }

  // ======================================================
  // AÇÕES DE STATUS
  // ======================================================

  confirmar(item: Agendamento): void {
    if (!item.id) {
      return;
    }

    this.service.confirmar(item.id).subscribe({
      next: () => {
        alert('Agendamento confirmado com sucesso.');
        this.recarregar();
      },
      error: (erro) => {
        alert(this.extrairMensagemErro(erro, 'Erro ao confirmar agendamento.'));
      }
    });
  }

  iniciar(item: Agendamento): void {
    if (!item.id) {
      return;
    }

    this.service.iniciar(item.id).subscribe({
      next: () => {
        alert('Atendimento iniciado com sucesso.');
        this.recarregar();
      },
      error: (erro) => {
        alert(this.extrairMensagemErro(erro, 'Erro ao iniciar atendimento.'));
      }
    });
  }

  concluir(item: Agendamento): void {
    if (!item.id) {
      return;
    }

    if (!confirm('Confirma concluir este agendamento?')) {
      return;
    }

    this.service.concluir(item.id).subscribe({
      next: () => {
        alert('Agendamento concluído com sucesso.');
        this.recarregar();
      },
      error: (erro) => {
        alert(this.extrairMensagemErro(erro, 'Erro ao concluir agendamento.'));
      }
    });
  }

  abrirModalCancelamento(item: Agendamento): void {
    this.agendamentoSelecionado = item;
    this.motivoCancelamento = '';

    const el = document.getElementById('modalCancelamentoAgendamento');

    if (!el) {
      console.error('Modal modalCancelamentoAgendamento não encontrado.');
      return;
    }

    this.modalCancelamento = bootstrap.Modal.getOrCreateInstance(el);
    this.modalCancelamento.show();
  }

  cancelarAgendamento(): void {
    if (!this.agendamentoSelecionado?.id) {
      return;
    }

    this.service.cancelar(
      this.agendamentoSelecionado.id,
      {
        motivoCancelamento: this.limparOpcional(this.motivoCancelamento)
      }
    ).subscribe({
      next: () => {
        this.modalCancelamento?.hide();
        alert('Agendamento cancelado com sucesso.');
        this.recarregar();
      },
      error: (erro) => {
        alert(this.extrairMensagemErro(erro, 'Erro ao cancelar agendamento.'));
      }
    });
  }

  naoCompareceu(item: Agendamento): void {
    if (!item.id) {
      return;
    }

    if (!confirm('Confirma marcar este agendamento como não compareceu?')) {
      return;
    }

    this.service.naoCompareceu(item.id).subscribe({
      next: () => {
        alert('Agendamento marcado como não compareceu.');
        this.recarregar();
      },
      error: (erro) => {
        alert(this.extrairMensagemErro(erro, 'Erro ao marcar não comparecimento.'));
      }
    });
  }

  podeConfirmar(item: Agendamento): boolean {
    return item.statusAgendamento === 'AGENDADO' || item.statusAgendamento === 'REAGENDADO';
  }

  podeIniciar(item: Agendamento): boolean {
    return item.statusAgendamento === 'AGENDADO' || item.statusAgendamento === 'CONFIRMADO';
  }

  podeConcluir(item: Agendamento): boolean {
    return item.statusAgendamento === 'EM_ATENDIMENTO';
  }

  podeCancelar(item: Agendamento): boolean {
    return item.statusAgendamento !== 'CANCELADO'
      && item.statusAgendamento !== 'CONCLUIDO'
      && item.statusAgendamento !== 'NAO_COMPARECEU';
  }

  podeNaoCompareceu(item: Agendamento): boolean {
    return item.statusAgendamento !== 'CANCELADO'
      && item.statusAgendamento !== 'CONCLUIDO'
      && item.statusAgendamento !== 'NAO_COMPARECEU';
  }

  // ======================================================
  // DETALHES
  // ======================================================

  abrirModalDetalhes(item: Agendamento): void {
    this.agendamentoSelecionado = item;

    const el = document.getElementById('modalDetalhesAgendamento');

    if (!el) {
      console.error('Modal modalDetalhesAgendamento não encontrado.');
      return;
    }

    this.modalDetalhes = bootstrap.Modal.getOrCreateInstance(el);
    this.modalDetalhes.show();
  }

  // ======================================================
  // SELEÇÕES
  // ======================================================

  abrirModalSelecao(tipo: TipoSelecao, modo: ModoFormulario): void {
    this.tipoSelecao = tipo;
    this.modoFormulario = modo;
    this.filtroSelecao = '';

    if (tipo === 'cliente') {
      this.itensSelecao = [...this.clientes];
    } else if (tipo === 'responsavel') {
      this.itensSelecao = [...this.responsaveis];
    } else if (tipo === 'veiculo') {
      const model = this.obterModelAtual();
      this.atualizarVeiculosPorCliente(model);
      this.itensSelecao = [...this.veiculosFiltradosParaCliente];
    } else {
      this.itensSelecao = [...this.servicos];
    }

    this.itensSelecaoFiltrados = [...this.itensSelecao];

    const el = document.getElementById('modalSelecaoAgendamento');

    if (!el) {
      console.error('Modal modalSelecaoAgendamento não encontrado.');
      return;
    }

    this.modalSelecao = bootstrap.Modal.getOrCreateInstance(el);
    this.modalSelecao.show();
  }

  aplicarFiltroSelecao(): void {
    const t = this.filtroSelecao.trim().toLowerCase();

    if (!t) {
      this.itensSelecaoFiltrados = [...this.itensSelecao];
      return;
    }

    this.itensSelecaoFiltrados = this.itensSelecao.filter(item => {
      if (this.tipoSelecao === 'cliente' || this.tipoSelecao === 'responsavel') {
        return (
          (item.nome || '').toLowerCase().includes(t) ||
          (item.nome_social || '').toLowerCase().includes(t) ||
          (item.cpf || '').toLowerCase().includes(t) ||
          (item.email || '').toLowerCase().includes(t) ||
          (item.telefone || '').toLowerCase().includes(t)
        );
      }

      if (this.tipoSelecao === 'veiculo') {
        return (
          (item.placa || '').toLowerCase().includes(t) ||
          (item.fabricante || '').toLowerCase().includes(t) ||
          (item.modelo || '').toLowerCase().includes(t) ||
          (item.cor || '').toLowerCase().includes(t)
        );
      }

      return (
        (item.nome || '').toLowerCase().includes(t) ||
        (item.categoria || '').toLowerCase().includes(t) ||
        (item.tipoDoPrestador || '').toLowerCase().includes(t) ||
        (item.descricao || '').toLowerCase().includes(t)
      );
    });
  }

  selecionarItem(item: any): void {
    const model = this.obterModelAtual();

    if (this.tipoSelecao === 'cliente') {
      model.idCliente = item.id;
      model.nomeCliente = item.nome;
      model.cpfCliente = item.cpf;
      model.telefoneCliente = item.telefone;
      model.emailCliente = item.email;

      model.idVeiculo = undefined;
      model.placaVeiculo = '';
      model.fabricanteVeiculo = '';
      model.modeloVeiculo = '';

      this.atualizarVeiculosPorCliente(model);
    }

    if (this.tipoSelecao === 'veiculo') {
      model.idVeiculo = item.id;
      model.placaVeiculo = item.placa;
      model.fabricanteVeiculo = item.fabricante;
      model.modeloVeiculo = item.modelo;
    }

    if (this.tipoSelecao === 'servico') {
      model.idServico = item.id;
      model.nomeServico = item.nome;
      model.categoriaServico = item.categoria;

      model.idFornecedor = item.idFornecedor;
      model.razaoSocialFornecedor = item.razaoSocialFornecedor;

      if (!model.valorEstimado && item.valorBase !== null && item.valorBase !== undefined) {
        model.valorEstimado = this.formatarMoedaBR(item.valorBase);
      }

      if (model.dataHoraInicio && !model.dataHoraFim) {
        model.dataHoraFim = this.calcularFimPorServico(model.dataHoraInicio, item);
      }
    }

    if (this.tipoSelecao === 'responsavel') {
      model.idResponsavel = item.id;
      model.nomeResponsavel = item.nome;
      model.tipoAcessoResponsavel = item.tipo_do_acesso;
    }

    this.modalSelecao?.hide();
  }

  private obterModelAtual(): Partial<Agendamento> {
    return this.modoFormulario === 'cadastro'
      ? this.novoAgendamento
      : this.edit;
  }

  atualizarVeiculosPorCliente(model: Partial<Agendamento>): void {
    if (!model.idCliente) {
      this.veiculosFiltradosParaCliente = [...this.veiculos];
      return;
    }

    const vinculados = this.veiculos.filter(v => Number(v.idProprietario) === Number(model.idCliente));

    this.veiculosFiltradosParaCliente = vinculados.length > 0
      ? vinculados
      : [...this.veiculos];
  }

  aoAlterarDataInicio(model: Partial<Agendamento>): void {
    if (!model.dataHoraInicio || model.dataHoraFim || !model.idServico) {
      return;
    }

    const servico = this.servicos.find(s => Number(s.id) === Number(model.idServico));

    if (servico) {
      model.dataHoraFim = this.calcularFimPorServico(model.dataHoraInicio, servico);
    }
  }

  private calcularFimPorServico(dataInicio: any, servico: ServicoResumo): string {
    const inicio = new Date(dataInicio);

    if (Number.isNaN(inicio.getTime())) {
      return '';
    }

    const minutos = this.calcularDuracaoServicoMinutos(servico);
    inicio.setMinutes(inicio.getMinutes() + minutos);

    return this.dateToInputLocal(inicio);
  }

  private calcularDuracaoServicoMinutos(servico: ServicoResumo): number {
    const duracao = Number(servico.duracaoEstimada ?? 60);
    const unidade = (servico.unidadeDuracao || 'MINUTO').toUpperCase();

    if (Number.isNaN(duracao) || duracao <= 0) {
      return 60;
    }

    if (unidade === 'HORA') {
      return Math.round(duracao * 60);
    }

    if (unidade === 'DIA') {
      return Math.round(duracao * 1440);
    }

    return Math.round(duracao);
  }

  // ======================================================
  // VALIDAÇÃO / PAYLOAD
  // ======================================================

  private validarAgendamento(model: Partial<Agendamento>): string | null {
    if (!model.idCliente) {
      return 'Selecione o cliente.';
    }

    if (!model.idVeiculo) {
      return 'Selecione o veículo.';
    }

    if (!model.idServico) {
      return 'Selecione o serviço.';
    }

    if (!model.dataHoraInicio) {
      return 'Informe a data/hora de início.';
    }

    if (model.dataHoraFim) {
      const inicio = new Date(model.dataHoraInicio);
      const fim = new Date(model.dataHoraFim);

      if (!Number.isNaN(inicio.getTime()) && !Number.isNaN(fim.getTime()) && fim <= inicio) {
        return 'A data/hora final deve ser posterior à data/hora inicial.';
      }
    }

    if (model.quilometragemAtual !== null && model.quilometragemAtual !== undefined) {
      if (Number(model.quilometragemAtual) < 0) {
        return 'A quilometragem não pode ser negativa.';
      }
    }

    return null;
  }

  private montarPayload(model: Partial<Agendamento>): AgendamentoRequest {
    return {
      idCliente: model.idCliente ?? null,
      idVeiculo: model.idVeiculo ?? null,
      idServico: model.idServico ?? null,
      idFornecedor: model.idFornecedor ?? null,
      idResponsavel: model.idResponsavel ?? null,

      dataHoraInicio: model.dataHoraInicio ?? '',
      dataHoraFim: model.dataHoraFim ?? '',

      statusAgendamento: model.statusAgendamento || 'AGENDADO',
      canalOrigem: model.canalOrigem || 'SISTEMA',
      prioridade: model.prioridade || 'NORMAL',
      tipoAtendimento: model.tipoAtendimento || 'PRESENCIAL',

      quilometragemAtual: model.quilometragemAtual === null || model.quilometragemAtual === undefined
        ? null
        : Number(model.quilometragemAtual),

      queixaCliente: this.limparOpcional(model.queixaCliente),
      diagnosticoPrevio: this.limparOpcional(model.diagnosticoPrevio),
      observacoes: this.limparOpcional(model.observacoes),

      valorEstimado: this.converterMoedaOpcionalParaNumero(model.valorEstimado),
      valorFinal: this.converterMoedaOpcionalParaNumero(model.valorFinal),

      requerConfirmacao: model.requerConfirmacao === null || model.requerConfirmacao === undefined
        ? true
        : Boolean(model.requerConfirmacao),

      confirmado: Boolean(model.confirmado)
    };
  }

  // ======================================================
  // FORMATAÇÕES
  // ======================================================

  textoCliente(model: Partial<Agendamento>): string {
    if (!model.nomeCliente) {
      return '';
    }

    const cpf = model.cpfCliente ? ` - CPF ${this.formatarCPF(model.cpfCliente)}` : '';
    return `${model.nomeCliente}${cpf}`;
  }

  textoVeiculo(model: Partial<Agendamento>): string {
    if (!model.placaVeiculo && !model.modeloVeiculo) {
      return '';
    }

    const placa = model.placaVeiculo ? this.formatarPlaca(model.placaVeiculo) : '';
    const veiculo = `${model.fabricanteVeiculo || ''} ${model.modeloVeiculo || ''}`.trim();

    return placa && veiculo ? `${placa} - ${veiculo}` : placa || veiculo;
  }

  textoServico(model: Partial<Agendamento>): string {
    if (!model.nomeServico) {
      return '';
    }

    const categoria = model.categoriaServico ? ` - ${model.categoriaServico}` : '';
    return `${model.nomeServico}${categoria}`;
  }

  textoResponsavel(model: Partial<Agendamento>): string {
    if (!model.nomeResponsavel) {
      return '';
    }

    return model.nomeResponsavel;
  }

  tituloSelecao(): string {
    if (this.tipoSelecao === 'cliente') {
      return 'Selecionar Cliente';
    }

    if (this.tipoSelecao === 'veiculo') {
      return 'Selecionar Veículo';
    }

    if (this.tipoSelecao === 'servico') {
      return 'Selecionar Serviço';
    }

    return 'Selecionar Responsável';
  }

  placeholderSelecao(): string {
    if (this.tipoSelecao === 'cliente') {
      return 'Buscar por nome, CPF, e-mail ou telefone...';
    }

    if (this.tipoSelecao === 'veiculo') {
      return 'Buscar por placa, fabricante, modelo ou cor...';
    }

    if (this.tipoSelecao === 'servico') {
      return 'Buscar por nome, categoria ou tipo de prestador...';
    }

    return 'Buscar responsável por nome, CPF, e-mail ou telefone...';
  }

  textoItemSelecaoPrincipal(item: any): string {
    if (this.tipoSelecao === 'cliente' || this.tipoSelecao === 'responsavel') {
      return item.nome || item.nome_social || 'Usuário sem nome';
    }

    if (this.tipoSelecao === 'veiculo') {
      return `${this.formatarPlaca(item.placa)} - ${item.fabricante || ''} ${item.modelo || ''}`.trim();
    }

    return item.nome || 'Serviço sem nome';
  }

  textoItemSelecaoSecundario(item: any): string {
    if (this.tipoSelecao === 'cliente' || this.tipoSelecao === 'responsavel') {
      const cpf = item.cpf ? `CPF: ${this.formatarCPF(item.cpf)}` : '';
      const email = item.email ? ` | ${item.email}` : '';
      const tipo = item.tipo_do_acesso ? ` | ${this.formatarTipoAcesso(item.tipo_do_acesso)}` : '';

      return `${cpf}${email}${tipo}`;
    }

    if (this.tipoSelecao === 'veiculo') {
      const cor = item.cor ? ` | Cor: ${item.cor}` : '';
      const ano = item.anoModeloCombustivel ? ` | ${item.anoModeloCombustivel}` : '';

      return `${item.fabricante || ''} ${item.modelo || ''}${cor}${ano}`.trim();
    }

    const categoria = item.categoria ? `Categoria: ${item.categoria}` : '';
    const valor = item.valorBase ? ` | Valor: ${this.formatarMoedaBR(item.valorBase)}` : '';
    const duracao = item.duracaoEstimada ? ` | Duração: ${item.duracaoEstimada} ${this.formatarUnidade(item.unidadeDuracao)}` : '';

    return `${categoria}${valor}${duracao}`;
  }

  formatarStatus(status?: string): string {
    if (!status) {
      return '';
    }

    const mapa: Record<string, string> = {
      AGENDADO: 'Agendado',
      CONFIRMADO: 'Confirmado',
      EM_ATENDIMENTO: 'Em atendimento',
      CONCLUIDO: 'Concluído',
      CANCELADO: 'Cancelado',
      NAO_COMPARECEU: 'Não compareceu',
      REAGENDADO: 'Reagendado'
    };

    return mapa[status] || status;
  }

  statusBadgeClass(status?: string): string {
    if (status === 'AGENDADO') {
      return 'bg-primary';
    }

    if (status === 'CONFIRMADO') {
      return 'bg-success';
    }

    if (status === 'EM_ATENDIMENTO') {
      return 'bg-warning text-dark';
    }

    if (status === 'CONCLUIDO') {
      return 'bg-info text-dark';
    }

    if (status === 'CANCELADO') {
      return 'bg-danger';
    }

    if (status === 'NAO_COMPARECEU') {
      return 'bg-dark';
    }

    if (status === 'REAGENDADO') {
      return 'bg-secondary';
    }

    return 'bg-secondary';
  }

  formatarCanal(canal?: string): string {
    if (!canal) {
      return '';
    }

    return canal
      .replace('_', ' ')
      .toLowerCase()
      .replace(/^\w/, c => c.toUpperCase());
  }

  formatarPrioridade(prioridade?: string): string {
    if (!prioridade) {
      return '';
    }

    return prioridade
      .toLowerCase()
      .replace(/^\w/, c => c.toUpperCase());
  }

  prioridadeBadgeClass(prioridade?: string): string {
    if (prioridade === 'URGENTE') {
      return 'bg-danger';
    }

    if (prioridade === 'ALTA') {
      return 'bg-warning text-dark';
    }

    if (prioridade === 'NORMAL') {
      return 'bg-primary';
    }

    return 'bg-secondary';
  }

  formatarTipoAtendimento(tipo?: string): string {
    if (!tipo) {
      return '';
    }

    const mapa: Record<string, string> = {
      PRESENCIAL: 'Presencial',
      RETIRADA_ENTREGA: 'Retirada/Entrega',
      GUINCHO: 'Guincho'
    };

    return mapa[tipo] || tipo;
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

  formatarDataCurta(data?: string | null): string {
    if (!data) {
      return '';
    }

    const d = new Date(data);

    if (Number.isNaN(d.getTime())) {
      return '';
    }

    return d.toLocaleDateString('pt-BR');
  }

  formatarHora(data?: string | null): string {
    if (!data) {
      return '';
    }

    const d = new Date(data);

    if (Number.isNaN(d.getTime())) {
      return '';
    }

    return d.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatarDuracao(minutos?: number | null): string {
    if (!minutos) {
      return '';
    }

    if (minutos < 60) {
      return `${minutos} min`;
    }

    const h = Math.floor(minutos / 60);
    const m = minutos % 60;

    return m > 0 ? `${h}h ${m}min` : `${h}h`;
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

  formatarValorEstimadoCadastro(): void {
    this.novoAgendamento.valorEstimado = this.formatarMoedaBR(this.novoAgendamento.valorEstimado);
  }

  formatarValorFinalCadastro(): void {
    this.novoAgendamento.valorFinal = this.formatarMoedaBR(this.novoAgendamento.valorFinal);
  }

  formatarValorEstimadoEdicao(): void {
    this.edit.valorEstimado = this.formatarMoedaBR(this.edit.valorEstimado);
  }

  formatarValorFinalEdicao(): void {
    this.edit.valorFinal = this.formatarMoedaBR(this.edit.valorFinal);
  }

  formatarCPF(cpf: any): string {
    const d = this.onlyDigits(cpf);

    if (d.length !== 11) {
      return cpf ?? '';
    }

    return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }

  formatarPlaca(placa: any): string {
    const v = (placa ?? '').toString().toUpperCase().replace(/[^A-Z0-9]/g, '');

    if (v.length === 7 && /^[A-Z]{3}\d{4}$/.test(v)) {
      return `${v.substring(0, 3)}-${v.substring(3)}`;
    }

    return v;
  }

  formatarTipoAcesso(tipo?: string): string {
    if (!tipo) {
      return '';
    }

    return tipo
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, c => c.toUpperCase());
  }

  formatarUnidade(unidade?: string): string {
    if (!unidade) {
      return '';
    }

    return unidade
      .toLowerCase()
      .replace(/^\w/, c => c.toUpperCase());
  }

  voltar(): void {
    this.location.back();
  }

  // ======================================================
  // HELPERS
  // ======================================================

  private asDateTimeLocal(data: any): string {
    if (!data) {
      return '';
    }

    const d = new Date(data);

    if (Number.isNaN(d.getTime())) {
      return '';
    }

    return this.dateToInputLocal(d);
  }

  private dateToInputLocal(d: Date): string {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');

    return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
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

  private limparOpcional(valor: any): string | undefined {
    if (valor === null || valor === undefined || valor.toString().trim() === '') {
      return undefined;
    }

    return valor.toString().trim();
  }

  private onlyDigits(v: any): string {
    return (v ?? '').toString().replace(/\D/g, '');
  }

  private tipoAcessoNormalizado(tipo: any): string {
    return (tipo ?? '')
      .toString()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toUpperCase()
      .replace(/-/g, '_')
      .replace(/\s/g, '_');
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
