import { CommonModule, Location } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { catchError, forkJoin, of } from 'rxjs';

import {
  AgendamentoResumo,
  Atendimento,
  AtendimentoCancelamentoRequest,
  AtendimentoPeca,
  AtendimentoPecaRequest,
  AtendimentoRequest,
  AtendimentoServicoExecutado,
  AtendimentoServicoExecutadoRequest,
  ExibeAtendimentosService,
  FornecedorResumo,
  PecaResumo,
  FornecimentoPecaResumo,
  ServicoResumo,
  UsuarioResumo
} from './exibe-atendimentos.service';

declare var bootstrap: any;

@Component({
  selector: 'app-exibe-atendimentos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './exibe-atendimentos.component.html',
  styleUrl: './exibe-atendimentos.component.css'
})
export class ExibeAtendimentosComponent implements OnInit {

  atendimentos: Atendimento[] = [];
  agendamentos: AgendamentoResumo[] = [];
  usuarios: UsuarioResumo[] = [];
  fornecedores: FornecedorResumo[] = [];
  pecasCatalogo: PecaResumo[] = [];
  servicosCatalogo: ServicoResumo[] = [];
  fornecimentosPecas: FornecimentoPecaResumo[] = [];
  pecasAtendimento: AtendimentoPeca[] = [];
  servicosAtendimento: AtendimentoServicoExecutado[] = [];

  pecasNovoAtendimento: AtendimentoPeca[] = [];
  servicosNovoAtendimento: AtendimentoServicoExecutado[] = [];

  novoAtendimento: Partial<Atendimento> = {};
  atendimentoSelecionado: Atendimento | null = null;

  pecaForm: Partial<AtendimentoPeca> = {};
  servicoForm: Partial<AtendimentoServicoExecutado> = {};

  filtro = '';
  filtroStatus = '';
  carregando = false;
  mensagemErro = '';

  mensagemErroModal = '';

  abaNovoAtendimento: 'atendimento' | 'itens' | 'adicionais' = 'atendimento';

  modoItensAtendimento: 'novo' | 'existente' = 'existente';

  modalCadastro: any;
  modalPecas: any;
  modalServicos: any;
  modalDetalhes: any;
  modalCancelamento: any;

  editandoPecaId: number | null = null;
  editandoServicoId: number | null = null;

  private tempPecaId = -1;
  private tempServicoId = -1;

  motivoCancelamento = '';

  readonly tiposExecucao = ['INTERNO', 'TERCEIRO', 'MISTO'];
  readonly statusItemServico = ['PENDENTE', 'EM_EXECUCAO', 'EXECUTADO', 'CANCELADO'];

  constructor(
    private service: ExibeAtendimentosService,
    private location: Location
  ) {}

  ngOnInit(): void {
    this.carregarTudo();
  }

  get atendimentosFiltrados(): Atendimento[] {
    const termo = this.normalizar(this.filtro);

    return this.atendimentos.filter(item => {
      const statusOk = !this.filtroStatus || item.statusAtendimento === this.filtroStatus;

      const texto = this.normalizar([
        item.codigoAtendimento,
        item.codigoAgendamento,
        item.nomeCliente,
        item.placaVeiculo,
        item.modeloVeiculo,
        item.nomeServico,
        item.nomeResponsavel,
        item.statusAtendimento
      ].join(' '));

      return statusOk && (!termo || texto.includes(termo));
    });
  }

  get responsaveis(): UsuarioResumo[] {
    return this.usuarios.filter(usuario => {
      const tipo = this.normalizarTipoAcesso(usuario.tipo_do_acesso || usuario.tipoDoAcesso);
      return tipo === 'COLABORADOR' || tipo === 'ADMINISTRADOR';
    });
  }

  get totalAtendimentos(): number {
    return this.atendimentos.length;
  }

  get totalEmExecucao(): number {
    return this.atendimentos.filter(a => a.statusAtendimento === 'EM_EXECUCAO').length;
  }

  get totalConcluidos(): number {
    return this.atendimentos.filter(a => a.statusAtendimento === 'CONCLUIDO').length;
  }

  get totalEntregues(): number {
    return this.atendimentos.filter(a => a.statusAtendimento === 'ENTREGUE').length;
  }

  carregarTudo(): void {
  this.carregando = true;
  this.mensagemErro = '';

  forkJoin({
    atendimentos: this.service.listar(),
    agendamentos: this.service.listarAgendamentos(),
    usuarios: this.service.listarUsuarios(),
    fornecedores: this.service.listarFornecedores(),
    pecas: this.service.listarPecasCatalogo(),

    fornecimentosPecas: this.service.listarFornecimentosPecas().pipe(
      catchError((erro) => {
        console.warn('Não foi possível carregar fornecimentos de peças:', erro);
        return of([]);
      })
    ),

    servicos: this.service.listarServicosCatalogo()
  }).subscribe({
    next: (resposta) => {
      this.atendimentos = resposta.atendimentos ?? [];
      this.agendamentos = resposta.agendamentos ?? [];
      this.usuarios = resposta.usuarios ?? [];
      this.fornecedores = resposta.fornecedores ?? [];
      this.pecasCatalogo = resposta.pecas ?? [];
      this.fornecimentosPecas = this.extrairLista<FornecimentoPecaResumo>(resposta.fornecimentosPecas);
      this.servicosCatalogo = resposta.servicos ?? [];
      this.carregando = false;

      console.log('Peças catálogo:', this.pecasCatalogo);
      console.log('Fornecimentos de peças:', this.fornecimentosPecas);
    },
    error: (erro) => {
      console.error(erro);
      this.mensagemErro = this.extrairMensagemErro(erro, 'Erro ao carregar atendimentos.');
      this.carregando = false;
    }
  });
}

  recarregar(): void {
    this.carregando = true;

    this.service.listar().subscribe({
      next: (lista) => {
        this.atendimentos = lista ?? [];
        this.carregando = false;
      },
      error: (erro) => {
        this.mensagemErro = this.extrairMensagemErro(erro, 'Erro ao recarregar atendimentos.');
        this.carregando = false;
      }
    });
  }

  voltar(): void {
    this.location.back();
  }

  trocarAbaNovoAtendimento(aba: 'atendimento' | 'itens' | 'adicionais'): void {
    this.abaNovoAtendimento = aba;
  }

  abrirModalCadastro(): void {
    this.abaNovoAtendimento = 'atendimento';
    this.mensagemErroModal = '';

    this.novoAtendimento = {
      idAgendamento: undefined,
      codigoAgendamento: '',

      idCliente: undefined,
      nomeCliente: '',
      cpfCliente: '',
      emailCliente: '',
      telefoneCliente: '',

      idVeiculo: undefined,
      placaVeiculo: '',
      fabricanteVeiculo: '',
      modeloVeiculo: '',
      corVeiculo: '',
      anoModeloCombustivelVeiculo: '',

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

    this.pecasNovoAtendimento = [];
    this.servicosNovoAtendimento = [];
    this.pecasAtendimento = [];
    this.servicosAtendimento = [];
    this.tempPecaId = -1;
    this.tempServicoId = -1;

    this.recalcularTotaisNovoAtendimento();

    const el = document.getElementById('modalCadastroAtendimento');

    if (!el) {
      console.error('Modal modalCadastroAtendimento não encontrado.');
      return;
    }

    this.modalCadastro = bootstrap.Modal.getOrCreateInstance(el);
    this.modalCadastro.show();
  }

  selecionarAgendamento(): void {
    const id = Number(this.novoAtendimento.idAgendamento);

    if (!id) return;

    const agendamento = this.agendamentos.find(a => Number(a.id) === id);

    if (!agendamento) return;

    this.novoAtendimento.codigoAgendamento = agendamento.codigoAgendamento || '';

    this.novoAtendimento.idCliente = this.valorPrimeiro(agendamento.idCliente, agendamento.cliente?.id);
    this.novoAtendimento.nomeCliente = this.valorPrimeiro(agendamento.nomeCliente, agendamento.cliente?.nome, agendamento.cliente?.nome_social, agendamento.cliente?.nomeSocial);
    this.novoAtendimento.cpfCliente = this.valorPrimeiro(agendamento.cpfCliente, agendamento.cliente?.cpf);
    this.novoAtendimento.emailCliente = this.valorPrimeiro(agendamento.emailCliente, agendamento.cliente?.email);
    this.novoAtendimento.telefoneCliente = this.valorPrimeiro(agendamento.telefoneCliente, agendamento.cliente?.telefone);

    this.novoAtendimento.idVeiculo = this.valorPrimeiro(agendamento.idVeiculo, agendamento.veiculo?.id);
    this.novoAtendimento.placaVeiculo = this.valorPrimeiro(agendamento.placaVeiculo, agendamento.veiculo?.placa);
    this.novoAtendimento.fabricanteVeiculo = this.valorPrimeiro(agendamento.fabricanteVeiculo, agendamento.veiculo?.fabricante);
    this.novoAtendimento.modeloVeiculo = this.valorPrimeiro(agendamento.modeloVeiculo, agendamento.veiculo?.modelo);
    this.novoAtendimento.corVeiculo = this.valorPrimeiro(agendamento.corVeiculo, agendamento.veiculo?.cor);
    this.novoAtendimento.anoModeloCombustivelVeiculo = this.valorPrimeiro(
      agendamento.anoModeloCombustivelVeiculo,
      agendamento.veiculo?.anoModeloCombustivel,
      agendamento.veiculo?.ano_modelo_combustivel
    );

    this.novoAtendimento.idServico = this.valorPrimeiro(agendamento.idServico, agendamento.servico?.id);
    this.novoAtendimento.nomeServico = this.valorPrimeiro(agendamento.nomeServico, agendamento.servico?.nome, agendamento.servico?.descricao);
    this.novoAtendimento.categoriaServico = this.valorPrimeiro(agendamento.categoriaServico, agendamento.servico?.categoria);

    this.novoAtendimento.idFornecedor = this.valorPrimeiro(agendamento.idFornecedor, agendamento.fornecedor?.id);
    this.novoAtendimento.razaoSocialFornecedor = this.valorPrimeiro(
      agendamento.razaoSocialFornecedor,
      agendamento.fornecedor?.razaoSocial,
      agendamento.fornecedor?.razao_social,
      agendamento.fornecedor?.nomeFantasia,
      agendamento.fornecedor?.nome_fantasia
    );

    this.novoAtendimento.idResponsavel = this.valorPrimeiro(agendamento.idResponsavel, agendamento.responsavel?.id);
    this.novoAtendimento.nomeResponsavel = this.valorPrimeiro(agendamento.nomeResponsavel, agendamento.responsavel?.nome);

    this.novoAtendimento.quilometragemEntrada = agendamento.quilometragemAtual ?? null;
    this.novoAtendimento.relatoCliente = agendamento.queixaCliente || '';
    this.novoAtendimento.diagnosticoTecnico = agendamento.diagnosticoPrevio || '';
    this.novoAtendimento.observacoesInternas = agendamento.observacoes || '';

    if (agendamento.dataHoraInicio) {
      this.novoAtendimento.dataEntrada = this.paraDatetimeLocal(agendamento.dataHoraInicio);
    }

    if (agendamento.dataHoraFim) {
      this.novoAtendimento.prazoEstimadoEntrega = this.paraDatetimeLocal(agendamento.dataHoraFim);
    }

    this.recalcularTotaisNovoAtendimento();
  }

  salvarNovoAtendimento(): void {
    this.mensagemErroModal = '';

    const erro = this.validarNovoAtendimento();

    if (erro) {
      this.mensagemErroModal = erro;
      this.abaNovoAtendimento = 'atendimento';
      return;
    }

    const payload = this.montarPayload(this.novoAtendimento);

    this.service.criar(payload).subscribe({
      next: (atendimentoCriado) => {
        const atendimentoId = atendimentoCriado.id;

        if (!atendimentoId) {
          this.mensagemErroModal = 'Atendimento cadastrado, mas não foi possível obter o ID para salvar peças e serviços.';
          this.recarregar();
          return;
        }

        this.persistirItensNovoAtendimento(atendimentoId);
      },
      error: (erroResposta) => {
        this.mensagemErroModal = this.extrairMensagemErro(erroResposta, 'Erro ao cadastrar atendimento.');
      }
    });
  }

  private persistirItensNovoAtendimento(atendimentoId: number): void {
    const requisicoes = [
      ...this.pecasNovoAtendimento.map(item =>
        this.service.adicionarPecaAtendimento(atendimentoId, this.montarPayloadPecaSalva(item))
      ),
      ...this.servicosNovoAtendimento.map(item =>
        this.service.adicionarServicoAtendimento(atendimentoId, this.montarPayloadServicoSalvo(item))
      )
    ];

    if (requisicoes.length === 0) {
      this.modalCadastro?.hide();
      alert('Atendimento cadastrado com sucesso.');
      this.recarregar();
      return;
    }

    forkJoin(requisicoes).subscribe({
      next: () => {
        this.modalCadastro?.hide();
        this.pecasNovoAtendimento = [];
        this.servicosNovoAtendimento = [];
        alert('Atendimento cadastrado com peças e serviços com sucesso.');
        this.recarregar();
      },
      error: (erro) => {
        this.mensagemErroModal =
          'O atendimento foi criado, mas houve erro ao salvar uma ou mais peças/serviços. ' +
          this.extrairMensagemErro(erro, 'Erro ao salvar itens do atendimento.');

        this.recarregar();
      }
    });
  }

  abrirModalPecasNovoAtendimento(): void {
    this.modoItensAtendimento = 'novo';
    this.atendimentoSelecionado = null;
    this.resetarPecaForm();

    const el = document.getElementById('modalPecasAtendimento');

    if (!el) return;

    this.modalPecas = bootstrap.Modal.getOrCreateInstance(el);
    this.modalPecas.show();
  }

  abrirModalEditarPecaNovoAtendimento(item: AtendimentoPeca): void {
    this.modoItensAtendimento = 'novo';
    this.atendimentoSelecionado = null;
    this.editarPecaAtendimento(item);

    const el = document.getElementById('modalPecasAtendimento');

    if (!el) return;

    this.modalPecas = bootstrap.Modal.getOrCreateInstance(el);
    this.modalPecas.show();
  }

  abrirModalServicosNovoAtendimento(): void {
    this.modoItensAtendimento = 'novo';
    this.atendimentoSelecionado = null;
    this.resetarServicoForm();

    const el = document.getElementById('modalServicosAtendimento');

    if (!el) return;

    this.modalServicos = bootstrap.Modal.getOrCreateInstance(el);
    this.modalServicos.show();
  }

  abrirModalEditarServicoNovoAtendimento(item: AtendimentoServicoExecutado): void {
    this.modoItensAtendimento = 'novo';
    this.atendimentoSelecionado = null;
    this.editarServicoAtendimento(item);

    const el = document.getElementById('modalServicosAtendimento');

    if (!el) return;

    this.modalServicos = bootstrap.Modal.getOrCreateInstance(el);
    this.modalServicos.show();
  }

  abrirModalPecas(item: Atendimento): void {
    if (!item.id) return;

    this.modoItensAtendimento = 'existente';
    this.atendimentoSelecionado = item;
    this.resetarPecaForm();
    this.carregarPecasDoAtendimento(item.id);

    const el = document.getElementById('modalPecasAtendimento');

    if (!el) return;

    this.modalPecas = bootstrap.Modal.getOrCreateInstance(el);
    this.modalPecas.show();
  }

  abrirModalServicos(item: Atendimento): void {
    if (!item.id) return;

    this.modoItensAtendimento = 'existente';
    this.atendimentoSelecionado = item;
    this.resetarServicoForm();
    this.carregarServicosDoAtendimento(item.id);

    const el = document.getElementById('modalServicosAtendimento');

    if (!el) return;

    this.modalServicos = bootstrap.Modal.getOrCreateInstance(el);
    this.modalServicos.show();
  }

  private carregarPecasDoAtendimento(atendimentoId: number): void {
    this.service.listarPecasAtendimento(atendimentoId).subscribe({
      next: (lista) => this.pecasAtendimento = lista ?? [],
      error: (erro) => alert(this.extrairMensagemErro(erro, 'Erro ao carregar peças do atendimento.'))
    });
  }

  private carregarServicosDoAtendimento(atendimentoId: number): void {
    this.service.listarServicosAtendimento(atendimentoId).subscribe({
      next: (lista) => this.servicosAtendimento = lista ?? [],
      error: (erro) => alert(this.extrairMensagemErro(erro, 'Erro ao carregar serviços do atendimento.'))
    });
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
      valorUnitario: 'R$ 0,00',
      valorTotal: 'R$ 0,00',
      unidadeMedida: 'UNIDADE',
      observacoes: ''
    };
  }

  selecionarPecaCatalogo(): void {
  const idPeca = Number(this.pecaForm.idPeca);

  if (!idPeca) return;

  const peca = this.pecasCatalogo.find(p => Number(p.id) === idPeca);

  if (!peca) return;

  const fornecimento = this.encontrarFornecimentoDaPeca(idPeca);

  this.pecaForm.nomePeca = this.textoCampo(
    peca,
    ['nome', 'descricao'],
    'Peça selecionada'
  );

  this.pecaForm.descricaoPeca = this.textoCampo(
    peca,
    ['descricao', 'nome'],
    ''
  );

  this.pecaForm.fabricantePeca = this.textoCampo(
    peca,
    ['fabricante'],
    ''
  );

  this.pecaForm.modeloPeca = this.textoCampo(
    peca,
    ['modelo'],
    ''
  );

  if (fornecimento) {
    this.pecaForm.unidadeMedida =
      this.unidadePadraoFornecimentoPeca(fornecimento)
      || this.unidadePadraoPeca(peca);

    const valorUnitario = this.valorPadraoFornecimentoPeca(fornecimento);

    this.pecaForm.valorUnitario = this.formatarMoedaBR(valorUnitario);

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

    const idFornecedor = this.idFornecedorObjeto(peca);

    if (idFornecedor) {
      this.pecaForm.idFornecedor = idFornecedor;
    }

    const nomeFornecedor = this.nomeFornecedorObjeto(peca);

    if (nomeFornecedor) {
      this.pecaForm.razaoSocialFornecedor = nomeFornecedor;
    }

    console.warn(
      'Nenhum fornecimento encontrado para a peça selecionada.',
      {
        idPeca,
        peca,
        fornecimentosPecas: this.fornecimentosPecas
      }
    );
  }

  this.recalcularTotalPecaForm();
}

  recalcularTotalPecaForm(): void {
    const qtd = Number(this.pecaForm.quantidade || 0);
    const unitario = this.moedaParaNumero(this.pecaForm.valorUnitario);
    const total = Math.max(qtd * unitario, 0);

    this.pecaForm.valorTotal = this.formatarMoedaBR(total);
  }

  formatarValorUnitarioPeca(): void {
    this.pecaForm.valorUnitario = this.formatarMoedaBR(this.pecaForm.valorUnitario);
    this.recalcularTotalPecaForm();
  }

  salvarPecaAtendimento(): void {
    if (!this.pecaForm.idPeca) {
      alert('Selecione uma peça.');
      return;
    }

    if (Number(this.pecaForm.quantidade || 0) <= 0) {
      alert('Informe uma quantidade maior que zero.');
      return;
    }

    const payloadVisual: AtendimentoPeca = {
      id: this.editandoPecaId ?? this.tempPecaId--,
      idPeca: Number(this.pecaForm.idPeca),
      nomePeca: this.pecaForm.nomePeca || '',
      descricaoPeca: this.pecaForm.descricaoPeca || this.pecaForm.nomePeca || '',
      fabricantePeca: this.pecaForm.fabricantePeca || '',
      modeloPeca: this.pecaForm.modeloPeca || '',
      idEstoquePeca: null,
      idFornecedor: this.pecaForm.idFornecedor ? Number(this.pecaForm.idFornecedor) : null,
      razaoSocialFornecedor: this.pecaForm.razaoSocialFornecedor || '',
      quantidade: this.pecaForm.quantidade || '1',
      valorUnitario: this.converterMoedaOpcionalParaNumero(this.pecaForm.valorUnitario),
      valorTotal: this.converterMoedaOpcionalParaNumero(this.pecaForm.valorTotal),
      unidadeMedida: this.limparOpcional(this.pecaForm.unidadeMedida),
      observacoes: this.limparOpcional(this.pecaForm.observacoes)
    };

    if (this.modoItensAtendimento === 'novo') {
      this.inserirOuSomarPecaNovoAtendimento(payloadVisual);
      this.recalcularTotaisNovoAtendimento();
      this.modalPecas?.hide();
      this.resetarPecaForm();
      this.abaNovoAtendimento = 'itens';
      return;
    }

    if (!this.atendimentoSelecionado?.id) return;

    const atendimentoId = this.atendimentoSelecionado.id;
    const payload = this.montarPayloadPecaSalva(payloadVisual);

    const request$ = this.editandoPecaId !== null
      ? this.service.atualizarPecaAtendimento(atendimentoId, this.editandoPecaId, payload)
      : this.service.adicionarPecaAtendimento(atendimentoId, payload);

    request$.subscribe({
      next: () => {
        this.resetarPecaForm();
        this.carregarPecasDoAtendimento(atendimentoId);
        this.recarregar();
        this.modalPecas?.hide();
      },
      error: (erro) => alert(this.extrairMensagemErro(erro, 'Erro ao salvar peça do atendimento.'))
    });
  }


  private encontrarFornecimentoDaPeca(idPeca: number): FornecimentoPecaResumo | null {
  const encontrados = this.fornecimentosPecas.filter(fornecimento =>
    Number(this.idPecaObjeto(fornecimento)) === Number(idPeca)
  );

  if (encontrados.length === 0) {
    return null;
  }

  const ativos = encontrados.filter(fornecimento =>
    this.fornecimentoEstaAtivo(fornecimento)
  );

  const candidatos = ativos.length > 0 ? ativos : encontrados;

  return [...candidatos].sort((a, b) => {
    const valorA = this.moedaParaNumero(this.valorPadraoFornecimentoPeca(a));
    const valorB = this.moedaParaNumero(this.valorPadraoFornecimentoPeca(b));

    return valorA - valorB;
  })[0];
}

private idPecaObjeto(objeto: any): number | undefined {
  const valor = this.obterCampo(
    objeto,
    [
      'idPeca',
      'id_peca',
      'peca.id'
    ]
  );

  if (valor === null || valor === undefined || valor === '') {
    return undefined;
  }

  const numero = Number(valor);

  return Number.isNaN(numero) ? undefined : numero;
}

private fornecimentoEstaAtivo(fornecimento: FornecimentoPecaResumo): boolean {
  const valor = this.obterCampo(
    fornecimento,
    [
      'ativo'
    ]
  );

  if (valor === null || valor === undefined || valor === '') {
    return true;
  }

  if (typeof valor === 'boolean') {
    return valor;
  }

  const texto = String(valor)
    .trim()
    .toUpperCase();

  return texto === 'TRUE'
    || texto === '1'
    || texto === 'SIM'
    || texto === 'S'
    || texto === 'ATIVO';
}

private unidadePadraoFornecimentoPeca(
  fornecimento: FornecimentoPecaResumo
): string {
  return this.textoCampo(
    fornecimento,
    [
      'unidadeMedida',
      'unidade_medida',
      'unidadeCompra',
      'unidade_compra',
      'unidadeCobranca',
      'unidade_cobranca',
      'peca.unidadeMedida',
      'peca.unidade_medida',
      'peca.unidade'
    ],
    ''
  );
}

private valorPadraoFornecimentoPeca(
  fornecimento: FornecimentoPecaResumo
): any {
  const valorDireto = this.valorCampo(
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

  if (valorDireto !== null && valorDireto !== undefined && valorDireto !== '') {
    return valorDireto;
  }

  return this.campoPorPadraoNumero(
    fornecimento,
    [
      ['valor', 'unit'],
      ['preco', 'unit'],
      ['custo', 'unit'],
      ['valor', 'custo'],
      ['preco', 'compra'],
      ['valor', 'compra'],
      ['valor', 'fornecimento'],
      ['preco'],
      ['valor'],
      ['custo']
    ],
    ['total', 'estoque', 'minimo', 'maximo', 'quantidade', 'id']
  ) ?? 0;
}

private extrairLista<T>(resposta: any): T[] {
  if (Array.isArray(resposta)) {
    return resposta;
  }

  if (Array.isArray(resposta?.content)) {
    return resposta.content;
  }

  if (Array.isArray(resposta?.dados)) {
    return resposta.dados;
  }

  if (Array.isArray(resposta?.data)) {
    return resposta.data;
  }

  return [];
}

  private inserirOuSomarPecaNovoAtendimento(novaPeca: AtendimentoPeca): void {
    const indiceAtual = this.editandoPecaId !== null
      ? this.pecasNovoAtendimento.findIndex(item => item.id === this.editandoPecaId)
      : -1;

    const indiceDuplicado = this.pecasNovoAtendimento.findIndex(item =>
      Number(item.idPeca) === Number(novaPeca.idPeca)
      && item.id !== this.editandoPecaId
    );

    if (indiceDuplicado >= 0) {
      const itemExistente = this.pecasNovoAtendimento[indiceDuplicado];

      const quantidadeAtual = this.moedaParaNumero(itemExistente.quantidade);
      const quantidadeNova = this.moedaParaNumero(novaPeca.quantidade);
      const quantidadeFinal = quantidadeAtual + quantidadeNova;

      const valorUnitario = this.moedaParaNumero(itemExistente.valorUnitario || novaPeca.valorUnitario);
      const valorTotal = quantidadeFinal * valorUnitario;

      this.pecasNovoAtendimento[indiceDuplicado] = {
        ...itemExistente,
        quantidade: quantidadeFinal,
        valorTotal: valorTotal.toFixed(2)
      };

      if (indiceAtual >= 0) {
        this.pecasNovoAtendimento.splice(indiceAtual, 1);
      }

      return;
    }

    if (indiceAtual >= 0) {
      this.pecasNovoAtendimento[indiceAtual] = novaPeca;
      return;
    }

    this.pecasNovoAtendimento.push(novaPeca);
  }

  editarPecaAtendimento(item: AtendimentoPeca): void {
    this.editandoPecaId = item.id ?? null;

    this.pecaForm = {
      idPeca: item.idPeca,
      nomePeca: item.nomePeca,
      descricaoPeca: item.descricaoPeca,
      fabricantePeca: item.fabricantePeca,
      modeloPeca: item.modeloPeca,
      idFornecedor: item.idFornecedor ?? undefined,
      razaoSocialFornecedor: item.razaoSocialFornecedor || '',
      quantidade: item.quantidade,
      valorUnitario: this.formatarMoedaBR(item.valorUnitario),
      valorTotal: this.formatarMoedaBR(item.valorTotal),
      unidadeMedida: item.unidadeMedida || 'UNIDADE',
      observacoes: item.observacoes || ''
    };
  }

  removerPecaAtendimento(item: AtendimentoPeca): void {
    if (!item.id) return;

    if (!confirm('Deseja remover esta peça do atendimento?')) {
      return;
    }

    if (this.modoItensAtendimento === 'novo') {
      this.pecasNovoAtendimento = this.pecasNovoAtendimento.filter(p => p.id !== item.id);
      this.recalcularTotaisNovoAtendimento();
      return;
    }

    if (!this.atendimentoSelecionado?.id) return;

    const atendimentoId = this.atendimentoSelecionado.id;

    this.service.removerPecaAtendimento(atendimentoId, item.id).subscribe({
      next: () => {
        this.carregarPecasDoAtendimento(atendimentoId);
        this.recarregar();
      },
      error: (erro) => alert(this.extrairMensagemErro(erro, 'Erro ao remover peça do atendimento.'))
    });
  }

  resetarServicoForm(): void {
    this.editandoServicoId = null;

    this.servicoForm = {
      idServico: undefined,
      nomeServico: '',
      descricaoServico: '',
      categoriaServico: '',
      idResponsavel: undefined,
      nomeResponsavel: '',
      idFornecedor: undefined,
      razaoSocialFornecedor: '',
      tipoExecucao: 'INTERNO',
      quantidade: '1',
      unidadeCobranca: 'SERVICO',
      tempoExecucao: '',
      unidadeTempo: 'HORA',
      valorMaoObra: 'R$ 0,00',
      valorTerceiro: 'R$ 0,00',
      desconto: 'R$ 0,00',
      valorTotal: 'R$ 0,00',
      statusItem: 'EXECUTADO',
      observacoes: ''
    };
  }

  selecionarServicoCatalogo(): void {
    const idServico = Number(this.servicoForm.idServico);

    if (!idServico) return;

    const servico = this.servicosCatalogo.find(s => Number(s.id) === idServico);

    if (!servico) return;

    this.servicoForm.nomeServico = this.textoCampo(servico, ['nome', 'descricao'], 'Serviço selecionado');
    this.servicoForm.descricaoServico = this.textoCampo(servico, ['descricao', 'nome'], '');
    this.servicoForm.categoriaServico = this.textoCampo(servico, ['categoria'], '');
    this.servicoForm.unidadeCobranca = this.textoCampo(servico, ['unidadeCobranca', 'unidade_cobranca'], 'SERVICO');
    this.servicoForm.tempoExecucao = this.textoCampo(
      servico,
      ['duracaoEstimada', 'duracao_estimada', 'duracao', 'tempoExecucao', 'tempo_execucao', 'tempoEstimado', 'tempo_estimado'],
      ''
    );
    this.servicoForm.unidadeTempo = this.textoCampo(
      servico,
      ['unidadeDuracao', 'unidade_duracao', 'unidadeTempo', 'unidade_tempo'],
      'HORA'
    );

    const tipoPrestador = this.normalizar(
      this.textoCampo(servico, ['tipoPrestador', 'tipoDoPrestador', 'tipo_do_prestador', 'tipo_prestador'], '')
    );

    if (tipoPrestador.includes('terceir')) {
      this.servicoForm.tipoExecucao = 'TERCEIRO';
    } else if (tipoPrestador.includes('misto')) {
      this.servicoForm.tipoExecucao = 'MISTO';
    } else {
      this.servicoForm.tipoExecucao = 'INTERNO';
    }

    const idFornecedor = this.idFornecedorObjeto(servico);
    if (idFornecedor) this.servicoForm.idFornecedor = idFornecedor;

    const nomeFornecedor = this.nomeFornecedorObjeto(servico);
    if (nomeFornecedor) this.servicoForm.razaoSocialFornecedor = nomeFornecedor;

    const valorBase = this.valorPadraoServico(servico);

    if (this.servicoForm.tipoExecucao === 'TERCEIRO') {
      this.servicoForm.valorMaoObra = 'R$ 0,00';
      this.servicoForm.valorTerceiro = this.formatarMoedaBR(valorBase);
    } else {
      this.servicoForm.valorMaoObra = this.formatarMoedaBR(valorBase);
      this.servicoForm.valorTerceiro = 'R$ 0,00';

      if (this.servicoForm.tipoExecucao === 'INTERNO') {
        this.servicoForm.idFornecedor = undefined;
        this.servicoForm.razaoSocialFornecedor = '';
      }
    }

    this.recalcularTotalServicoForm();
  }

  aoAlterarTipoExecucaoServico(): void {
    const tipo = this.servicoForm.tipoExecucao || 'INTERNO';

    const maoObra = this.moedaParaNumero(this.servicoForm.valorMaoObra);
    const terceiro = this.moedaParaNumero(this.servicoForm.valorTerceiro);

    if (tipo === 'INTERNO') {
      this.servicoForm.valorMaoObra = this.formatarMoedaBR(maoObra + terceiro);
      this.servicoForm.valorTerceiro = 'R$ 0,00';
      this.servicoForm.idFornecedor = undefined;
      this.servicoForm.razaoSocialFornecedor = '';
    }

    if (tipo === 'TERCEIRO') {
      this.servicoForm.valorTerceiro = this.formatarMoedaBR(maoObra + terceiro);
      this.servicoForm.valorMaoObra = 'R$ 0,00';
    }

    this.recalcularTotalServicoForm();
  }

  recalcularTotalServicoForm(): void {
    const maoObra = this.moedaParaNumero(this.servicoForm.valorMaoObra);
    const terceiro = this.moedaParaNumero(this.servicoForm.valorTerceiro);
    const desconto = this.moedaParaNumero(this.servicoForm.desconto);

    const total = Math.max(maoObra + terceiro - desconto, 0);

    this.servicoForm.valorTotal = this.formatarMoedaBR(total);
  }

  formatarValoresServicoForm(): void {
    this.servicoForm.valorMaoObra = this.formatarMoedaBR(this.servicoForm.valorMaoObra);
    this.servicoForm.valorTerceiro = this.formatarMoedaBR(this.servicoForm.valorTerceiro);
    this.servicoForm.desconto = this.formatarMoedaBR(this.servicoForm.desconto);

    this.recalcularTotalServicoForm();
  }

  salvarServicoAtendimento(): void {
    if (!this.servicoForm.idServico) {
      alert('Selecione um serviço.');
      return;
    }

    if (Number(this.servicoForm.quantidade || 0) <= 0) {
      alert('Informe uma quantidade maior que zero.');
      return;
    }

    const tipo = this.servicoForm.tipoExecucao || 'INTERNO';

    if ((tipo === 'TERCEIRO' || tipo === 'MISTO') && !this.servicoForm.idFornecedor) {
      alert('Selecione um fornecedor para serviço terceiro ou misto.');
      return;
    }

    const payloadVisual: AtendimentoServicoExecutado = {
      id: this.editandoServicoId ?? this.tempServicoId--,
      idServico: Number(this.servicoForm.idServico),
      nomeServico: this.servicoForm.nomeServico || '',
      descricaoServico: this.servicoForm.descricaoServico || this.servicoForm.nomeServico || '',
      categoriaServico: this.servicoForm.categoriaServico || '',

      idResponsavel: this.servicoForm.idResponsavel ? Number(this.servicoForm.idResponsavel) : null,
      nomeResponsavel: this.nomeResponsavelPorId(this.servicoForm.idResponsavel),

      idFornecedor: this.servicoForm.idFornecedor ? Number(this.servicoForm.idFornecedor) : null,
      razaoSocialFornecedor: this.nomeFornecedorPorId(this.servicoForm.idFornecedor),

      tipoExecucao: tipo,

      quantidade: this.servicoForm.quantidade || '1',
      unidadeCobranca: this.limparOpcional(this.servicoForm.unidadeCobranca),

      tempoExecucao: this.servicoForm.tempoExecucao || null,
      unidadeTempo: this.limparOpcional(this.servicoForm.unidadeTempo),

      valorMaoObra: this.converterMoedaOpcionalParaNumero(this.servicoForm.valorMaoObra),
      valorTerceiro: this.converterMoedaOpcionalParaNumero(this.servicoForm.valorTerceiro),
      desconto: this.converterMoedaOpcionalParaNumero(this.servicoForm.desconto),
      valorTotal: this.converterMoedaOpcionalParaNumero(this.servicoForm.valorTotal),

      statusItem: this.servicoForm.statusItem || 'EXECUTADO',
      observacoes: this.limparOpcional(this.servicoForm.observacoes)
    };

    if (this.modoItensAtendimento === 'novo') {
      if (this.editandoServicoId !== null) {
        this.servicosNovoAtendimento = this.servicosNovoAtendimento.map(item =>
          item.id === this.editandoServicoId ? payloadVisual : item
        );
      } else {
        this.servicosNovoAtendimento.push(payloadVisual);
      }

      this.recalcularTotaisNovoAtendimento();
      this.modalServicos?.hide();
      this.resetarServicoForm();
      this.abaNovoAtendimento = 'itens';
      return;
    }

    if (!this.atendimentoSelecionado?.id) return;

    const atendimentoId = this.atendimentoSelecionado.id;
    const payload = this.montarPayloadServicoSalvo(payloadVisual);

    const request$ = this.editandoServicoId !== null
      ? this.service.atualizarServicoAtendimento(atendimentoId, this.editandoServicoId, payload)
      : this.service.adicionarServicoAtendimento(atendimentoId, payload);

    request$.subscribe({
      next: () => {
        this.resetarServicoForm();
        this.carregarServicosDoAtendimento(atendimentoId);
        this.recarregar();
        this.modalServicos?.hide();
      },
      error: (erro) => alert(this.extrairMensagemErro(erro, 'Erro ao salvar serviço do atendimento.'))
    });
  }

  editarServicoAtendimento(item: AtendimentoServicoExecutado): void {
    this.editandoServicoId = item.id ?? null;

    this.servicoForm = {
      idServico: item.idServico,
      nomeServico: item.nomeServico,
      descricaoServico: item.descricaoServico,
      categoriaServico: item.categoriaServico,
      idResponsavel: item.idResponsavel ?? undefined,
      nomeResponsavel: item.nomeResponsavel || '',
      idFornecedor: item.idFornecedor ?? undefined,
      razaoSocialFornecedor: item.razaoSocialFornecedor || '',
      tipoExecucao: item.tipoExecucao || 'INTERNO',
      quantidade: item.quantidade,
      unidadeCobranca: item.unidadeCobranca || 'SERVICO',
      tempoExecucao: item.tempoExecucao || '',
      unidadeTempo: item.unidadeTempo || 'HORA',
      valorMaoObra: this.formatarMoedaBR(item.valorMaoObra),
      valorTerceiro: this.formatarMoedaBR(item.valorTerceiro),
      desconto: this.formatarMoedaBR(item.desconto),
      valorTotal: this.formatarMoedaBR(item.valorTotal),
      statusItem: item.statusItem || 'EXECUTADO',
      observacoes: item.observacoes || ''
    };
  }

  removerServicoAtendimento(item: AtendimentoServicoExecutado): void {
    if (!item.id) return;

    if (!confirm('Deseja remover este serviço do atendimento?')) {
      return;
    }

    if (this.modoItensAtendimento === 'novo') {
      this.servicosNovoAtendimento = this.servicosNovoAtendimento.filter(s => s.id !== item.id);
      this.recalcularTotaisNovoAtendimento();
      return;
    }

    if (!this.atendimentoSelecionado?.id) return;

    const atendimentoId = this.atendimentoSelecionado.id;

    this.service.removerServicoAtendimento(atendimentoId, item.id).subscribe({
      next: () => {
        this.carregarServicosDoAtendimento(atendimentoId);
        this.recarregar();
      },
      error: (erro) => alert(this.extrairMensagemErro(erro, 'Erro ao remover serviço do atendimento.'))
    });
  }

  abrirDetalhes(item: Atendimento): void {
    this.atendimentoSelecionado = item;

    const el = document.getElementById('modalDetalhesAtendimento');

    if (!el) return;

    this.modalDetalhes = bootstrap.Modal.getOrCreateInstance(el);
    this.modalDetalhes.show();
  }

  iniciar(item: Atendimento): void {
    if (!item.id) return;

    this.service.iniciar(item.id).subscribe({
      next: () => this.recarregar(),
      error: (erro) => alert(this.extrairMensagemErro(erro, 'Erro ao iniciar atendimento.'))
    });
  }

  aprovar(item: Atendimento): void {
    if (!item.id) return;

    this.service.aprovar(item.id).subscribe({
      next: () => this.recarregar(),
      error: (erro) => alert(this.extrairMensagemErro(erro, 'Erro ao aprovar atendimento.'))
    });
  }

  concluir(item: Atendimento): void {
    if (!item.id) return;

    if (!confirm('Confirma a conclusão do atendimento?')) {
      return;
    }

    this.service.concluir(item.id).subscribe({
      next: () => this.recarregar(),
      error: (erro) => alert(this.extrairMensagemErro(erro, 'Erro ao concluir atendimento.'))
    });
  }

  entregar(item: Atendimento): void {
    if (!item.id) return;

    if (!confirm('Confirma a entrega do veículo ao cliente?')) {
      return;
    }

    this.service.entregar(item.id).subscribe({
      next: (retorno) => {
        if (retorno.osEnviadaEmail) {
          alert(
            'Veículo entregue com sucesso.\n\n' +
            `A Ordem de Serviço foi enviada para: ${retorno.osEmailDestino || 'e-mail do cliente'}`
          );
        } else {
          alert(
            'Veículo entregue com sucesso.\n\n' +
            'Atenção: a Ordem de Serviço não foi enviada por e-mail.\n\n' +
            `Motivo: ${retorno.osUltimoErro || 'Não informado.'}`
          );
        }

        this.recarregar();
      },
      error: (erro) => alert(this.extrairMensagemErro(erro, 'Erro ao entregar veículo.'))
    });
  }

  reenviarOsEmail(item: Atendimento): void {
    if (!item.id) return;

    this.service.reenviarOrdemServicoEmail(item.id).subscribe({
      next: (retorno) => {
        if (retorno.osEnviadaEmail) {
          alert(`Ordem de Serviço reenviada para: ${retorno.osEmailDestino || 'e-mail do cliente'}`);
        } else {
          alert(`Não foi possível reenviar a OS.\n\n${retorno.osUltimoErro || ''}`);
        }

        this.recarregar();
      },
      error: (erro) => alert(this.extrairMensagemErro(erro, 'Erro ao reenviar OS por e-mail.'))
    });
  }

  abrirCancelamento(item: Atendimento): void {
    this.atendimentoSelecionado = item;
    this.motivoCancelamento = '';

    const el = document.getElementById('modalCancelamentoAtendimento');

    if (!el) return;

    this.modalCancelamento = bootstrap.Modal.getOrCreateInstance(el);
    this.modalCancelamento.show();
  }

  confirmarCancelamento(): void {
    if (!this.atendimentoSelecionado?.id) return;

    const body: AtendimentoCancelamentoRequest = {
      motivoCancelamento: this.motivoCancelamento || 'Cancelado pelo administrador.'
    };

    this.service.cancelar(this.atendimentoSelecionado.id, body).subscribe({
      next: () => {
        this.modalCancelamento?.hide();
        this.recarregar();
      },
      error: (erro) => alert(this.extrairMensagemErro(erro, 'Erro ao cancelar atendimento.'))
    });
  }

  podeGerenciarItens(item: Atendimento): boolean {
    return item.statusAtendimento !== 'CANCELADO'
      && item.statusAtendimento !== 'ENTREGUE';
  }

  podeIniciar(item: Atendimento): boolean {
    return item.statusAtendimento === 'ABERTO'
      || item.statusAtendimento === 'APROVADO'
      || item.statusAtendimento === 'EM_DIAGNOSTICO';
  }

  podeAprovar(item: Atendimento): boolean {
    return !item.aprovado
      && item.statusAtendimento !== 'CANCELADO'
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

  podeReenviarOsEmail(item: Atendimento): boolean {
    return !!item.id
      && (
        item.statusAtendimento === 'CONCLUIDO'
        || item.statusAtendimento === 'ENTREGUE'
      );
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
      case 'ABERTO':
        return 'bg-primary';
      case 'EM_DIAGNOSTICO':
      case 'EM_EXECUCAO':
        return 'bg-warning text-dark';
      case 'APROVADO':
      case 'CONCLUIDO':
        return 'bg-success';
      case 'ENTREGUE':
        return 'bg-info text-dark';
      case 'CANCELADO':
        return 'bg-danger';
      default:
        return 'bg-secondary';
    }
  }

  formatarTipoExecucao(tipo?: string | null): string {
    return this.formatarStatus(tipo);
  }

  tipoExecucaoBadgeClass(tipo?: string | null): string {
    switch (tipo) {
      case 'INTERNO':
        return 'bg-primary';
      case 'TERCEIRO':
        return 'bg-warning text-dark';
      case 'MISTO':
        return 'bg-info text-dark';
      default:
        return 'bg-secondary';
    }
  }

  formatarStatusOs(item: Atendimento): string {
    if (item.osEnviadaEmail) return 'OS enviada';
    if (item.osUltimoErro) return 'Falha no envio';
    return 'OS pendente';
  }

  osBadgeClass(item: Atendimento): string {
    if (item.osEnviadaEmail) return 'bg-success';
    if (item.osUltimoErro) return 'bg-danger';
    return 'bg-secondary';
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

    return p;
  }

  limparOpcional(valor: any): string {
    if (valor === null || valor === undefined) return '';

    return String(valor).trim();
  }

  converterMoedaOpcionalParaNumero(valor: any): string {
    const numero = this.moedaParaNumero(valor);
    return numero.toFixed(2);
  }

  formatarDescontoNovoAtendimento(): void {
    this.novoAtendimento.desconto = this.formatarMoedaBR(this.novoAtendimento.desconto);
    this.recalcularTotaisNovoAtendimento();
  }

  private moedaParaNumero(valor: any): number {
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

  private numeroDetectavel(valor: any): number | null {
    if (valor === null || valor === undefined || valor === '') {
      return null;
    }

    if (typeof valor === 'number') {
      return Number.isNaN(valor) ? null : valor;
    }

    let texto = String(valor)
      .replace('R$', '')
      .replace(/\s/g, '')
      .trim();

    if (!/\d/.test(texto)) {
      return null;
    }

    if (/^\d+\.\d{1,4}$/.test(texto)) {
      const numero = Number(texto);
      return Number.isNaN(numero) ? null : numero;
    }

    if (texto.includes(',')) {
      texto = texto.replace(/\./g, '').replace(',', '.');
    }

    const numero = Number(texto);

    return Number.isNaN(numero) ? null : numero;
  }

  private recalcularTotaisNovoAtendimento(): void {
    const valorPecas = this.pecasNovoAtendimento.reduce((total, item) => {
      return total + this.moedaParaNumero(item.valorTotal);
    }, 0);

    const valorMaoObra = this.servicosNovoAtendimento.reduce((total, item) => {
      if (item.statusItem === 'CANCELADO') return total;
      return total + this.moedaParaNumero(item.valorMaoObra);
    }, 0);

    const valorTerceiros = this.servicosNovoAtendimento.reduce((total, item) => {
      if (item.statusItem === 'CANCELADO') return total;
      return total + this.moedaParaNumero(item.valorTerceiro);
    }, 0);

    const desconto = this.moedaParaNumero(this.novoAtendimento.desconto);

    const total = Math.max(valorPecas + valorMaoObra + valorTerceiros - desconto, 0);

    this.novoAtendimento.valorPecas = this.formatarMoedaBR(valorPecas);
    this.novoAtendimento.valorMaoObra = this.formatarMoedaBR(valorMaoObra);
    this.novoAtendimento.valorTerceiros = this.formatarMoedaBR(valorTerceiros);
    this.novoAtendimento.valorTotal = this.formatarMoedaBR(total);
  }

  private montarPayload(dados: Partial<Atendimento>): AtendimentoRequest {
    return {
      idAgendamento: dados.idAgendamento ? Number(dados.idAgendamento) : null,
      idFornecedor: dados.idFornecedor ? Number(dados.idFornecedor) : null,
      idResponsavel: dados.idResponsavel ? Number(dados.idResponsavel) : null,

      tipoExecucao: dados.tipoExecucao || 'INTERNO',
      statusAtendimento: dados.statusAtendimento || 'ABERTO',

      dataEntrada: dados.dataEntrada || '',
      inicioReal: dados.inicioReal || '',
      fimReal: dados.fimReal || '',
      prazoEstimadoEntrega: dados.prazoEstimadoEntrega || '',
      dataEntrega: dados.dataEntrega || '',

      quilometragemEntrada: dados.quilometragemEntrada ?? null,
      quilometragemSaida: dados.quilometragemSaida ?? null,

      relatoCliente: this.limparOpcional(dados.relatoCliente),
      diagnosticoTecnico: this.limparOpcional(dados.diagnosticoTecnico),
      servicoExecutado: this.limparOpcional(dados.servicoExecutado),
      observacoesInternas: this.limparOpcional(dados.observacoesInternas),
      recomendacoesCliente: this.limparOpcional(dados.recomendacoesCliente),

      necessitaRetorno: !!dados.necessitaRetorno,
      dataRetornoSugerida: dados.dataRetornoSugerida || '',
      garantiaDias: dados.garantiaDias ?? 0,

      valorMaoObra: this.converterMoedaOpcionalParaNumero(dados.valorMaoObra),
      valorPecas: this.converterMoedaOpcionalParaNumero(dados.valorPecas),
      valorTerceiros: this.converterMoedaOpcionalParaNumero(dados.valorTerceiros),
      desconto: this.converterMoedaOpcionalParaNumero(dados.desconto),

      aprovado: !!dados.aprovado
    };
  }

  private montarPayloadPecaSalva(item: AtendimentoPeca): AtendimentoPecaRequest {
    return {
      idPeca: item.idPeca ? Number(item.idPeca) : null,
      idEstoquePeca: item.idEstoquePeca ? Number(item.idEstoquePeca) : null,
      idFornecedor: item.idFornecedor ? Number(item.idFornecedor) : null,
      quantidade: String(item.quantidade || '1'),
      valorUnitario: this.converterMoedaOpcionalParaNumero(item.valorUnitario),
      unidadeMedida: this.limparOpcional(item.unidadeMedida),
      observacoes: this.limparOpcional(item.observacoes)
    };
  }

  private montarPayloadServicoSalvo(item: AtendimentoServicoExecutado): AtendimentoServicoExecutadoRequest {
    return {
      idServico: item.idServico ? Number(item.idServico) : null,
      idResponsavel: item.idResponsavel ? Number(item.idResponsavel) : null,
      idFornecedor: item.idFornecedor ? Number(item.idFornecedor) : null,

      tipoExecucao: item.tipoExecucao || 'INTERNO',

      quantidade: String(item.quantidade || '1'),
      unidadeCobranca: this.limparOpcional(item.unidadeCobranca),

      tempoExecucao: item.tempoExecucao ? String(item.tempoExecucao) : '',
      unidadeTempo: this.limparOpcional(item.unidadeTempo),

      valorMaoObra: this.converterMoedaOpcionalParaNumero(item.valorMaoObra),
      valorTerceiro: this.converterMoedaOpcionalParaNumero(item.valorTerceiro),
      desconto: this.converterMoedaOpcionalParaNumero(item.desconto),

      statusItem: item.statusItem || 'EXECUTADO',
      observacoes: this.limparOpcional(item.observacoes)
    };
  }

  private validarNovoAtendimento(): string | null {
    if (!this.novoAtendimento.idAgendamento) {
      return 'Selecione um agendamento para criar o atendimento.';
    }

    if (!this.novoAtendimento.dataEntrada) {
      return 'Informe a data de entrada do veículo.';
    }

    if (!this.novoAtendimento.tipoExecucao) {
      return 'Informe o tipo de execução.';
    }

    if (
      (
        this.novoAtendimento.tipoExecucao === 'TERCEIRO'
        || this.novoAtendimento.tipoExecucao === 'MISTO'
      )
      && !this.novoAtendimento.idFornecedor
    ) {
      return 'Fornecedor é obrigatório para atendimento terceiro ou misto.';
    }

    return null;
  }

  private nomeResponsavelPorId(id: any): string {
    if (!id) return '';

    const responsavel = this.responsaveis.find(r => Number(r.id) === Number(id));

    return responsavel?.nome || responsavel?.nome_social || responsavel?.nomeSocial || '';
  }

  private nomeFornecedorPorId(id: any): string {
    if (!id) return '';

    const fornecedor = this.fornecedores.find(f => Number(f.id) === Number(id));

    return fornecedor?.razaoSocial
      || fornecedor?.razao_social
      || fornecedor?.nomeFantasia
      || fornecedor?.nome_fantasia
      || '';
  }

  private unidadePadraoPeca(peca: PecaResumo): string {
    return this.textoCampo(
      peca,
      [
        'unidadeMedida',
        'unidade_medida',
        'unidade',
        'unidadeCompra',
        'unidade_compra',
        'unidadeVenda',
        'unidade_venda'
      ],
      'UNIDADE'
    );
  }

  private valorPadraoPeca(peca: PecaResumo): any {
    const valorDireto = this.valorCampo(
      peca,
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
        'valorVenda',
        'valor_venda',
        'valorBase',
        'valor_base',
        'custoMedio',
        'custo_medio',
        'preco',
        'valor',
        'custo'
      ],
      null
    );

    if (valorDireto !== null && valorDireto !== undefined && valorDireto !== '') {
      return valorDireto;
    }

    return this.campoPorPadraoNumero(
      peca,
      [
        ['valor', 'unit'],
        ['preco', 'unit'],
        ['custo', 'unit'],
        ['valor', 'custo'],
        ['preco', 'compra'],
        ['valor', 'compra'],
        ['valor', 'venda'],
        ['preco'],
        ['valor'],
        ['custo']
      ],
      ['total', 'estoque', 'minimo', 'maximo', 'quantidade', 'id']
    ) ?? 0;
  }

  private valorPadraoServico(servico: ServicoResumo): any {
    const valorDireto = this.valorCampo(
      servico,
      [
        'valorBase',
        'valor_base',
        'valorServico',
        'valor_servico',
        'valor',
        'preco'
      ],
      null
    );

    if (valorDireto !== null && valorDireto !== undefined && valorDireto !== '') {
      return valorDireto;
    }

    return this.campoPorPadraoNumero(
      servico,
      [
        ['valor', 'base'],
        ['valor', 'servico'],
        ['preco'],
        ['valor']
      ],
      ['total', 'id']
    ) ?? 0;
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

  private textoCampo(objeto: any, caminhos: string[], padrao: string = ''): string {
    const valor = this.obterCampo(objeto, caminhos);

    if (valor === null || valor === undefined || valor === '') {
      return padrao;
    }

    return String(valor);
  }

  private valorCampo(objeto: any, caminhos: string[], padrao: any = 0): any {
    const valor = this.obterCampo(objeto, caminhos);

    if (valor === null || valor === undefined || valor === '') {
      return padrao;
    }

    return valor;
  }

  private idFornecedorObjeto(objeto: any): number | undefined {
    const valor = this.obterCampo(objeto, ['idFornecedor', 'id_fornecedor', 'fornecedor.id']);

    if (valor === null || valor === undefined || valor === '') {
      return undefined;
    }

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

  private campoPorPadraoNumero(
    objeto: any,
    gruposObrigatorios: string[][],
    proibidos: string[] = []
  ): number | null {
    if (!objeto) return null;

    for (const grupo of gruposObrigatorios) {
      for (const chave of Object.keys(objeto)) {
        const chaveNormalizada = this.normalizarChaveCampo(chave);

        const atendeObrigatorios = grupo.every(parte =>
          chaveNormalizada.includes(this.normalizarChaveCampo(parte))
        );

        const temProibido = proibidos.some(parte =>
          chaveNormalizada.includes(this.normalizarChaveCampo(parte))
        );

        if (!atendeObrigatorios || temProibido) {
          continue;
        }

        const numero = this.numeroDetectavel(objeto[chave]);

        if (numero !== null) {
          return numero;
        }
      }
    }

    return null;
  }

  private normalizarChaveCampo(valor: string): string {
    return String(valor || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');
  }

  private agoraInputDateTime(): string {
    const agora = new Date();
    agora.setMinutes(agora.getMinutes() - agora.getTimezoneOffset());
    return agora.toISOString().slice(0, 16);
  }

  private paraDatetimeLocal(valor: string): string {
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

  private valorPrimeiro(...valores: any[]): any {
    for (const valor of valores) {
      if (valor !== null && valor !== undefined && valor !== '') {
        return valor;
      }
    }

    return '';
  }

  extrairMensagemErro(erro: any, mensagemPadrao: string): string {
    if (typeof erro?.error === 'string') return erro.error;
    if (typeof erro?.error?.mensagem === 'string') return erro.error.mensagem;
    if (typeof erro?.message === 'string') return erro.message;
    return mensagemPadrao;
  }
}
