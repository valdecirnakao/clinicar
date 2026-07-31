import { CommonModule, Location } from '@angular/common';
import { Component, HostListener, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { catchError, forkJoin, of } from 'rxjs';

import {
  Agendamento,
  AgendamentoCancelamentoRequest,
  AgendamentoPecaSelecionada,
  AgendamentoRequest,
  ExibeAgendamentosService,
  FornecedorResumo,
  FornecimentoPecaResumo,
  PecaResumo,
  ServicoResumo,
  UsuarioResumo,
  VeiculoResumo
} from './exibe-agendamentos.service';

declare var bootstrap: any;

@Component({
  selector: 'app-exibe-agendamentos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './exibe-agendamentos.component.html',
  styleUrl: './exibe-agendamentos.component.css'
})
export class ExibeAgendamentosComponent implements OnInit {

  agendamentos: Agendamento[] = [];
  usuarios: UsuarioResumo[] = [];
  veiculos: VeiculoResumo[] = [];
  servicos: ServicoResumo[] = [];
  fornecedores: FornecedorResumo[] = [];
  pecas: PecaResumo[] = [];
  fornecimentosPecas: FornecimentoPecaResumo[] = [];

  pecasNovoAgendamento: AgendamentoPecaSelecionada[] = [];

  novoAgendamento: Partial<Agendamento> = {};
  agendamentoSelecionado: Agendamento | null = null;

  pecaForm: Partial<AgendamentoPecaSelecionada> = {};

  filtro = '';
  filtroStatus = '';
  statusFiltroAberto = false;

  paginaAtual = 1;
  itensPorPagina = 10;
  opcoesItensPorPagina = [5, 10, 20, 50];

  carregando = false;
  mensagemErro = '';
  mensagemErroModal = '';
  mensagemDisponibilidadeResponsavel = '';

  abaNovoAgendamento: 'agendamento' | 'pecas' | 'adicionais' = 'agendamento';

  modalCadastro: any;
  modalPeca: any;
  modalDetalhes: any;
  modalCancelamento: any;

  editandoId: number | null = null;
  editandoPecaId: number | null = null;

  private tempPecaId = -1;

  motivoCancelamento = '';

  readonly statusAgendamento = [
    'AGENDADO',
    'CONFIRMADO',
    'EM_ATENDIMENTO',
    'CONCLUIDO',
    'CANCELADO',
    'NAO_COMPARECEU',
    'REAGENDADO'
  ];

  readonly canais = ['SISTEMA', 'TELEFONE', 'WHATSAPP', 'PRESENCIAL', 'SITE'];
  readonly prioridades = ['BAIXA', 'NORMAL', 'ALTA', 'URGENTE'];
  readonly tiposAtendimento = ['PRESENCIAL', 'RETIRADA_ENTREGA', 'GUINCHO'];

  constructor(
    private service: ExibeAgendamentosService,
    private location: Location
  ) { }

  ngOnInit(): void {
    this.carregarTudo();
  }

  get clientes(): UsuarioResumo[] {
    return this.usuarios.filter(usuario => {
      const tipo = this.normalizarTipoAcesso(usuario.tipo_do_acesso || usuario.tipoDoAcesso);
      return tipo === 'CLIENTE' || tipo === 'ADMINISTRADOR';
    });
  }

  get responsaveis(): UsuarioResumo[] {
    return this.usuarios.filter(usuario => {
      const tipo = this.normalizarTipoAcesso(usuario.tipo_do_acesso || usuario.tipoDoAcesso);
      return tipo === 'COLABORADOR' || tipo === 'ADMINISTRADOR';
    });
  }

  get agendamentosFiltrados(): Agendamento[] {
    const termo = this.normalizar(this.filtro);

    return this.agendamentos.filter(item => {
      const statusOk = !this.filtroStatus || item.statusAgendamento === this.filtroStatus;

      const texto = this.normalizar([
        item.codigoAgendamento,
        item.nomeCliente,
        item.placaVeiculo,
        item.modeloVeiculo,
        item.nomeServico,
        item.statusAgendamento
      ].join(' '));

      return statusOk && (!termo || texto.includes(termo));
    });
  }

  get totalRegistrosFiltrados(): number {
    return this.agendamentosFiltrados.length;
  }

  get totalPaginas(): number {
    return Math.max(
      1,
      Math.ceil(this.totalRegistrosFiltrados / this.itensPorPagina)
    );
  }

  get indiceInicialPagina(): number {
    if (this.totalRegistrosFiltrados === 0) {
      return 0;
    }

    return (this.paginaAtual - 1) * this.itensPorPagina + 1;
  }

  get indiceFinalPagina(): number {
    return Math.min(
      this.paginaAtual * this.itensPorPagina,
      this.totalRegistrosFiltrados
    );
  }

  get agendamentosPaginados(): Agendamento[] {
    this.ajustarPaginaAtual();

    const inicio = (this.paginaAtual - 1) * this.itensPorPagina;
    const fim = inicio + this.itensPorPagina;

    return this.agendamentosFiltrados.slice(inicio, fim);
  }

  get totalAgendamentos(): number {
    return this.agendamentos.length;
  }

  get totalConfirmados(): number {
    return this.agendamentos.filter(a => a.statusAgendamento === 'CONFIRMADO').length;
  }

  get totalEmAtendimento(): number {
    return this.agendamentos.filter(a => a.statusAgendamento === 'EM_ATENDIMENTO').length;
  }

  get totalConcluidos(): number {
    return this.agendamentos.filter(a => a.statusAgendamento === 'CONCLUIDO').length;
  }

  get agendamentoProntoParaSalvar(): boolean {
    return this.validarCamposObrigatoriosAgendamento() === null;
  }

  get mensagemBloqueioSalvar(): string {
    return this.validarCamposObrigatoriosAgendamento() || '';
  }

  carregarTudo(): void {
    this.carregando = true;
    this.mensagemErro = '';

    forkJoin({
      agendamentos: this.service.listar(),
      usuarios: this.service.listarUsuarios(),
      veiculos: this.service.listarVeiculos(),
      servicos: this.service.listarServicos(),
      fornecedores: this.service.listarFornecedores(),
      pecas: this.service.listarPecas(),
      fornecimentosPecas: this.service.listarFornecimentosPecas().pipe(
        catchError((erro) => {
          console.warn('Não foi possível carregar fornecimentos de peças:', erro);
          return of([]);
        })
      )
    }).subscribe({
      next: (resposta) => {
        this.agendamentos = this.extrairLista<Agendamento>(resposta.agendamentos);
        this.usuarios = this.extrairLista<UsuarioResumo>(resposta.usuarios);
        this.veiculos = this.extrairLista<VeiculoResumo>(resposta.veiculos);
        this.servicos = this.extrairLista<ServicoResumo>(resposta.servicos);
        this.fornecedores = this.extrairLista<FornecedorResumo>(resposta.fornecedores);
        this.pecas = this.extrairLista<PecaResumo>(resposta.pecas);
        this.fornecimentosPecas = this.extrairLista<FornecimentoPecaResumo>(resposta.fornecimentosPecas);

        this.paginaAtual = 1;
        this.carregando = false;
      },
      error: (erro) => {
        this.mensagemErro = this.extrairMensagemErro(erro, 'Erro ao carregar agendamentos.');
        this.carregando = false;
      }
    });
  }

  recarregar(): void {
    this.carregando = true;

    this.service.listar().subscribe({
      next: (lista) => {
        this.agendamentos = this.extrairLista<Agendamento>(lista);
        this.paginaAtual = 1;
        this.carregando = false;
      },
      error: (erro) => {
        this.mensagemErro = this.extrairMensagemErro(erro, 'Erro ao recarregar agendamentos.');
        this.carregando = false;
      }
    });
  }

  voltar(): void {
    this.location.back();
  }

  trocarAbaNovoAgendamento(
    aba: 'agendamento' | 'pecas' | 'adicionais'
  ): void {
    this.abaNovoAgendamento = aba;
  }

  abrirModalCadastro(): void {
    this.editandoId = null;
    this.abaNovoAgendamento = 'agendamento';
    this.mensagemErroModal = '';
    this.mensagemDisponibilidadeResponsavel = '';
    this.pecasNovoAgendamento = [];
    this.tempPecaId = -1;

    this.novoAgendamento = {
      idCliente: undefined,
      nomeCliente: '',

      idVeiculo: undefined,
      placaVeiculo: '',
      fabricanteVeiculo: '',
      modeloVeiculo: '',
      corVeiculo: '',

      idServico: undefined,
      nomeServico: '',
      categoriaServico: '',

      idFornecedor: undefined,
      razaoSocialFornecedor: '',

      idResponsavel: undefined,
      nomeResponsavel: '',

      dataHoraInicio: this.agoraInputDateTime(),
      dataHoraFim: '',
      duracaoEstimadaMinutos: 60,

      statusAgendamento: 'AGENDADO',
      canalOrigem: 'SISTEMA',
      prioridade: 'NORMAL',
      tipoAtendimento: 'PRESENCIAL',

      quilometragemAtual: null,
      queixaCliente: '',
      diagnosticoPrevio: '',
      observacoes: '',

      valorEstimado: 'R$ 0,00',
      valorFinal: '',

      requerConfirmacao: true,
      confirmado: false
    };

    this.recalcularDataFim();
    this.recalcularValoresAgendamento();
    this.atualizarDisponibilidadeResponsavel();

    const el = document.getElementById('modalCadastroAgendamento');

    if (!el) return;

    this.modalCadastro = bootstrap.Modal.getOrCreateInstance(el);
    this.modalCadastro.show();
  }

  abrirModalEdicao(item: Agendamento): void {
    this.editandoId = item.id ?? null;
    this.abaNovoAgendamento = 'agendamento';
    this.mensagemErroModal = '';
    this.mensagemDisponibilidadeResponsavel = '';
    this.pecasNovoAgendamento = [];

    this.novoAgendamento = {
      ...item,
      idCliente: item.idCliente ?? item.cliente?.id,
      idVeiculo: item.idVeiculo ?? item.veiculo?.id,
      idServico: item.idServico ?? item.servico?.id,
      idFornecedor: item.idFornecedor ?? item.fornecedor?.id,
      idResponsavel: item.idResponsavel ?? item.responsavel?.id,
      dataHoraInicio: this.paraDatetimeLocal(item.dataHoraInicio || ''),
      dataHoraFim: this.paraDatetimeLocal(item.dataHoraFim || ''),
      valorEstimado: this.formatarMoedaBR(item.valorEstimado),
      valorFinal: item.valorFinal ? this.formatarMoedaBR(item.valorFinal) : ''
    };

    this.selecionarCliente(false);
    this.selecionarVeiculo();
    this.selecionarServico(false);
    this.atualizarDisponibilidadeResponsavel();

    const el = document.getElementById('modalCadastroAgendamento');

    if (!el) return;

    this.modalCadastro = bootstrap.Modal.getOrCreateInstance(el);
    this.modalCadastro.show();
  }

  selecionarCliente(limparVeiculo: boolean = true): void {
    const idCliente = Number(this.novoAgendamento.idCliente);

    const cliente = this.clientes.find(c => Number(c.id) === idCliente);

    if (!cliente) return;

    this.novoAgendamento.nomeCliente = cliente.nome || cliente.nome_social || cliente.nomeSocial || '';
    this.novoAgendamento.cpfCliente = cliente.cpf || '';
    this.novoAgendamento.emailCliente = cliente.email || '';
    this.novoAgendamento.telefoneCliente = cliente.telefone || '';

    if (limparVeiculo) {
      this.novoAgendamento.idVeiculo = undefined;
      this.novoAgendamento.placaVeiculo = '';
      this.novoAgendamento.modeloVeiculo = '';
      this.novoAgendamento.fabricanteVeiculo = '';
      this.novoAgendamento.corVeiculo = '';
      this.novoAgendamento.anoModeloCombustivelVeiculo = '';

      const veiculosEncontrados = this.veiculosDoCliente();

      if (veiculosEncontrados.length === 1 && veiculosEncontrados[0].id) {
        this.novoAgendamento.idVeiculo = veiculosEncontrados[0].id;
        this.selecionarVeiculo();
      }
    }
  }

  veiculosDoCliente(): VeiculoResumo[] {
    const idCliente = Number(this.novoAgendamento.idCliente);

    if (!idCliente) {
      return this.veiculos;
    }

    return this.veiculos.filter(veiculo => {
      const idClienteVeiculo = this.idClienteDoVeiculo(veiculo);
      return Number(idClienteVeiculo) === Number(idCliente);
    });
  }

  labelVeiculo(veiculo: VeiculoResumo): string {
    const placa = this.placaDoVeiculo(veiculo);
    const modelo = this.capitalizar(this.modeloDoVeiculo(veiculo));

    return `${this.formatarPlaca(placa)} │ ${modelo || ''}`.trim();
  }

  selecionarVeiculo(): void {
    const idVeiculo = Number(this.novoAgendamento.idVeiculo);

    const veiculo = this.veiculos.find(v => Number(v.id) === idVeiculo);

    if (!veiculo) return;

    this.novoAgendamento.placaVeiculo = this.placaDoVeiculo(veiculo);
    this.novoAgendamento.fabricanteVeiculo = this.fabricanteDoVeiculo(veiculo);
    this.novoAgendamento.modeloVeiculo = this.modeloDoVeiculo(veiculo);
    this.novoAgendamento.corVeiculo = this.corDoVeiculo(veiculo);
    this.novoAgendamento.anoModeloCombustivelVeiculo =
      veiculo.anoModeloCombustivel
      || veiculo.ano_modelo_combustivel
      || '';
  }

  selecionarServico(recalcular: boolean = true): void {
    const idServico = Number(this.novoAgendamento.idServico);

    const servico = this.servicos.find(s => Number(s.id) === idServico);

    if (!servico) return;

    this.novoAgendamento.nomeServico = servico.nome || servico.descricao || '';
    this.novoAgendamento.categoriaServico = servico.categoria || '';

    const duracaoMinutos = this.duracaoServicoEmMinutos(servico);

    this.novoAgendamento.duracaoEstimadaMinutos = duracaoMinutos;

    const idFornecedor = this.idFornecedorObjeto(servico);

    if (idFornecedor) {
      this.novoAgendamento.idFornecedor = idFornecedor;
    }

    const nomeFornecedor = this.nomeFornecedorObjeto(servico);

    if (nomeFornecedor) {
      this.novoAgendamento.razaoSocialFornecedor = nomeFornecedor;
    }

    if (recalcular) {
      this.recalcularDataFim();
      this.recalcularValoresAgendamento();
      this.atualizarDisponibilidadeResponsavel();
    }
  }

  recalcularDataFim(): void {
    if (!this.novoAgendamento.dataHoraInicio) return;

    const inicio = new Date(this.novoAgendamento.dataHoraInicio);

    if (Number.isNaN(inicio.getTime())) return;

    const duracao = Number(this.novoAgendamento.duracaoEstimadaMinutos || 60);

    inicio.setMinutes(inicio.getMinutes() + duracao);

    this.novoAgendamento.dataHoraFim = this.paraDatetimeLocal(inicio.toISOString());

    this.atualizarDisponibilidadeResponsavel();
  }

  atualizarDisponibilidadeResponsavel(): void {
    this.mensagemDisponibilidadeResponsavel = '';

    if (!this.periodoAgendamentoValido()) {
      this.novoAgendamento.idResponsavel = undefined;
      this.novoAgendamento.nomeResponsavel = '';
      return;
    }

    const disponiveis = this.responsaveisDisponiveis();

    if (disponiveis.length === 0) {
      this.novoAgendamento.idResponsavel = undefined;
      this.novoAgendamento.nomeResponsavel = '';
      this.mensagemDisponibilidadeResponsavel =
        'Nenhum responsável disponível para o período informado.';
      return;
    }

    const idResponsavelAtual = Number(this.novoAgendamento.idResponsavel);

    if (!idResponsavelAtual) {
      return;
    }

    const aindaDisponivel = disponiveis.some(r => Number(r.id) === idResponsavelAtual);

    if (!aindaDisponivel) {
      this.novoAgendamento.idResponsavel = undefined;
      this.novoAgendamento.nomeResponsavel = '';
      this.mensagemDisponibilidadeResponsavel =
        'O responsável selecionado não está disponível neste período. Selecione outro responsável.';
    }
  }

  periodoAgendamentoValido(): boolean {
    const inicio = this.dataValida(this.novoAgendamento.dataHoraInicio);
    const fim = this.dataValida(this.novoAgendamento.dataHoraFim);

    if (!inicio || !fim) return false;

    return fim.getTime() > inicio.getTime();
  }

  responsaveisDisponiveis(): UsuarioResumo[] {
    if (!this.periodoAgendamentoValido()) {
      return [];
    }

    return this.responsaveis.filter(responsavel =>
      this.responsavelDisponivelNoPeriodo(responsavel)
    );
  }

  selecionarResponsavel(): void {
    this.mensagemDisponibilidadeResponsavel = '';

    const idResponsavel = Number(this.novoAgendamento.idResponsavel);

    if (!idResponsavel) {
      this.novoAgendamento.nomeResponsavel = '';
      return;
    }

    const responsavel = this.responsaveis.find(r => Number(r.id) === idResponsavel);

    if (!responsavel) {
      this.novoAgendamento.idResponsavel = undefined;
      this.novoAgendamento.nomeResponsavel = '';
      return;
    }

    if (!this.responsavelDisponivelNoPeriodo(responsavel)) {
      this.novoAgendamento.idResponsavel = undefined;
      this.novoAgendamento.nomeResponsavel = '';
      this.mensagemDisponibilidadeResponsavel =
        'Este responsável já possui agendamento no período informado.';
      return;
    }

    this.novoAgendamento.nomeResponsavel =
      responsavel.nome
      || responsavel.nome_social
      || responsavel.nomeSocial
      || '';
  }

  private responsavelDisponivelNoPeriodo(responsavel: UsuarioResumo): boolean {
    const idResponsavel = Number(responsavel.id);

    if (!idResponsavel) return false;

    const inicioNovo = this.dataValida(this.novoAgendamento.dataHoraInicio);
    const fimNovo = this.dataValida(this.novoAgendamento.dataHoraFim);

    if (!inicioNovo || !fimNovo) return false;

    return !this.agendamentos.some(agendamento => {
      if (this.editandoId && Number(agendamento.id) === Number(this.editandoId)) {
        return false;
      }

      const idResponsavelAgendamento = this.idResponsavelDoAgendamento(agendamento);

      if (!idResponsavelAgendamento || Number(idResponsavelAgendamento) !== idResponsavel) {
        return false;
      }

      if (!this.statusBloqueiaResponsavel(agendamento.statusAgendamento)) {
        return false;
      }

      const inicioExistente = this.dataValida(agendamento.dataHoraInicio);
      const fimExistente = this.dataValida(agendamento.dataHoraFim);

      if (!inicioExistente || !fimExistente) {
        return false;
      }

      return this.periodosSobrepostos(
        inicioNovo,
        fimNovo,
        inicioExistente,
        fimExistente
      );
    });
  }

  private periodosSobrepostos(
    inicioNovo: Date,
    fimNovo: Date,
    inicioExistente: Date,
    fimExistente: Date
  ): boolean {
    return inicioNovo.getTime() < fimExistente.getTime()
      && fimNovo.getTime() > inicioExistente.getTime();
  }

  private statusBloqueiaResponsavel(status?: string | null): boolean {
    const statusNormalizado = String(status || '').toUpperCase();

    return statusNormalizado === 'AGENDADO'
      || statusNormalizado === 'CONFIRMADO'
      || statusNormalizado === 'EM_ATENDIMENTO'
      || statusNormalizado === 'REAGENDADO';
  }

  private idResponsavelDoAgendamento(agendamento: any): number | undefined {
    const valor = this.obterCampo(
      agendamento,
      [
        'idResponsavel',
        'id_responsavel',
        'responsavel.id'
      ]
    );

    if (valor === null || valor === undefined || valor === '') {
      return undefined;
    }

    const numero = Number(valor);

    return Number.isNaN(numero) ? undefined : numero;
  }

  private dataValida(valor?: string | null): Date | null {
    if (!valor) return null;

    const data = new Date(valor);

    if (Number.isNaN(data.getTime())) {
      return null;
    }

    return data;
  }

  abrirModalPecaAgendamento(): void {
    this.resetarPecaForm();

    const el = document.getElementById('modalPecaAgendamento');

    if (!el) return;

    this.modalPeca = bootstrap.Modal.getOrCreateInstance(el);
    this.modalPeca.show();
  }

  abrirModalEditarPecaAgendamento(item: AgendamentoPecaSelecionada): void {
    this.editarPecaAgendamento(item);

    const el = document.getElementById('modalPecaAgendamento');

    if (!el) return;

    this.modalPeca = bootstrap.Modal.getOrCreateInstance(el);
    this.modalPeca.show();
  }

  resetarPecaForm(): void {
    this.editandoPecaId = null;

    this.pecaForm = {
      idPeca: undefined,
      nomePeca: '',
      descricaoPeca: '',
      fabricantePeca: '',
      modeloPeca: '',
      idFornecedor: undefined,
      razaoSocialFornecedor: '',
      quantidade: '1',
      unidadeMedida: 'UNIDADE',
      valorUnitario: 'R$ 0,00',
      valorTotal: 'R$ 0,00',
      observacoes: ''
    };
  }

  selecionarPecaCatalogo(): void {
    const idPeca = Number(this.pecaForm.idPeca);

    if (!idPeca) return;

    const peca = this.pecas.find(p => Number(p.id) === idPeca);

    if (!peca) return;

    const fornecimento = this.encontrarFornecimentoDaPeca(idPeca);

    this.pecaForm.nomePeca = peca.nome || peca.descricao || '';
    this.pecaForm.descricaoPeca = peca.descricao || peca.nome || '';
    this.pecaForm.fabricantePeca = peca.fabricante || '';
    this.pecaForm.modeloPeca = peca.modelo || '';

    this.pecaForm.quantidade = '1';

    if (fornecimento) {
      this.pecaForm.unidadeMedida =
        this.unidadePadraoFornecimentoPeca(fornecimento)
        || this.unidadePadraoPeca(peca);

      this.pecaForm.valorUnitario = this.formatarMoedaBR(
        this.valorPadraoFornecimentoPeca(fornecimento)
      );

      const idFornecedor = this.idFornecedorObjeto(fornecimento);

      if (idFornecedor) {
        this.pecaForm.idFornecedor = idFornecedor;
      }

      const nomeFornecedor = this.nomeFornecedorObjeto(fornecimento);

      if (nomeFornecedor) {
        this.pecaForm.razaoSocialFornecedor = nomeFornecedor;
      }
    } else {
      this.pecaForm.unidadeMedida = this.unidadePadraoPeca(peca);
      this.pecaForm.valorUnitario = this.formatarMoedaBR(0);
    }

    this.recalcularTotalPecaForm();
  }

  recalcularTotalPecaForm(): void {
    const qtd = this.quantidadeInteiraMinima(this.pecaForm.quantidade);
    const unitario = this.moedaParaNumero(this.pecaForm.valorUnitario);
    const total = Math.max(qtd * unitario, 0);

    this.pecaForm.valorTotal = this.formatarMoedaBR(total);
  }

  normalizarQuantidadePecaForm(): void {
    const qtd = this.quantidadeInteiraMinima(this.pecaForm.quantidade);

    this.pecaForm.quantidade = String(qtd);
    this.recalcularTotalPecaForm();
  }

  formatarValorUnitarioPeca(): void {
    this.pecaForm.valorUnitario = this.formatarMoedaBR(this.pecaForm.valorUnitario);
    this.recalcularTotalPecaForm();
  }

  salvarPecaAgendamento(): void {
    this.normalizarQuantidadePecaForm();

    if (!this.pecaForm.idPeca) {
      alert('Selecione uma peça.');
      return;
    }

    if (this.quantidadeInteiraMinima(this.pecaForm.quantidade) <= 0) {
      alert('Informe uma quantidade maior que zero.');
      return;
    }

    const quantidade = this.quantidadeInteiraMinima(this.pecaForm.quantidade);
    const valorUnitario = this.moedaParaNumero(this.pecaForm.valorUnitario);

    const item: AgendamentoPecaSelecionada = {
      id: this.editandoPecaId ?? this.tempPecaId--,
      idPeca: Number(this.pecaForm.idPeca),
      nomePeca: this.pecaForm.nomePeca || '',
      descricaoPeca: this.pecaForm.descricaoPeca || this.pecaForm.nomePeca || '',
      fabricantePeca: this.pecaForm.fabricantePeca || '',
      modeloPeca: this.pecaForm.modeloPeca || '',
      idFornecedor: this.pecaForm.idFornecedor ? Number(this.pecaForm.idFornecedor) : null,
      razaoSocialFornecedor: this.pecaForm.razaoSocialFornecedor || '',
      quantidade,
      unidadeMedida: this.pecaForm.unidadeMedida || 'UNIDADE',
      valorUnitario: valorUnitario.toFixed(2),
      valorTotal: (quantidade * valorUnitario).toFixed(2),
      observacoes: this.pecaForm.observacoes || ''
    };

    this.inserirOuSomarPeca(item);
    this.recalcularValoresAgendamento();
    this.modalPeca?.hide();
    this.resetarPecaForm();
    this.abaNovoAgendamento = 'pecas';
  }

  private inserirOuSomarPeca(novaPeca: AgendamentoPecaSelecionada): void {
    const indiceAtual = this.editandoPecaId !== null
      ? this.pecasNovoAgendamento.findIndex(item => item.id === this.editandoPecaId)
      : -1;

    const indiceDuplicado = this.pecasNovoAgendamento.findIndex(item =>
      Number(item.idPeca) === Number(novaPeca.idPeca)
      && item.id !== this.editandoPecaId
    );

    if (indiceDuplicado >= 0) {
      const existente = this.pecasNovoAgendamento[indiceDuplicado];

      const quantidadeFinal =
        this.quantidadeInteiraMinima(existente.quantidade)
        + this.quantidadeInteiraMinima(novaPeca.quantidade);

      const valorUnitario = this.moedaParaNumero(existente.valorUnitario || novaPeca.valorUnitario);
      const valorTotal = quantidadeFinal * valorUnitario;

      this.pecasNovoAgendamento[indiceDuplicado] = {
        ...existente,
        quantidade: quantidadeFinal,
        valorTotal: valorTotal.toFixed(2)
      };

      if (indiceAtual >= 0) {
        this.pecasNovoAgendamento.splice(indiceAtual, 1);
      }

      return;
    }

    if (indiceAtual >= 0) {
      this.pecasNovoAgendamento[indiceAtual] = novaPeca;
      return;
    }

    this.pecasNovoAgendamento.push(novaPeca);
  }

  editarPecaAgendamento(item: AgendamentoPecaSelecionada): void {
    this.editandoPecaId = item.id ?? null;

    this.pecaForm = {
      idPeca: item.idPeca,
      nomePeca: item.nomePeca,
      descricaoPeca: item.descricaoPeca,
      fabricantePeca: item.fabricantePeca,
      modeloPeca: item.modeloPeca,
      idFornecedor: item.idFornecedor ?? undefined,
      razaoSocialFornecedor: item.razaoSocialFornecedor || '',
      quantidade: String(this.quantidadeInteiraMinima(item.quantidade)),
      unidadeMedida: item.unidadeMedida || 'UNIDADE',
      valorUnitario: this.formatarMoedaBR(item.valorUnitario),
      valorTotal: this.formatarMoedaBR(item.valorTotal),
      observacoes: item.observacoes || ''
    };
  }

  removerPecaAgendamento(item: AgendamentoPecaSelecionada): void {
    if (!item.id) return;

    if (!confirm('Deseja remover esta peça do agendamento?')) {
      return;
    }

    this.pecasNovoAgendamento = this.pecasNovoAgendamento.filter(p => p.id !== item.id);
    this.recalcularValoresAgendamento();
  }

  salvarAgendamento(): void {
    this.mensagemErroModal = '';

    const erro = this.validarCamposObrigatoriosAgendamento();

    if (erro) {
      this.mensagemErroModal = erro;
      this.abaNovoAgendamento = 'agendamento';
      return;
    }

    const payload = this.montarPayloadAgendamento();

    const request$ = this.editandoId
      ? this.service.atualizar(this.editandoId, payload)
      : this.service.criar(payload);

    request$.subscribe({
      next: () => {
        this.modalCadastro?.hide();
        alert(this.editandoId ? 'Agendamento atualizado com sucesso.' : 'Agendamento cadastrado com sucesso.');
        this.recarregar();
      },
      error: (erroResposta) => {
        this.mensagemErroModal = this.extrairMensagemErro(
          erroResposta,
          'Erro ao salvar agendamento.'
        );
      }
    });
  }

  clienteInvalido(): boolean {
    return !this.novoAgendamento.idCliente;
  }

  veiculoInvalido(): boolean {
    return !this.novoAgendamento.idVeiculo;
  }

  servicoPrevistoInvalido(): boolean {
    return !this.novoAgendamento.idServico;
  }

  responsavelDisponivelInvalido(): boolean {
    if (!this.periodoAgendamentoValido()) {
      return true;
    }

    if (!this.novoAgendamento.idResponsavel) {
      return true;
    }

    const responsavel = this.responsaveis.find(r =>
      Number(r.id) === Number(this.novoAgendamento.idResponsavel)
    );

    if (!responsavel) {
      return true;
    }

    return !this.responsavelDisponivelNoPeriodo(responsavel);
  }

  mensagemResponsavelInvalido(): string {
    if (!this.periodoAgendamentoValido()) {
      return 'Informe um período válido antes de selecionar o responsável.';
    }

    if (this.responsaveisDisponiveis().length === 0) {
      return 'Nenhum responsável disponível para o período informado.';
    }

    if (!this.novoAgendamento.idResponsavel) {
      return 'Selecione um responsável disponível.';
    }

    return 'O responsável selecionado não está disponível neste período.';
  }

  private validarCamposObrigatoriosAgendamento(): string | null {
    if (this.clienteInvalido()) {
      return 'Selecione o cliente.';
    }

    if (this.veiculoInvalido()) {
      return 'Selecione o veículo.';
    }

    if (this.servicoPrevistoInvalido()) {
      return 'Selecione o serviço previsto para o agendamento.';
    }

    if (this.quilometragemAtualInvalida()) {
      return 'Informe a quilometragem atual do veículo para salvar o agendamento.';
    }

    if (!this.novoAgendamento.dataHoraInicio) {
      return 'Informe a data e hora de início do agendamento.';
    }

    if (!this.novoAgendamento.dataHoraFim) {
      return 'Informe a data e hora de fim do agendamento.';
    }

    if (!this.periodoAgendamentoValido()) {
      return 'Informe um período válido para o agendamento.';
    }

    if (this.responsavelDisponivelInvalido()) {
      return this.mensagemResponsavelInvalido();
    }

    return null;
  }

  private montarPayloadAgendamento(): AgendamentoRequest {
    return {
      idCliente: this.novoAgendamento.idCliente ? Number(this.novoAgendamento.idCliente) : null,
      idVeiculo: this.novoAgendamento.idVeiculo ? Number(this.novoAgendamento.idVeiculo) : null,
      idServico: this.novoAgendamento.idServico ? Number(this.novoAgendamento.idServico) : null,
      idFornecedor: this.novoAgendamento.idFornecedor ? Number(this.novoAgendamento.idFornecedor) : null,
      idResponsavel: this.novoAgendamento.idResponsavel ? Number(this.novoAgendamento.idResponsavel) : null,

      dataHoraInicio: this.novoAgendamento.dataHoraInicio || '',
      dataHoraFim: this.novoAgendamento.dataHoraFim || '',
      duracaoEstimadaMinutos: this.novoAgendamento.duracaoEstimadaMinutos ?? null,

      statusAgendamento: this.novoAgendamento.statusAgendamento || 'AGENDADO',
      canalOrigem: this.novoAgendamento.canalOrigem || 'SISTEMA',
      prioridade: this.novoAgendamento.prioridade || 'NORMAL',
      tipoAtendimento: this.novoAgendamento.tipoAtendimento || 'PRESENCIAL',

      quilometragemAtual: this.quilometragemAtualParaNumero(),
      queixaCliente: this.limparOpcional(this.novoAgendamento.queixaCliente),
      diagnosticoPrevio: this.limparOpcional(this.novoAgendamento.diagnosticoPrevio),
      observacoes: this.montarObservacoesComPecas(),

      valorEstimado: this.converterMoedaOpcionalParaNumero(this.novoAgendamento.valorEstimado),
      valorFinal: this.converterMoedaOpcionalParaNumero(this.novoAgendamento.valorFinal),

      requerConfirmacao: !!this.novoAgendamento.requerConfirmacao,
      confirmado: !!this.novoAgendamento.confirmado
    };
  }

  private montarObservacoesComPecas(): string {
    const observacoesBase = this.limparOpcional(this.novoAgendamento.observacoes);

    if (this.pecasNovoAgendamento.length === 0) {
      return observacoesBase;
    }

    const linhasPecas = this.pecasNovoAgendamento.map(item => {
      return `- ${item.descricaoPeca || item.nomePeca || 'Peça'} | Fabricante: ${item.fabricantePeca || '—'} | Modelo: ${item.modeloPeca || '—'} | Qtd: ${item.quantidade || 0} ${item.unidadeMedida || ''} | Unitário: ${this.formatarMoedaBR(item.valorUnitario)} | Total: ${this.formatarMoedaBR(item.valorTotal)}`;
    });

    const bloco = [
      '',
      '[PEÇAS PREVISTAS NO AGENDAMENTO]',
      ...linhasPecas,
      `Total estimado de peças: ${this.formatarMoedaBR(this.totalPecasAgendamento())}`,
      '[/PEÇAS PREVISTAS NO AGENDAMENTO]'
    ].join('\n');

    return `${observacoesBase}${bloco}`.trim();
  }

  private recalcularValoresAgendamento(): void {
    const maoObra = this.valorServicoSelecionado();
    const pecas = this.totalPecasAgendamento();
    const total = maoObra + pecas;

    this.novoAgendamento.valorEstimado = this.formatarMoedaBR(total);
  }

  totalPecasAgendamento(): number {
    return this.pecasNovoAgendamento.reduce((total, item) => {
      return total + this.moedaParaNumero(item.valorTotal);
    }, 0);
  }

  valorServicoSelecionado(): number {
    const idServico = Number(this.novoAgendamento.idServico);

    if (!idServico) return 0;

    const servico = this.servicos.find(s => Number(s.id) === idServico);

    if (!servico) return 0;

    return this.moedaParaNumero(this.valorPadraoServico(servico));
  }

  abrirDetalhes(item: Agendamento): void {
    this.agendamentoSelecionado = item;

    const el = document.getElementById('modalDetalhesAgendamento');

    if (!el) return;

    this.modalDetalhes = bootstrap.Modal.getOrCreateInstance(el);
    this.modalDetalhes.show();
  }

  confirmar(item: Agendamento): void {
    if (!item.id) return;

    this.service.confirmar(item.id).subscribe({
      next: () => this.recarregar(),
      error: (erro) => alert(this.extrairMensagemErro(erro, 'Erro ao confirmar agendamento.'))
    });
  }

  iniciar(item: Agendamento): void {
    if (!item.id) return;

    this.service.iniciar(item.id).subscribe({
      next: () => this.recarregar(),
      error: (erro) => alert(this.extrairMensagemErro(erro, 'Erro ao iniciar agendamento.'))
    });
  }

  concluir(item: Agendamento): void {
    if (!item.id) return;

    this.service.concluir(item.id).subscribe({
      next: () => this.recarregar(),
      error: (erro) => alert(this.extrairMensagemErro(erro, 'Erro ao concluir agendamento.'))
    });
  }

  abrirCancelamento(item: Agendamento): void {
    this.agendamentoSelecionado = item;
    this.motivoCancelamento = '';

    const el = document.getElementById('modalCancelamentoAgendamento');

    if (!el) return;

    this.modalCancelamento = bootstrap.Modal.getOrCreateInstance(el);
    this.modalCancelamento.show();
  }

  confirmarCancelamento(): void {
    if (!this.agendamentoSelecionado?.id) return;

    const body: AgendamentoCancelamentoRequest = {
      motivoCancelamento: this.motivoCancelamento || 'Cancelado pelo administrador.'
    };

    this.service.cancelar(this.agendamentoSelecionado.id, body).subscribe({
      next: () => {
        this.modalCancelamento?.hide();
        this.recarregar();
      },
      error: (erro) => alert(this.extrairMensagemErro(erro, 'Erro ao cancelar agendamento.'))
    });
  }

  excluir(item: Agendamento): void {
    if (!item.id) return;

    if (!confirm('Deseja excluir este agendamento?')) {
      return;
    }

    this.service.excluir(item.id).subscribe({
      next: () => this.recarregar(),
      error: (erro) => alert(this.extrairMensagemErro(erro, 'Erro ao excluir agendamento.'))
    });
  }

  podeConfirmar(item: Agendamento): boolean {
    return item.statusAgendamento === 'AGENDADO';
  }

  podeIniciar(item: Agendamento): boolean {
    return item.statusAgendamento === 'AGENDADO'
      || item.statusAgendamento === 'CONFIRMADO';
  }

  podeConcluir(item: Agendamento): boolean {
    return item.statusAgendamento === 'EM_ATENDIMENTO';
  }

  podeCancelar(item: Agendamento): boolean {
    return item.statusAgendamento !== 'CANCELADO'
      && item.statusAgendamento !== 'CONCLUIDO'
      && item.statusAgendamento !== 'NAO_COMPARECEU';
  }

  formatarStatus(status?: string | null): string {
    if (!status) return '—';

    return status
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, letra => letra.toUpperCase());
  }

  statusBadgeClass(status?: string | null): string {
    switch (status) {
      case 'AGENDADO':
        return 'bg-primary';
      case 'CONFIRMADO':
        return 'bg-success';
      case 'EM_ATENDIMENTO':
        return 'bg-warning text-dark';
      case 'CONCLUIDO':
        return 'bg-success';
      case 'CANCELADO':
      case 'NAO_COMPARECEU':
        return 'bg-danger';
      case 'REAGENDADO':
        return 'bg-info text-dark';
      default:
        return 'bg-secondary';
    }
  }

  formatarMoedaBR(valor: any): string {
    const numero = this.moedaParaNumero(valor);

    return numero.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  }

  formatarDataHora(valor?: string | null): string {
    if (!valor) return '—';

    const data = new Date(valor);

    if (Number.isNaN(data.getTime())) {
      return valor;
    }

    return data.toLocaleString('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short'
    });
  }

  formatarCpf(cpf?: string | null): string {
    if (!cpf) return '—';

    const d = cpf.replace(/\D/g, '');

    if (d.length !== 11) return cpf;

    return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }

  formatarPlaca(placa?: string | null): string {
    if (!placa) return '—';

    const p = placa.toUpperCase().replace(/[^A-Z0-9]/g, '');

    if (p.length === 7 && /^[A-Z]{3}\d{4}$/.test(p)) {
      return `${p.substring(0, 3)}-${p.substring(3)}`;
    }

    return `${p.substring(0, 3)}-${p.substring(3)}`;
  }

  private quantidadeInteiraMinima(valor: any): number {
    const numero = this.moedaParaNumero(valor);

    if (numero <= 0) return 1;

    return Math.max(1, Math.ceil(numero));
  }

  private idClienteDoVeiculo(veiculo: VeiculoResumo): number | undefined {
    const valor = this.obterCampo(
      veiculo,
      [
        'idCliente',
        'id_cliente',
        'clienteId',
        'cliente_id',
        'cliente.id',
        'idUsuario',
        'id_usuario',
        'usuarioId',
        'usuario_id',
        'usuario.id',
        'idProprietario',
        'id_proprietario',
        'proprietario.id'
      ]
    );

    if (valor === null || valor === undefined || valor === '') {
      return undefined;
    }

    const numero = Number(valor);

    return Number.isNaN(numero) ? undefined : numero;
  }

  private placaDoVeiculo(veiculo: VeiculoResumo): string {
    return this.textoCampo(
      veiculo,
      ['placa', 'placaVeiculo', 'placa_veiculo'],
      ''
    );
  }

  private fabricanteDoVeiculo(veiculo: VeiculoResumo): string {
    return this.textoCampo(
      veiculo,
      ['fabricante', 'marca', 'montadora'],
      ''
    );
  }

  private modeloDoVeiculo(veiculo: VeiculoResumo): string {
    return this.textoCampo(
      veiculo,
      ['modelo', 'nomeModelo', 'nome_modelo'],
      ''
    );
  }

  private corDoVeiculo(veiculo: VeiculoResumo): string {
    return this.textoCampo(
      veiculo,
      ['cor'],
      ''
    );
  }

  private encontrarFornecimentoDaPeca(idPeca: number): FornecimentoPecaResumo | null {
    const encontrados = this.fornecimentosPecas.filter(f =>
      Number(this.idPecaObjeto(f)) === Number(idPeca)
    );

    if (encontrados.length === 0) return null;

    const ativos = encontrados.filter(f => this.fornecimentoEstaAtivo(f));
    const candidatos = ativos.length > 0 ? ativos : encontrados;

    return [...candidatos].sort((a, b) => {
      return this.moedaParaNumero(this.valorPadraoFornecimentoPeca(a))
        - this.moedaParaNumero(this.valorPadraoFornecimentoPeca(b));
    })[0];
  }

  private fornecimentoEstaAtivo(fornecimento: FornecimentoPecaResumo): boolean {
    const valor = this.obterCampo(fornecimento, ['ativo']);

    if (valor === null || valor === undefined || valor === '') return true;

    if (typeof valor === 'boolean') return valor;

    const texto = String(valor).trim().toUpperCase();

    return texto === 'TRUE'
      || texto === '1'
      || texto === 'SIM'
      || texto === 'S'
      || texto === 'ATIVO';
  }

  private idPecaObjeto(objeto: any): number | undefined {
    const valor = this.obterCampo(objeto, ['idPeca', 'id_peca', 'peca.id']);

    if (valor === null || valor === undefined || valor === '') return undefined;

    const numero = Number(valor);

    return Number.isNaN(numero) ? undefined : numero;
  }

  private idFornecedorObjeto(objeto: any): number | undefined {
    const valor = this.obterCampo(objeto, ['idFornecedor', 'id_fornecedor', 'fornecedor.id']);

    if (valor === null || valor === undefined || valor === '') return undefined;

    const numero = Number(valor);

    return Number.isNaN(numero) ? undefined : numero;
  }

  private nomeFornecedorObjeto(objeto: any): string {
    return this.textoCampo(
      objeto,
      [
        'razaoSocialFornecedor',
        'razao_social_fornecedor',
        'fornecedor.razaoSocial',
        'fornecedor.razao_social',
        'fornecedor.nomeFantasia',
        'fornecedor.nome_fantasia'
      ],
      ''
    );
  }

  private unidadePadraoPeca(peca: PecaResumo): string {
    return this.textoCampo(
      peca,
      ['unidadeMedida', 'unidade_medida', 'unidade'],
      'UNIDADE'
    );
  }

  private unidadePadraoFornecimentoPeca(fornecimento: FornecimentoPecaResumo): string {
    return this.textoCampo(
      fornecimento,
      [
        'unidadeMedida',
        'unidade_medida',
        'unidadeCompra',
        'unidade_compra',
        'peca.unidadeMedida',
        'peca.unidade_medida',
        'peca.unidade'
      ],
      ''
    );
  }

  private valorPadraoFornecimentoPeca(fornecimento: FornecimentoPecaResumo): any {
    const valor = this.valorCampo(
      fornecimento,
      [
        'valorUnitario',
        'valor_unitario',
        'valorCusto',
        'valor_custo',
        'custoUnitario',
        'custo_unitario',
        'precoUnitario',
        'preco_unitario',
        'precoCompra',
        'preco_compra',
        'valorCompra',
        'valor_compra',
        'valorFornecimento',
        'valor_fornecimento',
        'custo',
        'preco',
        'valor'
      ],
      null
    );

    return valor ?? 0;
  }

  private valorPadraoServico(servico: ServicoResumo): any {
    return this.valorCampo(
      servico,
      ['valorBase', 'valor_base', 'valor', 'preco'],
      0
    );
  }

  private duracaoServicoEmMinutos(servico: ServicoResumo): number {
    const duracao = this.moedaParaNumero(
      this.valorCampo(
        servico,
        ['duracaoEstimada', 'duracao_estimada', 'duracao'],
        60
      )
    );

    const unidade = this.normalizar(
      this.textoCampo(
        servico,
        ['unidadeDuracao', 'unidade_duracao'],
        'MINUTO'
      )
    );

    if (unidade.includes('hora')) return duracao * 60;
    if (unidade.includes('dia')) return duracao * 1440;

    return duracao;
  }

  private obterCampo(objeto: any, caminhos: string[]): any {
    if (!objeto) return null;

    for (const caminho of caminhos) {
      const partes = caminho.split('.');
      let valor = objeto;

      for (const parte of partes) {
        if (valor === null || valor === undefined) {
          valor = null;
          break;
        }

        valor = valor[parte];
      }

      if (valor !== null && valor !== undefined && valor !== '') {
        return valor;
      }
    }

    return null;
  }

  private textoCampo(objeto: any, caminhos: string[], padrao = ''): string {
    const valor = this.obterCampo(objeto, caminhos);

    if (valor === null || valor === undefined || valor === '') return padrao;

    return String(valor);
  }

  private valorCampo(objeto: any, caminhos: string[], padrao: any = 0): any {
    const valor = this.obterCampo(objeto, caminhos);

    if (valor === null || valor === undefined || valor === '') return padrao;

    return valor;
  }

  private moedaParaNumero(valor: any): number {
    if (valor === null || valor === undefined || valor === '') return 0;

    if (typeof valor === 'number') return Number.isNaN(valor) ? 0 : valor;

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

  converterMoedaOpcionalParaNumero(valor: any): string {
    return this.moedaParaNumero(valor).toFixed(2);
  }

  limparOpcional(valor: any): string {
    if (valor === null || valor === undefined) return '';

    return String(valor).trim();
  }

  private agoraInputDateTime(): string {
    const agora = new Date();
    agora.setMinutes(agora.getMinutes() - agora.getTimezoneOffset());
    return agora.toISOString().slice(0, 16);
  }

  private paraDatetimeLocal(valor: string): string {
    if (!valor) return '';

    const data = new Date(valor);

    if (Number.isNaN(data.getTime())) {
      return valor;
    }

    data.setMinutes(data.getMinutes() - data.getTimezoneOffset());

    return data.toISOString().slice(0, 16);
  }

  private normalizar(valor: any): string {
    return String(valor ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  private normalizarTipoAcesso(valor: any): string {
    return String(valor ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase()
      .replace(/-/g, '_')
      .replace(/ /g, '_')
      .trim();
  }

  private extrairLista<T>(resposta: any): T[] {
    if (Array.isArray(resposta)) return resposta;
    if (Array.isArray(resposta?.content)) return resposta.content;
    if (Array.isArray(resposta?.dados)) return resposta.dados;
    if (Array.isArray(resposta?.data)) return resposta.data;

    return [];
  }

  extrairMensagemErro(erro: any, mensagemPadrao: string): string {
    if (typeof erro?.error === 'string') return erro.error;
    if (typeof erro?.error?.mensagem === 'string') return erro.error.mensagem;
    if (typeof erro?.message === 'string') return erro.message;
    return mensagemPadrao;
  }

  quilometragemAtualInvalida(): boolean {
    const valor = this.novoAgendamento.quilometragemAtual;

    if (valor === null || valor === undefined || String(valor).trim() === '') {
      return true;
    }

    const numero = Number(valor);

    return Number.isNaN(numero) || numero < 0;
  }

  normalizarQuilometragemAtual(): void {
    const valor = this.novoAgendamento.quilometragemAtual;

    if (valor === null || valor === undefined || String(valor).trim() === '') {
      this.novoAgendamento.quilometragemAtual = null;
      return;
    }

    const numero = Number(valor);

    if (Number.isNaN(numero) || numero < 0) {
      this.novoAgendamento.quilometragemAtual = null;
      return;
    }

    this.novoAgendamento.quilometragemAtual = Math.floor(numero);
  }

  private quilometragemAtualParaNumero(): number | null {
    const valor = this.novoAgendamento.quilometragemAtual;

    if (valor === null || valor === undefined || String(valor).trim() === '') {
      return null;
    }

    const numero = Number(valor);

    if (Number.isNaN(numero) || numero < 0) {
      return null;
    }

    return Math.floor(numero);
  }

  aoAlterarFiltros(): void {
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

  private ajustarPaginaAtual(): void {
    if (this.paginaAtual > this.totalPaginas) {
      this.paginaAtual = this.totalPaginas;
    }

    if (this.paginaAtual < 1) {
      this.paginaAtual = 1;
    }
  }

  @HostListener('document:click')
fecharDropdownsAoClicarFora(): void {
  this.statusFiltroAberto = false;
}

alternarFiltroStatus(event: Event): void {
  event.stopPropagation();
  this.statusFiltroAberto = !this.statusFiltroAberto;
}

selecionarFiltroStatus(status: string): void {
  this.filtroStatus = status;
  this.statusFiltroAberto = false;
  this.aoAlterarFiltros();
}

rotuloFiltroStatus(): string {
  if (!this.filtroStatus) {
    return 'Todos';
  }

  return this.formatarStatus(this.filtroStatus);
}



  formatarTelefone(telefone: string | null | undefined): string {
    if(!telefone) return '-';
    const numero = telefone.replaceAll(/\D/g, '');
    const codigoPais = '55';
    if(numero.length >= 11) {
      const ddd = numero.slice(-11, -9);
      const parte1 = numero.slice(-9, -4);
      const parte2 = numero.slice(-4);
      telefone = `+${ codigoPais } (${ ddd }) ${ parte1 } -${ parte2 }`;
    }
    else if (numero.length >= 10) {
      const ddd = numero.slice(0, 2);
      const parte1 = numero.slice(2, 6);
      const parte2 = numero.slice(6, 10);
      telefone = `+${ codigoPais } (${ ddd }) ${ parte1 } -${ parte2 }`;
    }
    else if (numero.length >= 8) {
      const ddd = '11';
      const parte1 = numero.slice(0, -4);
      const parte2 = numero.slice(-4);
      telefone = `+${ codigoPais } (${ ddd }) ${ parte1 } -${ parte2 }`;
    }
    return telefone;
  }

  formatarFabricante(fabricante: string | null | undefined): string {
    if (!fabricante) { return ''; }
    const siglas = ['GM', 'VW', 'BMW', 'GWM', 'BYD', 'JAC'];
    fabricante = fabricante.trim().toUpperCase();
    for (const sigla of siglas) {
      if (fabricante.toUpperCase().startsWith(sigla)) {
        return sigla + ' ' + this.capitalizar(
          fabricante.substring(sigla.length + 1)
        );
      }
    }
    return this.capitalizar(fabricante);
  }

  capitalizar(s: string | null | undefined): string {
    if (!s) return '';
    return s.split(' ').map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join(' ');
  }
}
