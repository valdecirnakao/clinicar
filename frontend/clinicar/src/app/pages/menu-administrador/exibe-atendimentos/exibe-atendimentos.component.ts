import { Component, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';

import {
  AgendamentoResumo,
  Atendimento,
  AtendimentoRequest,
  ExibeAtendimentosService,
  FornecedorResumo,
  UsuarioResumo
} from './exibe-atendimentos.service';

declare var bootstrap: any;

type ModoFormulario = 'cadastro' | 'edicao';
type TipoSelecao = 'agendamento' | 'responsavel' | 'fornecedor';

@Component({
  selector: 'app-exibe-atendimentos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './exibe-atendimentos.component.html',
  styleUrls: ['./exibe-atendimentos.component.css']
})
export class ExibeAtendimentosComponent implements OnInit {

  atendimentos: Atendimento[] = [];
  private todos: Atendimento[] = [];

  agendamentos: AgendamentoResumo[] = [];
  agendamentosDisponiveis: AgendamentoResumo[] = [];

  usuarios: UsuarioResumo[] = [];
  responsaveis: UsuarioResumo[] = [];

  fornecedores: FornecedorResumo[] = [];

  itensSelecao: any[] = [];
  itensSelecaoFiltrados: any[] = [];

  novoAtendimento: Partial<Atendimento> = {};
  edit: Partial<Atendimento> = {};
  editId: number | null = null;

  atendimentoSelecionado: Atendimento | null = null;
  motivoCancelamento = '';

  filtroTexto = '';
  filtroStatus = '';
  filtroTipoExecucao = '';
  filtroPeriodoInicio = '';
  filtroPeriodoFim = '';
  filtroSelecao = '';

  modoFormulario: ModoFormulario = 'cadastro';
  tipoSelecao: TipoSelecao = 'agendamento';

  loading = false;
  errorMsg = '';

  modalCadastro: any;
  modalEdicao: any;
  modalSelecao: any;
  modalCancelamento: any;
  modalDetalhes: any;

  readonly statusFiltro = [
    '',
    'ABERTO',
    'EM_DIAGNOSTICO',
    'AGUARDANDO_APROVACAO',
    'APROVADO',
    'EM_EXECUCAO',
    'AGUARDANDO_TERCEIRO',
    'CONCLUIDO',
    'ENTREGUE',
    'CANCELADO'
  ];

  readonly tipoExecucaoFiltro = [
    '',
    'INTERNO',
    'TERCEIRO',
    'MISTO'
  ];

  readonly tiposExecucao = [
    'INTERNO',
    'TERCEIRO',
    'MISTO'
  ];

  readonly statusFormulario = [
    'ABERTO',
    'EM_DIAGNOSTICO',
    'AGUARDANDO_APROVACAO',
    'APROVADO',
    'EM_EXECUCAO',
    'AGUARDANDO_TERCEIRO',
    'CONCLUIDO'
  ];

  resumo = {
    total: 0,
    aberto: 0,
    diagnostico: 0,
    aguardandoAprovacao: 0,
    aprovado: 0,
    execucao: 0,
    terceiro: 0,
    concluido: 0,
    entregue: 0,
    cancelado: 0
  };

  constructor(
    private readonly service: ExibeAtendimentosService,
    private readonly location: Location
  ) {}

  ngOnInit(): void {
    this.carregarUsuarios();
    this.carregarFornecedores();
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
        this.carregarAgendamentos();
        this.loading = false;
      },
      error: (erro) => {
        console.error('Erro ao carregar atendimentos:', erro);
        this.errorMsg = this.extrairMensagemErro(
          erro,
          'Falha ao carregar os atendimentos.'
        );
        this.loading = false;
      }
    });
  }

  private carregarAgendamentos(): void {
    this.service.listarAgendamentos().subscribe({
      next: (lista) => {
        this.agendamentos = lista ?? [];
        this.atualizarAgendamentosDisponiveis();
      },
      error: (erro) => {
        console.error('Erro ao carregar agendamentos:', erro);
      }
    });
  }

  private carregarUsuarios(): void {
    this.service.listarUsuarios().subscribe({
      next: (lista) => {
        this.usuarios = lista ?? [];

        this.responsaveis = this.usuarios.filter(u => {
          const tipo = this.tipoAcessoNormalizado(u.tipo_do_acesso);
          return tipo === 'COLABORADOR' || tipo === 'ADMINISTRADOR';
        });
      },
      error: (erro) => {
        console.error('Erro ao carregar usuários:', erro);
      }
    });
  }

  private carregarFornecedores(): void {
    this.service.listarFornecedores().subscribe({
      next: (lista) => {
        this.fornecedores = lista ?? [];
      },
      error: (erro) => {
        console.error('Erro ao carregar fornecedores:', erro);
      }
    });
  }

  private atualizarAgendamentosDisponiveis(): void {
    const agendamentosComAtendimento = new Set(
      this.todos
        .map(a => a.idAgendamento)
        .filter(id => id !== null && id !== undefined)
        .map(id => Number(id))
    );

    this.agendamentosDisponiveis = this.agendamentos.filter(a => {
      const status = (a.statusAgendamento || '').toUpperCase();

      const statusPermiteAtendimento =
        status !== 'CANCELADO' &&
        status !== 'CONCLUIDO' &&
        status !== 'NAO_COMPARECEU';

      return statusPermiteAtendimento && !agendamentosComAtendimento.has(Number(a.id));
    });
  }

  filtrar(term: string): void {
    this.filtroTexto = term ?? '';
    this.aplicarFiltrosLocais();
  }

  aplicarFiltrosLocais(): void {
    const texto = this.filtroTexto.trim().toLowerCase();

    this.atendimentos = this.todos.filter(item => {
      const status = (item.statusAtendimento || '').toUpperCase();
      const tipoExecucao = (item.tipoExecucao || '').toUpperCase();

      if (this.filtroStatus && status !== this.filtroStatus) {
        return false;
      }

      if (this.filtroTipoExecucao && tipoExecucao !== this.filtroTipoExecucao) {
        return false;
      }

      if (!texto) {
        return true;
      }

      return (
        (item.codigoAtendimento || '').toLowerCase().includes(texto) ||
        (item.codigoAgendamento || '').toLowerCase().includes(texto) ||
        (item.nomeCliente || '').toLowerCase().includes(texto) ||
        (item.cpfCliente || '').toLowerCase().includes(texto) ||
        (item.placaVeiculo || '').toLowerCase().includes(texto) ||
        (item.fabricanteVeiculo || '').toLowerCase().includes(texto) ||
        (item.modeloVeiculo || '').toLowerCase().includes(texto) ||
        (item.nomeServico || '').toLowerCase().includes(texto) ||
        (item.nomeResponsavel || '').toLowerCase().includes(texto) ||
        (item.razaoSocialFornecedor || '').toLowerCase().includes(texto) ||
        this.formatarStatus(status).toLowerCase().includes(texto) ||
        this.formatarTipoExecucao(tipoExecucao).toLowerCase().includes(texto)
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
          'Falha ao filtrar atendimentos por período.'
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
    this.resumo.aberto = this.todos.filter(a => a.statusAtendimento === 'ABERTO').length;
    this.resumo.diagnostico = this.todos.filter(a => a.statusAtendimento === 'EM_DIAGNOSTICO').length;
    this.resumo.aguardandoAprovacao = this.todos.filter(a => a.statusAtendimento === 'AGUARDANDO_APROVACAO').length;
    this.resumo.aprovado = this.todos.filter(a => a.statusAtendimento === 'APROVADO').length;
    this.resumo.execucao = this.todos.filter(a => a.statusAtendimento === 'EM_EXECUCAO').length;
    this.resumo.terceiro = this.todos.filter(a => a.statusAtendimento === 'AGUARDANDO_TERCEIRO').length;
    this.resumo.concluido = this.todos.filter(a => a.statusAtendimento === 'CONCLUIDO').length;
    this.resumo.entregue = this.todos.filter(a => a.statusAtendimento === 'ENTREGUE').length;
    this.resumo.cancelado = this.todos.filter(a => a.statusAtendimento === 'CANCELADO').length;
  }

  trackByAtendimento = (_: number, item: Atendimento) => item.id ?? _;
  trackBySelecao = (_: number, item: any) => item.id ?? _;
  trackByString = (_: number, item: string) => item;

  abrirModalCadastro(): void {
    this.modoFormulario = 'cadastro';

    this.novoAtendimento = {
      idAgendamento: undefined,
      codigoAgendamento: '',

      idCliente: undefined,
      nomeCliente: '',

      idVeiculo: undefined,
      placaVeiculo: '',
      fabricanteVeiculo: '',
      modeloVeiculo: '',

      idServico: undefined,
      nomeServico: '',
      categoriaServico: '',

      idFornecedor: undefined,
      razaoSocialFornecedor: '',

      idResponsavel: undefined,
      nomeResponsavel: '',

      tipoExecucao: 'INTERNO',
      statusAtendimento: 'ABERTO',

      dataEntrada: this.agoraInputDateTime(),
      inicioReal: '',
      fimReal: '',
      prazoEstimadoEntrega: '',
      dataEntrega: '',

      quilometragemEntrada: null,
      quilometragemSaida: null,

      relatoCliente: '',
      diagnosticoTecnico: '',
      servicoExecutado: '',
      observacoesInternas: '',
      recomendacoesCliente: '',

      necessitaRetorno: false,
      dataRetornoSugerida: '',
      garantiaDias: 0,

      valorMaoObra: 'R$ 0,00',
      valorPecas: 'R$ 0,00',
      valorTerceiros: 'R$ 0,00',
      desconto: 'R$ 0,00',
      valorTotal: 'R$ 0,00',

      aprovado: false
    };

    this.atualizarAgendamentosDisponiveis();

    const el = document.getElementById('modalCadastroAtendimento');

    if (!el) {
      console.error('Modal modalCadastroAtendimento não encontrado.');
      return;
    }

    this.modalCadastro = bootstrap.Modal.getOrCreateInstance(el);
    this.modalCadastro.show();
  }

  salvarNovoAtendimento(): void {
    const erro = this.validarAtendimento(this.novoAtendimento, 'cadastro');

    if (erro) {
      alert(erro);
      return;
    }

    const payload = this.montarPayload(this.novoAtendimento);

    this.service.criar(payload).subscribe({
      next: () => {
        this.modalCadastro?.hide();
        alert('Atendimento cadastrado com sucesso.');
        this.recarregar();
      },
      error: (erro) => {
        console.error('Erro ao cadastrar atendimento:', erro);
        alert(this.extrairMensagemErro(erro, 'Erro ao cadastrar atendimento.'));
      }
    });
  }

  abrirModalEdicao(item: Atendimento): void {
    this.modoFormulario = 'edicao';
    this.editId = item.id ?? null;

    this.edit = {
      ...item,
      dataEntrada: this.asDateTimeLocal(item.dataEntrada),
      inicioReal: this.asDateTimeLocal(item.inicioReal),
      fimReal: this.asDateTimeLocal(item.fimReal),
      prazoEstimadoEntrega: this.asDateTimeLocal(item.prazoEstimadoEntrega),
      dataEntrega: this.asDateTimeLocal(item.dataEntrega),
      dataRetornoSugerida: this.asDateTimeLocal(item.dataRetornoSugerida),

      valorMaoObra: this.formatarMoedaBR(item.valorMaoObra),
      valorPecas: this.formatarMoedaBR(item.valorPecas),
      valorTerceiros: this.formatarMoedaBR(item.valorTerceiros),
      desconto: this.formatarMoedaBR(item.desconto),
      valorTotal: this.formatarMoedaBR(item.valorTotal)
    };

    const el = document.getElementById('modalEdicaoAtendimento');

    if (!el) {
      console.error('Modal modalEdicaoAtendimento não encontrado.');
      return;
    }

    this.modalEdicao = bootstrap.Modal.getOrCreateInstance(el);
    this.modalEdicao.show();
  }

  salvarEdicaoAtendimento(): void {
    if (!this.editId) {
      return;
    }

    const erro = this.validarAtendimento(this.edit, 'edicao');

    if (erro) {
      alert(erro);
      return;
    }

    const payload = this.montarPayload(this.edit);

    this.service.atualizar(this.editId, payload).subscribe({
      next: () => {
        this.modalEdicao?.hide();
        alert('Atendimento atualizado com sucesso.');
        this.recarregar();
      },
      error: (erro) => {
        console.error('Erro ao atualizar atendimento:', erro);
        alert(this.extrairMensagemErro(erro, 'Erro ao atualizar atendimento.'));
      }
    });
  }

  iniciar(item: Atendimento): void {
    if (!item.id) return;

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

  aprovar(item: Atendimento): void {
    if (!item.id) return;

    this.service.aprovar(item.id).subscribe({
      next: () => {
        alert('Atendimento aprovado com sucesso.');
        this.recarregar();
      },
      error: (erro) => {
        alert(this.extrairMensagemErro(erro, 'Erro ao aprovar atendimento.'));
      }
    });
  }

  aguardarTerceiro(item: Atendimento): void {
    if (!item.id) return;

    this.service.aguardarTerceiro(item.id).subscribe({
      next: () => {
        alert('Atendimento marcado como aguardando terceiro.');
        this.recarregar();
      },
      error: (erro) => {
        alert(this.extrairMensagemErro(erro, 'Erro ao enviar para terceiro.'));
      }
    });
  }

  concluir(item: Atendimento): void {
    if (!item.id) return;

    if (!confirm('Confirma concluir este atendimento?')) {
      return;
    }

    this.service.concluir(item.id).subscribe({
      next: () => {
        alert('Atendimento concluído com sucesso.');
        this.recarregar();
      },
      error: (erro) => {
        alert(this.extrairMensagemErro(erro, 'Erro ao concluir atendimento.'));
      }
    });
  }

  entregar(item: Atendimento): void {
    if (!item.id) return;

    if (!confirm('Confirma a entrega do veículo ao cliente?')) {
      return;
    }

    this.service.entregar(item.id).subscribe({
      next: () => {
        alert('Veículo entregue ao cliente com sucesso.');
        this.recarregar();
      },
      error: (erro) => {
        alert(this.extrairMensagemErro(erro, 'Erro ao entregar veículo ao cliente.'));
      }
    });
  }

  abrirModalCancelamento(item: Atendimento): void {
    this.atendimentoSelecionado = item;
    this.motivoCancelamento = '';

    const el = document.getElementById('modalCancelamentoAtendimento');

    if (!el) {
      console.error('Modal modalCancelamentoAtendimento não encontrado.');
      return;
    }

    this.modalCancelamento = bootstrap.Modal.getOrCreateInstance(el);
    this.modalCancelamento.show();
  }

  cancelarAtendimento(): void {
    if (!this.atendimentoSelecionado?.id) {
      return;
    }

    this.service.cancelar(
      this.atendimentoSelecionado.id,
      {
        motivoCancelamento: this.limparOpcional(this.motivoCancelamento)
      }
    ).subscribe({
      next: () => {
        this.modalCancelamento?.hide();
        alert('Atendimento cancelado com sucesso.');
        this.recarregar();
      },
      error: (erro) => {
        alert(this.extrairMensagemErro(erro, 'Erro ao cancelar atendimento.'));
      }
    });
  }

  abrirModalDetalhes(item: Atendimento): void {
    this.atendimentoSelecionado = item;

    const el = document.getElementById('modalDetalhesAtendimento');

    if (!el) {
      console.error('Modal modalDetalhesAtendimento não encontrado.');
      return;
    }

    this.modalDetalhes = bootstrap.Modal.getOrCreateInstance(el);
    this.modalDetalhes.show();
  }

  podeIniciar(item: Atendimento): boolean {
    return item.statusAtendimento === 'ABERTO'
      || item.statusAtendimento === 'EM_DIAGNOSTICO'
      || item.statusAtendimento === 'AGUARDANDO_APROVACAO'
      || item.statusAtendimento === 'APROVADO';
  }

  podeAprovar(item: Atendimento): boolean {
    return item.statusAtendimento !== 'CANCELADO'
      && item.statusAtendimento !== 'CONCLUIDO'
      && item.statusAtendimento !== 'ENTREGUE'
      && item.aprovado !== true;
  }

  podeAguardarTerceiro(item: Atendimento): boolean {
    const tipo = item.tipoExecucao || '';
    return (tipo === 'TERCEIRO' || tipo === 'MISTO')
      && !!item.idFornecedor
      && item.statusAtendimento !== 'CANCELADO'
      && item.statusAtendimento !== 'CONCLUIDO'
      && item.statusAtendimento !== 'ENTREGUE';
  }

  podeConcluir(item: Atendimento): boolean {
    return item.statusAtendimento !== 'CANCELADO'
      && item.statusAtendimento !== 'CONCLUIDO'
      && item.statusAtendimento !== 'ENTREGUE';
  }

  podeEntregar(item: Atendimento): boolean {
    return item.statusAtendimento === 'CONCLUIDO';
  }

  podeCancelar(item: Atendimento): boolean {
    return item.statusAtendimento !== 'CANCELADO'
      && item.statusAtendimento !== 'CONCLUIDO'
      && item.statusAtendimento !== 'ENTREGUE';
  }

  podeEditar(item: Atendimento): boolean {
    return item.statusAtendimento !== 'CANCELADO'
      && item.statusAtendimento !== 'ENTREGUE';
  }

  abrirModalSelecao(tipo: TipoSelecao, modo: ModoFormulario): void {
    this.tipoSelecao = tipo;
    this.modoFormulario = modo;
    this.filtroSelecao = '';

    if (tipo === 'agendamento') {
      this.atualizarAgendamentosDisponiveis();
      this.itensSelecao = [...this.agendamentosDisponiveis];
    } else if (tipo === 'responsavel') {
      this.itensSelecao = [...this.responsaveis];
    } else {
      this.itensSelecao = [...this.fornecedores];
    }

    this.itensSelecaoFiltrados = [...this.itensSelecao];

    const el = document.getElementById('modalSelecaoAtendimento');

    if (!el) {
      console.error('Modal modalSelecaoAtendimento não encontrado.');
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
      if (this.tipoSelecao === 'agendamento') {
        return (
          (item.codigoAgendamento || '').toLowerCase().includes(t) ||
          (item.nomeCliente || '').toLowerCase().includes(t) ||
          (item.cpfCliente || '').toLowerCase().includes(t) ||
          (item.placaVeiculo || '').toLowerCase().includes(t) ||
          (item.nomeServico || '').toLowerCase().includes(t)
        );
      }

      if (this.tipoSelecao === 'responsavel') {
        return (
          (item.nome || '').toLowerCase().includes(t) ||
          (item.nome_social || '').toLowerCase().includes(t) ||
          (item.cpf || '').toLowerCase().includes(t) ||
          (item.email || '').toLowerCase().includes(t) ||
          (item.telefone || '').toLowerCase().includes(t)
        );
      }

      return (
        (item.razaoSocial || '').toLowerCase().includes(t) ||
        (item.nomeFantasia || '').toLowerCase().includes(t) ||
        (item.cnpj || '').toLowerCase().includes(t) ||
        (item.email || '').toLowerCase().includes(t) ||
        (item.telefone || '').toLowerCase().includes(t)
      );
    });
  }

  selecionarItem(item: any): void {
    const model = this.obterModelAtual();

    if (this.tipoSelecao === 'agendamento') {
      model.idAgendamento = item.id;
      model.codigoAgendamento = item.codigoAgendamento;

      model.idCliente = item.idCliente;
      model.nomeCliente = item.nomeCliente;
      model.cpfCliente = item.cpfCliente;
      model.telefoneCliente = item.telefoneCliente;
      model.emailCliente = item.emailCliente;

      model.idVeiculo = item.idVeiculo;
      model.placaVeiculo = item.placaVeiculo;
      model.fabricanteVeiculo = item.fabricanteVeiculo;
      model.modeloVeiculo = item.modeloVeiculo;

      model.idServico = item.idServico;
      model.nomeServico = item.nomeServico;
      model.categoriaServico = item.categoriaServico;

      model.idFornecedor = item.idFornecedor;
      model.razaoSocialFornecedor = item.razaoSocialFornecedor;

      model.idResponsavel = item.idResponsavel;
      model.nomeResponsavel = item.nomeResponsavel;

      model.dataEntrada = this.agoraInputDateTime();
      model.prazoEstimadoEntrega = this.asDateTimeLocal(item.dataHoraFim);

      model.quilometragemEntrada = item.quilometragemAtual ?? null;

      model.relatoCliente = item.queixaCliente || '';
      model.diagnosticoTecnico = item.diagnosticoPrevio || '';
      model.observacoesInternas = item.observacoes || '';

      if (item.valorEstimado !== null && item.valorEstimado !== undefined) {
        model.valorMaoObra = this.formatarMoedaBR(item.valorEstimado);
      }
    }

    if (this.tipoSelecao === 'responsavel') {
      model.idResponsavel = item.id;
      model.nomeResponsavel = item.nome;
      model.tipoAcessoResponsavel = item.tipo_do_acesso;
    }

    if (this.tipoSelecao === 'fornecedor') {
      model.idFornecedor = item.id;
      model.razaoSocialFornecedor = item.razaoSocial || item.nomeFantasia;
    }

    this.recalcularTotal(model);
    this.modalSelecao?.hide();
  }

  limparFornecedor(model: Partial<Atendimento>): void {
    model.idFornecedor = undefined;
    model.razaoSocialFornecedor = '';
  }

  aoAlterarTipoExecucao(model: Partial<Atendimento>): void {
    const tipo = model.tipoExecucao || 'INTERNO';

    if (tipo === 'INTERNO') {
      this.limparFornecedor(model);
      model.valorTerceiros = 'R$ 0,00';

      if (model.statusAtendimento === 'AGUARDANDO_TERCEIRO') {
        model.statusAtendimento = 'ABERTO';
      }
    }

    if (tipo === 'TERCEIRO' || tipo === 'MISTO') {
      if (!model.statusAtendimento || model.statusAtendimento === 'ABERTO') {
        model.statusAtendimento = 'AGUARDANDO_TERCEIRO';
      }
    }

    this.recalcularTotal(model);
  }

  recalcularTotal(model: Partial<Atendimento>): void {
    const maoObra = this.moedaParaNumero(model.valorMaoObra);
    const pecas = this.moedaParaNumero(model.valorPecas);
    const terceiros = this.moedaParaNumero(model.valorTerceiros);
    const desconto = this.moedaParaNumero(model.desconto);

    const total = Math.max(maoObra + pecas + terceiros - desconto, 0);

    model.valorTotal = this.formatarMoedaBR(total);
  }

  formatarValores(model: Partial<Atendimento>): void {
    model.valorMaoObra = this.formatarMoedaBR(model.valorMaoObra);
    model.valorPecas = this.formatarMoedaBR(model.valorPecas);
    model.valorTerceiros = this.formatarMoedaBR(model.valorTerceiros);
    model.desconto = this.formatarMoedaBR(model.desconto);
    this.recalcularTotal(model);
  }

  private obterModelAtual(): Partial<Atendimento> {
    return this.modoFormulario === 'cadastro'
      ? this.novoAtendimento
      : this.edit;
  }

  private validarAtendimento(
    model: Partial<Atendimento>,
    modo: ModoFormulario
  ): string | null {
    if (modo === 'cadastro' && !model.idAgendamento) {
      return 'Selecione o agendamento que originará o atendimento.';
    }

    if (!model.tipoExecucao) {
      return 'Informe o tipo de execução.';
    }

    if ((model.tipoExecucao === 'TERCEIRO' || model.tipoExecucao === 'MISTO') && !model.idFornecedor) {
      return 'Selecione o fornecedor para atendimento terceiro ou misto.';
    }

    if (!model.statusAtendimento) {
      return 'Informe o status do atendimento.';
    }

    if (model.quilometragemEntrada !== null && model.quilometragemEntrada !== undefined) {
      if (Number(model.quilometragemEntrada) < 0) {
        return 'A quilometragem de entrada não pode ser negativa.';
      }
    }

    if (model.quilometragemSaida !== null && model.quilometragemSaida !== undefined) {
      if (Number(model.quilometragemSaida) < 0) {
        return 'A quilometragem de saída não pode ser negativa.';
      }
    }

    if (model.inicioReal && model.fimReal) {
      const inicio = new Date(model.inicioReal);
      const fim = new Date(model.fimReal);

      if (!Number.isNaN(inicio.getTime()) && !Number.isNaN(fim.getTime()) && fim < inicio) {
        return 'A data/hora final não pode ser anterior ao início real.';
      }
    }

    if (model.dataEntrada && model.dataEntrega) {
      const entrada = new Date(model.dataEntrada);
      const entrega = new Date(model.dataEntrega);

      if (!Number.isNaN(entrada.getTime()) && !Number.isNaN(entrega.getTime()) && entrega < entrada) {
        return 'A data de entrega não pode ser anterior à data de entrada.';
      }
    }

    if (Number(model.garantiaDias ?? 0) < 0) {
      return 'A garantia em dias não pode ser negativa.';
    }

    return null;
  }

  private montarPayload(model: Partial<Atendimento>): AtendimentoRequest {
    return {
      idAgendamento: model.idAgendamento ?? null,

      idFornecedor: model.idFornecedor ?? null,
      idResponsavel: model.idResponsavel ?? null,

      tipoExecucao: model.tipoExecucao || 'INTERNO',
      statusAtendimento: model.statusAtendimento || 'ABERTO',

      dataEntrada: model.dataEntrada || '',
      inicioReal: model.inicioReal || '',
      fimReal: model.fimReal || '',
      prazoEstimadoEntrega: model.prazoEstimadoEntrega || '',
      dataEntrega: model.dataEntrega || '',

      quilometragemEntrada: model.quilometragemEntrada === null || model.quilometragemEntrada === undefined
        ? null
        : Number(model.quilometragemEntrada),

      quilometragemSaida: model.quilometragemSaida === null || model.quilometragemSaida === undefined
        ? null
        : Number(model.quilometragemSaida),

      relatoCliente: this.limparOpcional(model.relatoCliente),
      diagnosticoTecnico: this.limparOpcional(model.diagnosticoTecnico),
      servicoExecutado: this.limparOpcional(model.servicoExecutado),
      observacoesInternas: this.limparOpcional(model.observacoesInternas),
      recomendacoesCliente: this.limparOpcional(model.recomendacoesCliente),

      necessitaRetorno: Boolean(model.necessitaRetorno),
      dataRetornoSugerida: model.dataRetornoSugerida || '',
      garantiaDias: Number(model.garantiaDias ?? 0),

      valorMaoObra: this.converterMoedaOpcionalParaNumero(model.valorMaoObra),
      valorPecas: this.converterMoedaOpcionalParaNumero(model.valorPecas),
      valorTerceiros: this.converterMoedaOpcionalParaNumero(model.valorTerceiros),
      desconto: this.converterMoedaOpcionalParaNumero(model.desconto),

      aprovado: Boolean(model.aprovado)
    };
  }

  textoAgendamento(model: Partial<Atendimento>): string {
    if (!model.codigoAgendamento) {
      return '';
    }

    return `${model.codigoAgendamento} - ${model.nomeCliente || ''} - ${this.formatarPlaca(model.placaVeiculo)}`;
  }

  textoResponsavel(model: Partial<Atendimento>): string {
    return model.nomeResponsavel || '';
  }

  textoFornecedor(model: Partial<Atendimento>): string {
    return model.razaoSocialFornecedor || '';
  }

  tituloSelecao(): string {
    if (this.tipoSelecao === 'agendamento') {
      return 'Selecionar Agendamento';
    }

    if (this.tipoSelecao === 'responsavel') {
      return 'Selecionar Responsável';
    }

    return 'Selecionar Fornecedor';
  }

  placeholderSelecao(): string {
    if (this.tipoSelecao === 'agendamento') {
      return 'Buscar por código, cliente, CPF, placa ou serviço...';
    }

    if (this.tipoSelecao === 'responsavel') {
      return 'Buscar por nome, CPF, e-mail ou telefone...';
    }

    return 'Buscar por razão social, nome fantasia, CNPJ, e-mail ou telefone...';
  }

  textoItemSelecaoPrincipal(item: any): string {
    if (this.tipoSelecao === 'agendamento') {
      return `${item.codigoAgendamento} - ${item.nomeCliente || ''}`;
    }

    if (this.tipoSelecao === 'responsavel') {
      return item.nome || item.nome_social || 'Usuário sem nome';
    }

    return item.razaoSocial || item.nomeFantasia || 'Fornecedor sem nome';
  }

  textoItemSelecaoSecundario(item: any): string {
    if (this.tipoSelecao === 'agendamento') {
      return `${this.formatarPlaca(item.placaVeiculo)} | ${item.nomeServico || ''} | ${this.formatarDataHora(item.dataHoraInicio)}`;
    }

    if (this.tipoSelecao === 'responsavel') {
      const cpf = item.cpf ? `CPF: ${this.formatarCPF(item.cpf)}` : '';
      const email = item.email ? ` | ${item.email}` : '';
      const tipo = item.tipo_do_acesso ? ` | ${this.formatarTipoAcesso(item.tipo_do_acesso)}` : '';

      return `${cpf}${email}${tipo}`;
    }

    const cnpj = item.cnpj ? `CNPJ: ${this.formatarCNPJ(item.cnpj)}` : '';
    const email = item.email ? ` | ${item.email}` : '';
    const tel = item.telefone ? ` | ${item.telefone}` : '';

    return `${cnpj}${email}${tel}`;
  }

  formatarStatus(status?: string): string {
    const mapa: Record<string, string> = {
      ABERTO: 'Aberto',
      EM_DIAGNOSTICO: 'Em diagnóstico',
      AGUARDANDO_APROVACAO: 'Aguardando aprovação',
      APROVADO: 'Aprovado',
      EM_EXECUCAO: 'Em execução',
      AGUARDANDO_TERCEIRO: 'Aguardando terceiro',
      CONCLUIDO: 'Concluído',
      ENTREGUE: 'Entregue',
      CANCELADO: 'Cancelado'
    };

    return status ? mapa[status] || status : '';
  }

  statusBadgeClass(status?: string): string {
    if (status === 'ABERTO') return 'bg-primary';
    if (status === 'EM_DIAGNOSTICO') return 'bg-secondary';
    if (status === 'AGUARDANDO_APROVACAO') return 'bg-warning text-dark';
    if (status === 'APROVADO') return 'bg-success';
    if (status === 'EM_EXECUCAO') return 'bg-info text-dark';
    if (status === 'AGUARDANDO_TERCEIRO') return 'bg-dark';
    if (status === 'CONCLUIDO') return 'bg-success';
    if (status === 'ENTREGUE') return 'bg-primary';
    if (status === 'CANCELADO') return 'bg-danger';

    return 'bg-secondary';
  }

  formatarTipoExecucao(tipo?: string): string {
    const mapa: Record<string, string> = {
      INTERNO: 'Interno',
      TERCEIRO: 'Terceiro',
      MISTO: 'Misto'
    };

    return tipo ? mapa[tipo] || tipo : '';
  }

  tipoExecucaoBadgeClass(tipo?: string): string {
    if (tipo === 'INTERNO') return 'bg-primary';
    if (tipo === 'TERCEIRO') return 'bg-dark';
    if (tipo === 'MISTO') return 'bg-warning text-dark';

    return 'bg-secondary';
  }

  formatarDataHora(data?: string | null): string {
    if (!data) return '';

    const d = new Date(data);

    if (Number.isNaN(d.getTime())) {
      return '';
    }

    return d.toLocaleString('pt-BR');
  }

  formatarDataCurta(data?: string | null): string {
    if (!data) return '';

    const d = new Date(data);

    if (Number.isNaN(d.getTime())) {
      return '';
    }

    return d.toLocaleDateString('pt-BR');
  }

  formatarHora(data?: string | null): string {
    if (!data) return '';

    const d = new Date(data);

    if (Number.isNaN(d.getTime())) {
      return '';
    }

    return d.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
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

  private moedaParaNumero(valor: any): number {
    const convertido = this.converterMoedaOpcionalParaNumero(valor);
    const numero = Number(convertido);

    return Number.isNaN(numero) ? 0 : numero;
  }

  private converterMoedaOpcionalParaNumero(valor: any): string {
    if (valor === null || valor === undefined || valor === '') {
      return '0.00';
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
      return '0.00';
    }

    return numero.toFixed(2);
  }

  formatarCPF(cpf: any): string {
    const d = this.onlyDigits(cpf);

    if (d.length !== 11) {
      return cpf ?? '';
    }

    return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }

  formatarCNPJ(cnpj: any): string {
    const d = this.onlyDigits(cnpj);

    if (d.length !== 14) {
      return cnpj ?? '';
    }

    return d.replace(
      /(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/,
      '$1.$2.$3/$4-$5'
    );
  }

  formatarPlaca(placa: any): string {
    const v = (placa ?? '').toString().toUpperCase().replace(/[^A-Z0-9]/g, '');

    if (v.length === 7 && /^[A-Z]{3}\d{4}$/.test(v)) {
      return `${v.substring(0, 3)}-${v.substring(3)}`;
    }

    return v;
  }

  formatarTipoAcesso(tipo?: string): string {
    if (!tipo) return '';

    return tipo
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, c => c.toUpperCase());
  }

  voltar(): void {
    this.location.back();
  }

  private asDateTimeLocal(data: any): string {
    if (!data) return '';

    const d = new Date(data);

    if (Number.isNaN(d.getTime())) {
      return '';
    }

    return this.dateToInputLocal(d);
  }

  private agoraInputDateTime(): string {
    return this.dateToInputLocal(new Date());
  }

  private dateToInputLocal(d: Date): string {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');

    return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
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
