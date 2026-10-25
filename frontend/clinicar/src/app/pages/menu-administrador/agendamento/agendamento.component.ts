import { AgendamentoApoio } from './agendamento-apoio';
import { SeletorRemotoComponent } from '../../../shared/tabelas/seletor-remoto.component';
import { fornecedorAtende } from '../../../shared/fornecedores/categorias-fornecedor';
import { SelecaoCadastroComponent } from '../../../shared/tabelas/selecao-cadastro.component';
import { aposFecharModal } from '../../../shared/fornecedores/transicao-modal';
import { PaginacaoComponent } from '../../../shared/tabelas/paginacao.component';
import { ConsultaPaginadaService, PaginaCadastro } from '../../../shared/tabelas/consulta-paginada.service';
import { Observable, Subscription, map, tap } from 'rxjs';
import { DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { UnidadePecaPipe } from '../../../shared/forms/unidade-peca.pipe';
import { podeAcessarEtapa } from '../../../shared/forms/etapas-cadastro';
import { inject as injectFeedback } from '@angular/core';
import { NotificacaoService } from '../../../shared/feedback/notificacao.service';
import { CommonModule, Location } from '@angular/common';
import { Component, HostListener, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FieldHelpDirective } from '../../../shared/field-help/field-help.directive';
import { FieldHelpPanelComponent } from '../../../shared/field-help/field-help-panel.component';
import { catchError, forkJoin, of } from 'rxjs';
import { Router } from '@angular/router';
import {
  Agendamento,
  AgendamentoCancelamentoRequest,
  AgendamentoPecaSelecionada,
  AgendamentoRequest,
  AgendamentoService,
  FornecedorResumo,
  FornecimentoPecaResumo,
  PecaResumo,
  ServicoResumo,
  UsuarioResumo,
  VeiculoResumo
} from './agendamento.service';

declare var bootstrap: any;

type DirecaoOrdenacao = 'asc' | 'desc';
type ColunaOrdenacaoAgendamento =
  | 'codigoAgendamento'
  | 'nomeCliente'
  | 'placaVeiculo'
  | 'nomeServico'
  | 'dataHoraInicio'
  | 'statusAgendamento'
  | 'prioridade'
  | 'valorEstimado';

type AbaNovoAgendamento = 'agendamento' | 'pecas' | 'adicionais' | 'revisao';

type AcaoConfirmacaoAgendamento =
  | 'confirmar'
  | 'iniciar'
  | 'concluir'
  | 'naoCompareceu'
  | 'excluir';

interface ConfirmacaoAgendamento {
  acao: AcaoConfirmacaoAgendamento;
  item: Agendamento;
  titulo: string;
  mensagem: string;
  textoBotao: string;
  classeBotao: string;
  icone: string;
}


@Component({
    selector: 'app-agendamento',
    imports: [SeletorRemotoComponent,SelecaoCadastroComponent,PaginacaoComponent,UnidadePecaPipe, CommonModule, FormsModule, FieldHelpDirective, FieldHelpPanelComponent],
    templateUrl: './agendamento.component.html',
    styleUrl: './agendamento.component.css'
})
export class AgendamentoComponent implements OnInit {
  private readonly apoio = new AgendamentoApoio();
  private readonly notificacoes = injectFeedback(NotificacaoService);

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
  pecasDetalhesAgendamento: AgendamentoPecaSelecionada[] = [];
  carregandoPecasDetalhes = false;
  erroPecasDetalhes = false;

  pecaForm: Partial<AgendamentoPecaSelecionada> = {};

  filtro = '';
  filtroStatus = '';
  filtroPrioridade = '';
  statusFiltroAberto = false;

  colunaOrdenacao: ColunaOrdenacaoAgendamento = 'dataHoraInicio';
  direcaoOrdenacao: DirecaoOrdenacao = 'desc';

  paginaAtual = 1;
  itensPorPagina = 10;
  opcoesItensPorPagina = [5, 10, 20, 50];

  carregando = false;
  mensagemSucesso = '';
  mensagemErro = '';
  mensagemErroModal = '';
  mensagemDisponibilidadeResponsavel = '';

  abaNovoAgendamento: AbaNovoAgendamento = 'agendamento';

  modalCadastro: any;
  modalSelecaoCliente: any;
  modalSelecaoVeiculo: any;
  modalSelecaoServico: any;
  modalSelecaoResponsavel: any;
  responsavelInicialEdicao: UsuarioResumo | null = null;
  modalSelecaoFornecedor: any;
  modalSelecaoPeca: any;
  @ViewChild('seletorClienteAgendamento') private seletorClienteAgendamento?: SeletorRemotoComponent;
  @ViewChild('seletorVeiculoAgendamento') private seletorVeiculoAgendamento?: SeletorRemotoComponent;
  @ViewChild('seletorServicoAgendamento') private seletorServicoAgendamento?: SeletorRemotoComponent;
  @ViewChild('seletorResponsavelAgendamento') private seletorResponsavelAgendamento?: SeletorRemotoComponent;
  @ViewChild('seletorFornecedorAgendamento') private seletorFornecedorAgendamento?: SeletorRemotoComponent;
  @ViewChild('seletorPecaAgendamento') private seletorPecaAgendamento?: SeletorRemotoComponent;
  modalPeca: any;
  modalDetalhes: any;
  modalCancelamento: any;
  modalConfirmacao: any;

  editandoId: number | null = null;
  private agendamentoOriginalEdicao: Agendamento | null = null;
  private maoDeObraOriginalEdicao: number | null = null;
  private carregandoPecasEdicao = false;
  private erroPecasEdicao = false;
  editandoPecaId: number | null = null;

  private tempPecaId = -1;

  motivoCancelamento = '';
  acaoConfirmacao: ConfirmacaoAgendamento | null = null;

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
    private service: AgendamentoService,
    private location: Location,
    private router: Router
  ) { }

  modoPaginado=false;
  private readonly destroyRef=injectFeedback(DestroyRef);
  private readonly consultaPaginada=injectFeedback(ConsultaPaginadaService);
  private paginaServidor?:PaginaCadastro<Agendamento>;
  private consultaPagina?:Subscription;
  private filtroTimer?:ReturnType<typeof setTimeout>;
  private consultarPagina():Observable<PaginaCadastro<Agendamento>> {
    return this.consultaPaginada.consultar<Agendamento>('agendamento',{pagina:this.paginaAtual-1,tamanho:this.itensPorPagina,busca:this.filtro,ordenar:({nomeCliente:'cliente.nome',placaVeiculo:'veiculoPlacaHistorica',nomeServico:'servico.nome',os:'codigoAtendimento'} as Record<string,string>)[this.colunaOrdenacao]??this.colunaOrdenacao,decrescente:this.direcaoOrdenacao==='desc',statusAgendamento:this.filtroStatus,prioridade:this.filtroPrioridade}).pipe(tap(pagina=>this.paginaServidor=pagina));
  }
  private carregarPagina(esperar=false):void {
    if(!this.modoPaginado)return;
    clearTimeout(this.filtroTimer);
    if(esperar){this.filtroTimer=setTimeout(()=>this.carregarPagina(),250);return;}
    this.consultaPagina?.unsubscribe();this.carregando=true;this.mensagemErro='';
    this.consultaPagina=this.consultarPagina().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({next:pagina=>{
      this.agendamentos=pagina.content.map(item=>item);this.carregando=false;
      if(this.paginaAtual>Math.max(1,pagina.totalPages)){this.paginaAtual=Math.max(1,pagina.totalPages);this.carregarPagina();}
    },error:erro=>{this.carregando=false;this.mensagemErro=this.extrairMensagemErro(erro,'Não foi possível carregar a página.');}});
  }
  ngOnInit(): void {this.modoPaginado=true;this.destroyRef.onDestroy(()=>clearTimeout(this.filtroTimer));
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

  get agendamentosFiltrados(): Agendamento[] {if(this.modoPaginado)return this.agendamentos;
    const termo = this.normalizar(this.filtro);
    const termoNumerico = this.onlyDigits(this.filtro);
    const status = this.filtroStatus.trim();
    const prioridade = this.filtroPrioridade.trim();

    const filtrados = this.agendamentos.filter(item => {
      const statusOk = !status || item.statusAgendamento === status;
      const prioridadeOk = !prioridade || item.prioridade === prioridade;

      const texto = this.normalizar([
        item.codigoAgendamento,
        item.nomeCliente,
        item.cliente?.nome,
        item.cpfCliente,
        item.emailCliente,
        item.telefoneCliente,
        item.placaVeiculo,
        item.veiculo?.placa,
        item.fabricanteVeiculo,
        item.modeloVeiculo,
        item.veiculo?.modelo,
        item.nomeServico,
        item.servico?.nome,
        item.servico?.descricao,
        item.statusAgendamento,
        item.prioridade,
        item.canalOrigem,
        item.nomeResponsavel,
        item.responsavel?.nome
      ].join(' '));

      const textoNumerico = this.onlyDigits([
        item.codigoAgendamento,
        item.cpfCliente,
        item.telefoneCliente,
        item.placaVeiculo,
        item.veiculo?.placa
      ].join(' '));

      const textoOk = !termo || texto.includes(termo) || (!!termoNumerico && textoNumerico.includes(termoNumerico));

      return statusOk && prioridadeOk && textoOk;
    });

    return this.ordenarAgendamentos(filtrados);
  }

  get totalRegistrosFiltrados(): number {if(this.modoPaginado)return this.paginaServidor?.totalElements??0;
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

  get agendamentosPaginados(): Agendamento[] {if(this.modoPaginado)return this.agendamentos;
    this.ajustarPaginaAtual();

    const inicio = (this.paginaAtual - 1) * this.itensPorPagina;
    const fim = inicio + this.itensPorPagina;

    return this.agendamentosFiltrados.slice(inicio, fim);
  }

  get totalAgendamentos(): number {if(this.modoPaginado)return this.paginaServidor?.resumo['total']??0;
    return this.agendamentos.length;
  }

  get totalAgendados(): number {if(this.modoPaginado)return this.paginaServidor?.resumo['AGENDADO']??0;
    return this.agendamentos.filter(a => a.statusAgendamento === 'AGENDADO').length;
  }

  get totalConfirmados(): number {if(this.modoPaginado)return this.paginaServidor?.resumo['CONFIRMADO']??0;
    return this.agendamentos.filter(a => a.statusAgendamento === 'CONFIRMADO').length;
  }

  get totalEmAtendimento(): number {if(this.modoPaginado)return this.paginaServidor?.resumo['EM_ATENDIMENTO']??0;
    return this.agendamentos.filter(a => a.statusAgendamento === 'EM_ATENDIMENTO').length;
  }

  get totalConcluidos(): number {if(this.modoPaginado)return this.paginaServidor?.resumo['CONCLUIDO']??0;
    return this.agendamentos.filter(a => a.statusAgendamento === 'CONCLUIDO').length;
  }

  get totalCancelados(): number {if(this.modoPaginado)return (this.paginaServidor?.resumo['CANCELADO']??0)+(this.paginaServidor?.resumo['NAO_COMPARECEU']??0);
    return this.agendamentos.filter(a =>
      a.statusAgendamento === 'CANCELADO' || a.statusAgendamento === 'NAO_COMPARECEU'
    ).length;
  }

  get possuiFiltrosAplicados(): boolean {
    return !!(
      this.filtro.trim() ||
      this.filtroStatus.trim() ||
      this.filtroPrioridade.trim()
    );
  }

  get agendamentoProntoParaSalvar(): boolean {
    return this.validarCamposObrigatoriosAgendamento() === null;
  }

  get mensagemBloqueioSalvar(): string {
    return this.validarCamposObrigatoriosAgendamento() || '';
  }

  get progressoAgendamentoPercentual(): number {
    if (this.agendamentoProntoParaSalvar) {
      return 100;
    }

    const checks = [
      !this.clienteInvalido(),
      !this.veiculoInvalido(),
      !this.servicoPrevistoInvalido(),
      !this.quilometragemAtualInvalida(),
      !!this.novoAgendamento.dataHoraInicio,
      !!this.novoAgendamento.dataHoraFim,
      this.novoAgendamento.tipoExecucao === 'EXTERNA'
        ? !!this.novoAgendamento.idFornecedor && !this.fornecedorExternoInvalido()
        : !!this.novoAgendamento.idResponsavel && !this.responsavelDisponivelInvalido()
    ];

    const percentual = Math.round((checks.filter(Boolean).length / checks.length) * 100);
    return Math.max(0, Math.min(99, percentual));
  }

  get quantidadePendenciasAgendamento(): number {
    return this.pendenciasAgendamentoAba('agendamento')
      + this.pendenciasAgendamentoAba('pecas')
      + this.pendenciasAgendamentoAba('adicionais');
  }

  pendenciasAgendamentoAba(aba: AbaNovoAgendamento): number {
    if (aba !== 'agendamento') {
      return 0;
    }

    let total = 0;

    if (this.clienteInvalido()) total++;
    if (this.veiculoInvalido()) total++;
    if (this.servicoPrevistoInvalido()) total++;
    if (this.quilometragemAtualInvalida()) total++;
    if (!this.novoAgendamento.dataHoraInicio) total++;
    if (!this.novoAgendamento.dataHoraFim) total++;

    const possuiPeriodoInformado = !!this.novoAgendamento.dataHoraInicio && !!this.novoAgendamento.dataHoraFim;
    const periodoValido = this.periodoAgendamentoValido();

    if (possuiPeriodoInformado && !periodoValido) {
      total++;
    }

    if (this.novoAgendamento.tipoExecucao === 'EXTERNA') {
      if (this.fornecedorExternoInvalido()) total++;
      if (this.novoAgendamento.idResponsavel && this.responsavelDisponivelInvalido()) total++;
    } else if ((periodoValido && this.responsavelDisponivelInvalido()) || !this.novoAgendamento.idResponsavel) total++;

    return total;
  }

  private camposObrigatoriosAgendamento(): string[] { return this.apoio.camposObrigatoriosAgendamento(); }

  private campoAgendamentoPreenchido(campo: string): boolean {
    const valor = (this.novoAgendamento as any)[campo];

    if (valor === null || valor === undefined) {
      return false;
    }

    return String(valor).trim().length > 0;
  }

  registrarCatalogo(campo:string,item:any):void {
    if(!item)return;
    const listas=this as unknown as Record<string,any[]>;
    listas[campo]=[...(listas[campo]||[]).filter(r=>Number(r.id)!==Number(item.id)),item];
    if(campo==='pecas' && Object.prototype.hasOwnProperty.call(item,'fornecimentoPreferido')) {
      this.fornecimentosPecas=this.fornecimentosPecas.filter(r=>Number((r as any).peca?.id??(r as any).idPeca)!==Number(item.id));
      if(item.fornecimentoPreferido)this.fornecimentosPecas.push(item.fornecimentoPreferido);
    }
  }
  filtrosResponsavelRemoto():Record<string,string>{return {perfis:'COLABORADOR,ADMINISTRADOR',status:'ATIVO',inicioDisponivel:this.novoAgendamento.dataHoraInicio || '',fimDisponivel:this.novoAgendamento.dataHoraFim || '',ignorarAgendamento:String(this.editandoId || 0)};}
  private catalogosCarregados=false;
  private carregandoCatalogos=false;
  carregarTudo(somenteCatalogos=false): void {
    if(this.modoPaginado&&!somenteCatalogos){this.carregarPagina();return;}
    if(somenteCatalogos && this.modoPaginado)return;
    if(somenteCatalogos){if(this.catalogosCarregados||this.carregandoCatalogos)return;this.carregandoCatalogos=true;}
    this.carregando = true;
    this.mensagemErro = '';

    forkJoin({
      agendamentos: somenteCatalogos?of(this.agendamentos):this.consultarPagina().pipe(map(pagina=>pagina.content)),
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
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (resposta) => {
        if(somenteCatalogos){this.catalogosCarregados=true;this.carregandoCatalogos=false;}
        this.agendamentos = this.extrairLista<Agendamento>(resposta.agendamentos);
        this.usuarios = this.extrairLista<UsuarioResumo>(resposta.usuarios);
        this.veiculos = this.extrairLista<VeiculoResumo>(resposta.veiculos);
        this.servicos = this.extrairLista<ServicoResumo>(resposta.servicos);
        this.fornecedores = this.extrairLista<FornecedorResumo>(resposta.fornecedores);
        this.pecas = this.extrairLista<PecaResumo>(resposta.pecas);
        this.fornecimentosPecas = this.extrairLista<FornecimentoPecaResumo>(resposta.fornecimentosPecas);

        if(!somenteCatalogos)this.paginaAtual = 1;
        this.carregando = false;
      },
      error: (erro) => {
        this.carregandoCatalogos=false;
        this.mensagemErro = this.extrairMensagemErro(erro, 'Erro ao carregar agendamentos.');
        this.carregando = false;
      }
    });
  }

  recarregar(): void {if(this.modoPaginado){this.carregarPagina();return;}
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

  podeAcessarAbaCadastro(aba: AbaNovoAgendamento): boolean {
    const ordem: (AbaNovoAgendamento)[] = ['agendamento', 'pecas', 'adicionais', 'revisao'];
    return podeAcessarEtapa(ordem, this.abaNovoAgendamento, aba, etapa => {
      switch (etapa) {
        case 'agendamento': return this.agendamentoProntoParaSalvar;
        case 'pecas': return true;
        case 'adicionais': return true;
        case 'revisao': return true;
      }
    });
  }

  get podeAvancarCadastro(): boolean {
    const ordem: (AbaNovoAgendamento)[] = ['agendamento', 'pecas', 'adicionais', 'revisao'];
    const proxima = ordem[ordem.indexOf(this.abaNovoAgendamento) + 1];
    return !!proxima && this.podeAcessarAbaCadastro(proxima);
  }

  trocarAbaNovoAgendamento(
    aba: AbaNovoAgendamento
  ): void {
    if (!this.podeAcessarAbaCadastro(aba)) return;
    this.abaNovoAgendamento = aba;
  }

  avancarAbaNovoAgendamento(): void {
    const ordem: AbaNovoAgendamento[] = ['agendamento', 'pecas', 'adicionais', 'revisao'];
    const proxima = ordem[ordem.indexOf(this.abaNovoAgendamento) + 1];
    if (proxima) this.trocarAbaNovoAgendamento(proxima);
  }

  abrirModalCadastro(): void {
    this.maoDeObraOriginalEdicao = null;
    this.carregandoPecasEdicao = false;
    this.erroPecasEdicao = false;
    if(this.modoPaginado)this.carregarTudo(true);
    this.editandoId = null;
    this.responsavelInicialEdicao = null;
    this.agendamentoOriginalEdicao = null;
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
      tipoExecucao: 'INTERNA',

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
    if(this.modoPaginado)this.carregarTudo(true);
    this.editandoId = item.id ?? null;
    this.carregandoPecasEdicao = !!this.editandoId;
    this.erroPecasEdicao = false;
    const idResponsavel = item.idResponsavel ?? item.responsavel?.id;
    this.responsavelInicialEdicao = idResponsavel && item.nomeResponsavel
      ? {id:idResponsavel,nome:item.nomeResponsavel} : null;
    this.agendamentoOriginalEdicao = { ...item, idVeiculo: item.idVeiculo ?? item.veiculo?.id };
    this.abaNovoAgendamento = 'agendamento';
    this.mensagemErroModal = '';
    this.mensagemDisponibilidadeResponsavel = '';
    this.tempPecaId = -1;

    const observacoesOriginais = this.limparOpcional(item.observacoes);

    this.pecasNovoAgendamento = this.extrairPecasPrevistasDasObservacoes(observacoesOriginais);
    this.maoDeObraOriginalEdicao = Math.max(0,
      this.moedaParaNumero(item.valorEstimado) - this.totalPecasAgendamento());

    this.novoAgendamento = {
      ...item,
      idCliente: item.idCliente ?? item.cliente?.id,
      idVeiculo: item.idVeiculo ?? item.veiculo?.id,
      idServico: item.idServico ?? item.servico?.id,
      idFornecedor: item.idFornecedor ?? item.fornecedor?.id,
      tipoExecucao: item.tipoExecucao === 'PENDENTE' ? 'INTERNA' : item.tipoExecucao || ((item.idFornecedor ?? item.fornecedor?.id) ? 'EXTERNA' : 'INTERNA'),
      idResponsavel: item.idResponsavel ?? item.responsavel?.id,
      dataHoraInicio: this.paraDatetimeLocal(item.dataHoraInicio || ''),
      dataHoraFim: this.paraDatetimeLocal(item.dataHoraFim || ''),
      observacoes: this.removerBlocoPecasDasObservacoes(observacoesOriginais),
      valorEstimado: this.formatarMoedaBR(item.valorEstimado),
      valorFinal: item.valorFinal ? this.formatarMoedaBR(item.valorFinal) : ''
    };

    this.selecionarCliente(false);
    this.selecionarVeiculo();
    this.selecionarServico(false);
    this.recalcularValoresAgendamento();
    this.atualizarDisponibilidadeResponsavel();

    if (this.editandoId) {
      const idEdicao = this.editandoId;
      this.service.listarPecasPrevistas(idEdicao).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: pecas => {
          if (this.editandoId !== idEdicao) return;
          if (pecas.length) {
            this.pecasNovoAgendamento = pecas.map(peca => ({ ...peca }));
            this.maoDeObraOriginalEdicao = Math.max(0,
              this.moedaParaNumero(item.valorEstimado) - this.totalPecasAgendamento());
            this.recalcularValoresAgendamento();
          }
          this.carregandoPecasEdicao = false;
        },
        error: () => {
          if (this.editandoId !== idEdicao) return;
          this.carregandoPecasEdicao = false;
          this.erroPecasEdicao = true;
          this.mensagemErroModal = 'Não foi possível consultar as peças do agendamento. Feche e abra a edição novamente.';
        }
      });
    }

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

  abrirSelecaoCliente(): void {
    aposFecharModal('modalCadastroAgendamento', this.modalCadastro, () => {
      const elemento = document.getElementById('modalSelecaoClienteAgendamento');
      if (!elemento) return;
      this.modalSelecaoCliente = bootstrap.Modal.getOrCreateInstance(elemento, {backdrop:'static',keyboard:false});
      this.modalSelecaoCliente.show();
    }, this.destroyRef);
  }

  escolherCliente(item: UsuarioResumo): void {
    if (!item.id) return;
    if (this.seletorClienteAgendamento) this.seletorClienteAgendamento.escolher(item);
    else { this.registrarCatalogo('usuarios', item); this.novoAgendamento.idCliente = item.id; this.selecionarCliente(); }
    this.fecharSelecaoCliente();
  }

  fecharSelecaoCliente(): void {
    aposFecharModal('modalSelecaoClienteAgendamento', this.modalSelecaoCliente,
      () => this.modalCadastro?.show(), this.destroyRef);
  }

  abrirSelecaoVeiculo(): void {
    if (!this.novoAgendamento.idCliente) return;
    aposFecharModal('modalCadastroAgendamento', this.modalCadastro, () => {
      const elemento = document.getElementById('modalSelecaoVeiculoAgendamento');
      if (!elemento) return;
      this.modalSelecaoVeiculo = bootstrap.Modal.getOrCreateInstance(elemento, {backdrop:'static',keyboard:false});
      this.modalSelecaoVeiculo.show();
    }, this.destroyRef);
  }

  escolherVeiculo(item: VeiculoResumo): void {
    if (!item.id || Number(this.idClienteDoVeiculo(item)) !== Number(this.novoAgendamento.idCliente)) return;
    if (this.seletorVeiculoAgendamento) this.seletorVeiculoAgendamento.escolher(item);
    else { this.registrarCatalogo('veiculos', item); this.novoAgendamento.idVeiculo = item.id; this.selecionarVeiculo(); }
    this.fecharSelecaoVeiculo();
  }

  fecharSelecaoVeiculo(): void {
    aposFecharModal('modalSelecaoVeiculoAgendamento', this.modalSelecaoVeiculo,
      () => this.modalCadastro?.show(), this.destroyRef);
  }

  abrirSelecaoServico(): void {
    aposFecharModal('modalCadastroAgendamento', this.modalCadastro, () => {
      const elemento = document.getElementById('modalSelecaoServicoAgendamento');
      if (!elemento) return;
      this.modalSelecaoServico = bootstrap.Modal.getOrCreateInstance(elemento, {backdrop:'static',keyboard:false});
      this.modalSelecaoServico.show();
    }, this.destroyRef);
  }

  escolherServico(item: ServicoResumo): void {
    if (!item.id || item.ativo === false) return;
    if (this.seletorServicoAgendamento) this.seletorServicoAgendamento.escolher(item);
    else { this.registrarCatalogo('servicos', item); this.novoAgendamento.idServico = item.id; this.selecionarServico(); }
    this.fecharSelecaoServico();
  }

  fecharSelecaoServico(): void {
    aposFecharModal('modalSelecaoServicoAgendamento', this.modalSelecaoServico,
      () => this.modalCadastro?.show(), this.destroyRef);
  }

  abrirSelecaoResponsavel(): void {
    if (!this.periodoAgendamentoValido() || this.consultandoDisponibilidade || this.periodoConsultado !== this.novoAgendamento.dataHoraInicio+'|'+this.novoAgendamento.dataHoraFim) return;
    aposFecharModal('modalCadastroAgendamento', this.modalCadastro, () => {
      const elemento = document.getElementById('modalSelecaoResponsavelAgendamento');
      if (!elemento) return;
      this.modalSelecaoResponsavel = bootstrap.Modal.getOrCreateInstance(elemento, {backdrop:'static',keyboard:false});
      this.modalSelecaoResponsavel.show();
    }, this.destroyRef);
  }

  escolherResponsavel(item: UsuarioResumo): void {
    const tipo = this.normalizarTipoAcesso(item.tipo_do_acesso || item.tipoDoAcesso);
    if (!item.id || !['COLABORADOR','ADMINISTRADOR'].includes(tipo) || !this.responsavelDisponivelNoPeriodo(item)) return;
    if (this.seletorResponsavelAgendamento) this.seletorResponsavelAgendamento.escolher(item);
    else { this.registrarCatalogo('usuarios', item); this.novoAgendamento.idResponsavel = item.id; this.selecionarResponsavel(); }
    this.fecharSelecaoResponsavel();
  }

  abrirSelecaoFornecedor(): void {
    if (this.novoAgendamento.tipoExecucao !== 'EXTERNA') return;
    aposFecharModal('modalCadastroAgendamento', this.modalCadastro, () => {
      const elemento = document.getElementById('modalSelecaoFornecedorAgendamento');
      if (!elemento) return;
      this.modalSelecaoFornecedor = bootstrap.Modal.getOrCreateInstance(elemento, {backdrop:'static',keyboard:false});
      this.modalSelecaoFornecedor.show();
    }, this.destroyRef);
  }

  escolherFornecedor(item: FornecedorResumo): void {
    if (!item.id || item.ativo === false || !fornecedorAtende(item.itemFornecido, 'servico')) return;
    if (this.seletorFornecedorAgendamento) this.seletorFornecedorAgendamento.escolher(item);
    else { this.novoAgendamento.idFornecedor = item.id; this.selecionarFornecedorExterno(item); }
    this.fecharSelecaoFornecedor();
  }

  fecharSelecaoFornecedor(): void {
    aposFecharModal('modalSelecaoFornecedorAgendamento', this.modalSelecaoFornecedor,
      () => this.modalCadastro?.show(), this.destroyRef);
  }

  alterarTipoExecucao(): void {
    if (this.novoAgendamento.tipoExecucao === 'INTERNA') {
      this.novoAgendamento.idFornecedor = undefined;
      this.novoAgendamento.razaoSocialFornecedor = '';
    }
  }

  selecionarFornecedorExterno(item: FornecedorResumo | null): void {
    if (item) this.registrarCatalogo('fornecedores', item);
    this.novoAgendamento.razaoSocialFornecedor = item?.razaoSocial || item?.razao_social || item?.nomeFantasia || item?.nome_fantasia || '';
  }

  selecionarFornecedorExternoPorId(): void {
    this.selecionarFornecedorExterno(this.fornecedores.find(item => Number(item.id) === Number(this.novoAgendamento.idFornecedor)) || null);
  }

  fornecedorExternoInvalido(): boolean {
    if (this.novoAgendamento.tipoExecucao !== 'EXTERNA') return false;
    const fornecedor = this.fornecedores.find(item => Number(item.id) === Number(this.novoAgendamento.idFornecedor));
    if (this.editandoId && Number(this.novoAgendamento.idFornecedor) === Number(this.agendamentoOriginalEdicao?.idFornecedor ?? this.agendamentoOriginalEdicao?.fornecedor?.id)) return false;
    return !fornecedor || fornecedor.ativo === false;
  }

  fecharSelecaoResponsavel(): void {
    aposFecharModal('modalSelecaoResponsavelAgendamento', this.modalSelecaoResponsavel,
      () => this.modalCadastro?.show(), this.destroyRef);
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
    const original = this.agendamentoOriginalEdicao;
    if (this.editandoId && original && Number(veiculo.id) === Number(original.idVeiculo)) {
      return `${this.formatarPlaca(original.placaVeiculo)} │ ${this.capitalizar(original.modeloVeiculo || '')}`.trim();
    }
    const placa = this.placaDoVeiculo(veiculo);
    const modelo = this.capitalizar(this.modeloDoVeiculo(veiculo));

    return `${this.formatarPlaca(placa)} │ ${modelo || ''}`.trim();
  }

  selecionarVeiculo(): void {
    const idVeiculo = Number(this.novoAgendamento.idVeiculo);
    const original = this.agendamentoOriginalEdicao;
    if (this.editandoId && original && idVeiculo === Number(original.idVeiculo)) {
      this.novoAgendamento.placaVeiculo = original.placaVeiculo;
      this.novoAgendamento.fabricanteVeiculo = original.fabricanteVeiculo;
      this.novoAgendamento.modeloVeiculo = original.modeloVeiculo;
      this.novoAgendamento.corVeiculo = original.corVeiculo;
      this.novoAgendamento.anoModeloCombustivelVeiculo = original.anoModeloCombustivelVeiculo;
      return;
    }

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

  private consultaDisponibilidade?:Subscription;
  private ocupadosServidor=new Set<number>();
  private periodoConsultado='';
  consultandoDisponibilidade=false;
  atualizarDisponibilidadeResponsavel():void {
    if(!this.modoPaginado){this.aplicarDisponibilidadeResponsavel();return;}
    this.consultaDisponibilidade?.unsubscribe();this.periodoConsultado='';
    if(!this.periodoAgendamentoValido()){this.aplicarDisponibilidadeResponsavel();return;}
    this.consultandoDisponibilidade=true;this.mensagemDisponibilidadeResponsavel='Consultando disponibilidade dos responsáveis...';
    const inicio=this.novoAgendamento.dataHoraInicio!,fim=this.novoAgendamento.dataHoraFim!;
    this.consultaDisponibilidade=this.consultaPaginada.responsaveisOcupados(inicio,fim,Number(this.editandoId)||0).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next:ids=>{this.ocupadosServidor=new Set(ids);this.periodoConsultado=inicio+'|'+fim;this.consultandoDisponibilidade=false;this.aplicarDisponibilidadeResponsavel();},
      error:()=>{this.consultandoDisponibilidade=false;this.mensagemDisponibilidadeResponsavel='Não foi possível consultar a disponibilidade. Informe o período novamente para tentar.';}
    });
  }
  private aplicarDisponibilidadeResponsavel(): void {
    this.mensagemDisponibilidadeResponsavel = '';

    if (!this.periodoAgendamentoValido()) {
      this.novoAgendamento.idResponsavel = undefined;
      this.novoAgendamento.nomeResponsavel = '';
      return;
    }

    if(this.modoPaginado){
      if(this.novoAgendamento.idResponsavel && this.ocupadosServidor.has(Number(this.novoAgendamento.idResponsavel))){
        this.novoAgendamento.idResponsavel=undefined;this.novoAgendamento.nomeResponsavel='';
        this.mensagemDisponibilidadeResponsavel='O responsável escolhido está ocupado neste período. Selecione outro responsável.';
      }
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
    if(this.modoPaginado)return !this.consultandoDisponibilidade && this.periodoConsultado===this.novoAgendamento.dataHoraInicio+'|'+this.novoAgendamento.dataHoraFim && !this.ocupadosServidor.has(Number(responsavel.id));

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
  ): boolean { return this.apoio.periodosSobrepostos(inicioNovo, fimNovo, inicioExistente, fimExistente); }

  private statusBloqueiaResponsavel(status?: string | null): boolean { return this.apoio.statusBloqueiaResponsavel(status); }

  private idResponsavelDoAgendamento(agendamento: any): number | undefined { return this.apoio.idResponsavelDoAgendamento(agendamento); }

  private dataValida(valor?: string | null): Date | null { return this.apoio.dataValida(valor); }

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

  abrirSelecaoPeca(): void {
    aposFecharModal('modalPecaAgendamento', this.modalPeca, () => {
      const elemento = document.getElementById('modalSelecaoPecaAgendamento');
      if (!elemento) return;
      this.modalSelecaoPeca = bootstrap.Modal.getOrCreateInstance(elemento, {backdrop:'static',keyboard:false});
      this.modalSelecaoPeca.show();
    }, this.destroyRef);
  }

  escolherPeca(item: PecaResumo): void {
    if (!item.id) return;
    if (this.seletorPecaAgendamento) this.seletorPecaAgendamento.escolher(item);
    else { this.registrarCatalogo('pecas', item); this.pecaForm.idPeca = item.id; this.selecionarPecaCatalogo(); }
    this.fecharSelecaoPeca();
  }

  fecharSelecaoPeca(): void {
    aposFecharModal('modalSelecaoPecaAgendamento', this.modalSelecaoPeca,
      () => this.modalPeca?.show(), this.destroyRef);
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

      const idEstoquePeca = this.idEstoquePecaObjeto(fornecimento);

      if (idEstoquePeca) {
        (this.pecaForm as any).idEstoquePeca = idEstoquePeca;
      }
    } else {
      this.pecaForm.unidadeMedida = this.unidadePadraoPeca(peca);
      this.pecaForm.valorUnitario = this.formatarMoedaBR(0);
      (this.pecaForm as any).idEstoquePeca = undefined;
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
      this.notificacoes.erro('Selecione uma peça.');
      return;
    }

    if (this.quantidadeInteiraMinima(this.pecaForm.quantidade) <= 0) {
      this.notificacoes.erro('Informe uma quantidade maior que zero.');
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

    (item as any).idEstoquePeca = this.numeroOuNull((this.pecaForm as any).idEstoquePeca);

    this.inserirOuSomarPeca(item);
    this.recalcularValoresAgendamento();
    this.modalPeca?.hide();
    this.resetarPecaForm();
    this.trocarAbaNovoAgendamento('pecas');
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

      const itemAtualizado: AgendamentoPecaSelecionada = {
        ...existente,
        quantidade: quantidadeFinal,
        valorTotal: valorTotal.toFixed(2)
      };

      (itemAtualizado as any).idEstoquePeca = this.numeroOuNull(
        this.obterCampo(existente, ['idEstoquePeca', 'id_estoque_peca', 'estoquePeca.id'])
        || this.obterCampo(novaPeca, ['idEstoquePeca', 'id_estoque_peca', 'estoquePeca.id'])
      );

      this.pecasNovoAgendamento[indiceDuplicado] = itemAtualizado;

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

    (this.pecaForm as any).idEstoquePeca = this.numeroOuNull(
      this.obterCampo(item, ['idEstoquePeca', 'id_estoque_peca', 'estoquePeca.id'])
    );
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

    if (this.abaNovoAgendamento !== 'revisao') return;

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
        this.notificacoes.sucesso(this.editandoId ? 'Agendamento atualizado com sucesso.' : 'Agendamento cadastrado com sucesso.');
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
    if (this.novoAgendamento.tipoExecucao === 'EXTERNA' && !this.novoAgendamento.idResponsavel) return false;
    if (!this.periodoAgendamentoValido()) {
      return true;
    }

    if (!this.novoAgendamento.idResponsavel) {
      return true;
    }

    const responsavel = this.responsaveis.find(r =>
      Number(r.id) === Number(this.novoAgendamento.idResponsavel)
    ) || (this.modoPaginado && this.editandoId
      && Number(this.responsavelInicialEdicao?.id) === Number(this.novoAgendamento.idResponsavel)
      ? this.responsavelInicialEdicao : null);

    if (!responsavel) {
      return true;
    }

    return !this.responsavelDisponivelNoPeriodo(responsavel);
  }

  mensagemResponsavelInvalido(): string {
    if (!this.periodoAgendamentoValido()) {
      return 'Informe um período válido antes de selecionar o responsável.';
    }

    // Na consulta paginada, a lista local não contém todos os profissionais.
    // A ausência deles em memória não significa indisponibilidade.
    if (!this.modoPaginado && this.responsaveisDisponiveis().length === 0) {
      return 'Nenhum responsável disponível para o período informado.';
    }

    if (!this.novoAgendamento.idResponsavel) {
      return 'Selecione um responsável disponível.';
    }

    return 'O responsável selecionado não está disponível neste período.';
  }

  private validarCamposObrigatoriosAgendamento(): string | null {
    if (this.carregandoPecasEdicao) return 'Aguarde a consulta das peças deste agendamento.';
    if (this.erroPecasEdicao) return 'Não foi possível consultar as peças deste agendamento. Reabra a edição.';
    if (this.pecasNovoAgendamento.some(peca => !this.numeroOuNull(peca.idPeca)))
      return 'Selecione novamente a peça prevista antes de salvar o agendamento.';
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

    if (this.novoAgendamento.tipoExecucao === 'EXTERNA' && this.fornecedorExternoInvalido()) {
      return 'Selecione um fornecedor ativo de serviços para a execução externa.';
    }

    if ((this.novoAgendamento.tipoExecucao !== 'EXTERNA' || this.novoAgendamento.idResponsavel) && this.responsavelDisponivelInvalido()) {
      return this.mensagemResponsavelInvalido();
    }

    return null;
  }

  private montarPayloadAgendamento(): AgendamentoRequest {
    const payload: AgendamentoRequest & { pecasPrevistas?: any[] } = {
      idCliente: this.novoAgendamento.idCliente ? Number(this.novoAgendamento.idCliente) : null,
      idVeiculo: this.novoAgendamento.idVeiculo ? Number(this.novoAgendamento.idVeiculo) : null,
      idServico: this.novoAgendamento.idServico ? Number(this.novoAgendamento.idServico) : null,
      idFornecedor: this.novoAgendamento.idFornecedor ? Number(this.novoAgendamento.idFornecedor) : null,
      idResponsavel: this.novoAgendamento.idResponsavel ? Number(this.novoAgendamento.idResponsavel) : null,
      tipoExecucao: this.novoAgendamento.tipoExecucao || 'INTERNA',

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

      /*
       * Mantido temporariamente para compatibilidade com a visualização já existente.
       * A nova regra de reserva de estoque deve usar pecasPrevistas, abaixo.
       */
      observacoes: this.montarObservacoesComPecas(),

      valorEstimado: this.converterMoedaOpcionalParaNumero(this.novoAgendamento.valorEstimado),
      valorFinal: this.converterMoedaOpcionalParaNumero(this.novoAgendamento.valorFinal),

      requerConfirmacao: !!this.novoAgendamento.requerConfirmacao,
      confirmado: !!this.novoAgendamento.confirmado
    };

    payload.pecasPrevistas = this.montarPecasPrevistasPayload();

    console.log('Payload agendamento enviado ao backend:', payload);

    return payload;
  }

  private montarPecasPrevistasPayload(): any[] {
    return (this.pecasNovoAgendamento || [])
      .map(item => {
        const idPeca = this.numeroOuNull(
          this.obterCampo(item, [
            'idPeca',
            'id_peca',
            'pecaId',
            'peca_id',
            'peca.id'
          ])
        );

        if (!idPeca) {
          return null;
        }

        const quantidade = this.quantidadeInteiraMinima(item.quantidade || 1);
        const valorUnitario = this.moedaParaNumero(item.valorUnitario || 0);

        return {
          idPeca,
          idEstoquePeca: this.numeroOuNull(
            this.obterCampo(item, [
              'idEstoquePeca',
              'id_estoque_peca',
              'estoquePecaId',
              'estoque_peca_id',
              'estoquePeca.id',
              'estoque.id'
            ])
          ),
          idFornecedor: this.numeroOuNull(
            this.obterCampo(item, [
              'idFornecedor',
              'id_fornecedor',
              'fornecedorId',
              'fornecedor_id',
              'fornecedor.id'
            ])
          ),
          quantidade: this.numeroParaBackend(quantidade),
          unidadeMedida: this.limparOpcional(item.unidadeMedida || 'UNIDADE') || 'UNIDADE',
          valorUnitario: this.numeroParaBackend(valorUnitario),
          observacoes: this.limparOpcional(item.observacoes)
        };
      })
      .filter((item): item is any => item !== null);
  }

  private numeroParaBackend(valor: any): string { return this.apoio.numeroParaBackend(valor); }

  private numeroOuNull(valor: any): number | null { return this.apoio.numeroOuNull(valor); }

  private montarObservacoesComPecas(): string {
    const observacoesBase = this.removerBlocoPecasDasObservacoes(this.novoAgendamento.observacoes);

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

  private extrairPecasPrevistasDasObservacoes(observacoes: any): AgendamentoPecaSelecionada[] {
    const bloco = this.extrairBlocoPecasDasObservacoes(observacoes);

    if (!bloco) {
      return [];
    }

    return bloco
      .split(/\r?\n/)
      .map(linha => linha.trim())
      .filter(linha => linha.startsWith('- '))
      .map(linha => this.linhaObservacaoParaPecaAgendamento(linha))
      .filter((item): item is AgendamentoPecaSelecionada => item !== null);
  }

  private extrairBlocoPecasDasObservacoes(observacoes: any): string { return this.apoio.extrairBlocoPecasDasObservacoes(observacoes); }

  private removerBlocoPecasDasObservacoes(observacoes: any): string { return this.apoio.removerBlocoPecasDasObservacoes(observacoes); }

  private linhaObservacaoParaPecaAgendamento(linha: string): AgendamentoPecaSelecionada | null {
    const texto = linha.replace(/^-\s*/, '').trim();

    if (!texto || this.normalizar(texto).startsWith('total estimado de pecas')) {
      return null;
    }

    const partes = texto.split('|').map(parte => parte.trim());
    const descricao = partes[0] || 'Peça';
    const fabricante = this.valorRotuloLinhaPeca(partes, 'Fabricante');
    const modelo = this.valorRotuloLinhaPeca(partes, 'Modelo');
    const quantidadeUnidade = this.valorRotuloLinhaPeca(partes, 'Qtd');
    const valorUnitarioTexto = this.valorRotuloLinhaPeca(partes, 'Unitário');
    const valorTotalTexto = this.valorRotuloLinhaPeca(partes, 'Total');

    const quantidadeMatch = quantidadeUnidade.match(/^([\d.,]+)\s*(.*)$/);
    const quantidade = this.quantidadeInteiraMinima(quantidadeMatch?.[1] || 1);
    const unidadeMedida = (quantidadeMatch?.[2] || 'UNIDADE').trim() || 'UNIDADE';
    const valorUnitario = this.moedaParaNumero(valorUnitarioTexto);
    const valorTotalExtraido = this.moedaParaNumero(valorTotalTexto);
    const valorTotal = valorTotalExtraido > 0 ? valorTotalExtraido : quantidade * valorUnitario;
    const pecaCatalogo = this.localizarPecaCatalogoPorDados(descricao, fabricante, modelo);

    return {
      id: this.tempPecaId--,
      idPeca: pecaCatalogo?.id,
      nomePeca: pecaCatalogo?.nome || descricao,
      descricaoPeca: pecaCatalogo?.descricao || descricao,
      fabricantePeca: fabricante !== '—' ? fabricante : (pecaCatalogo?.fabricante || ''),
      modeloPeca: modelo !== '—' ? modelo : (pecaCatalogo?.modelo || ''),
      idFornecedor: null,
      razaoSocialFornecedor: '',
      quantidade,
      unidadeMedida,
      valorUnitario: valorUnitario.toFixed(2),
      valorTotal: valorTotal.toFixed(2),
      observacoes: ''
    };
  }

  private valorRotuloLinhaPeca(partes: string[], rotulo: string): string { return this.apoio.valorRotuloLinhaPeca(partes, rotulo); }

  private localizarPecaCatalogoPorDados(
    descricao: string,
    fabricante: string,
    modelo: string
  ): PecaResumo | null {
    const descricaoNormalizada = this.normalizar(descricao);
    const fabricanteNormalizado = this.normalizar(fabricante === '—' ? '' : fabricante);
    const modeloNormalizado = this.normalizar(modelo === '—' ? '' : modelo);

    if (!descricaoNormalizada) {
      return null;
    }

    return this.pecas.find(peca => {
      const nomePeca = this.normalizar(peca.nome);
      const descricaoPeca = this.normalizar(peca.descricao);
      const fabricantePeca = this.normalizar(peca.fabricante);
      const modeloPeca = this.normalizar(peca.modelo);

      const descricaoConfere = nomePeca === descricaoNormalizada || descricaoPeca === descricaoNormalizada;
      const fabricanteConfere = !fabricanteNormalizado || !fabricantePeca || fabricantePeca === fabricanteNormalizado;
      const modeloConfere = !modeloNormalizado || !modeloPeca || modeloPeca === modeloNormalizado;

      return descricaoConfere && fabricanteConfere && modeloConfere;
    }) || null;
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

    if (!servico) return this.editandoId ? (this.maoDeObraOriginalEdicao ?? 0) : 0;

    return this.moedaParaNumero(this.valorPadraoServico(servico));
  }

  abrirDetalhes(item: Agendamento): void {
    this.agendamentoSelecionado = item;
    this.pecasDetalhesAgendamento = [];
    this.carregandoPecasDetalhes = !!item.id;
    this.erroPecasDetalhes = false;
    if (item.id) this.service.listarPecasPrevistas(item.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: pecas => {
        if (this.agendamentoSelecionado?.id !== item.id) return;
        this.pecasDetalhesAgendamento = pecas;
        this.carregandoPecasDetalhes = false;
      },
      error: () => {
        if (this.agendamentoSelecionado?.id !== item.id) return;
        this.carregandoPecasDetalhes = false;
        this.erroPecasDetalhes = true;
      }
    });

    const el = document.getElementById('modalDetalhesAgendamento');

    if (!el) return;

    this.modalDetalhes = bootstrap.Modal.getOrCreateInstance(el);
    this.modalDetalhes.show();
  }

  observacoesDetalhesAgendamento(): string {
    const observacoes = this.agendamentoSelecionado?.observacoes || '';
    return this.pecasDetalhesAgendamento.length
      ? this.removerBlocoPecasDasObservacoes(observacoes)
      : observacoes.trim();
  }

  confirmar(item: Agendamento): void {
    if (!item.id) return;

    this.service.confirmar(item.id).subscribe({
      next: () => this.recarregar(),
      error: (erro) => this.notificacoes.erro(this.extrairMensagemErro(erro, 'Erro ao confirmar agendamento.'))
    });
  }

  iniciar(item: Agendamento): void {
    if (!item.id) return;

    this.service.iniciar(item.id).subscribe({
      next: () => this.recarregar(),
      error: (erro) => this.notificacoes.erro(this.extrairMensagemErro(erro, 'Erro ao iniciar agendamento.'))
    });
  }

  concluir(item: Agendamento): void {
    if (!item.id) return;

    this.service.concluir(item.id).subscribe({
      next: () => this.recarregar(),
      error: (erro) => this.notificacoes.erro(this.extrairMensagemErro(erro, 'Erro ao concluir agendamento.'))
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
      error: (erro) => this.notificacoes.erro(this.extrairMensagemErro(erro, 'Erro ao cancelar agendamento.'))
    });
  }

  excluir(item: Agendamento): void {
    this.abrirConfirmacaoAcao(item, 'excluir');
  }

  abrirConfirmacaoAcao(item: Agendamento, acao: AcaoConfirmacaoAgendamento): void {
    if (!item.id) return;

    this.agendamentoSelecionado = item;

    const rotulo = item.codigoAgendamento || `#${item.id}`;

    const configuracoes: Record<AcaoConfirmacaoAgendamento, Omit<ConfirmacaoAgendamento, 'acao' | 'item'>> = {
      confirmar: {
        titulo: 'Confirmar agendamento',
        mensagem: `Deseja confirmar o agendamento ${rotulo}?`,
        textoBotao: 'Confirmar',
        classeBotao: 'btn-success',
        icone: 'bi-check-circle'
      },
      iniciar: {
        titulo: 'Iniciar atendimento',
        mensagem: `Deseja iniciar o atendimento do agendamento ${rotulo}?`,
        textoBotao: 'Iniciar',
        classeBotao: 'btn-primary',
        icone: 'bi-play-circle'
      },
      concluir: {
        titulo: 'Concluir agendamento',
        mensagem: `Deseja marcar o agendamento ${rotulo} como concluído?`,
        textoBotao: 'Concluir',
        classeBotao: 'btn-success',
        icone: 'bi-flag'
      },
      naoCompareceu: {
        titulo: 'Registrar não comparecimento',
        mensagem: `Deseja registrar não comparecimento para o agendamento ${rotulo}?`,
        textoBotao: 'Registrar',
        classeBotao: 'btn-warning',
        icone: 'bi-person-x'
      },
      excluir: {
        titulo: 'Excluir agendamento',
        mensagem: `Deseja excluir definitivamente o agendamento ${rotulo}? Esta ação não poderá ser desfeita.`,
        textoBotao: 'Excluir',
        classeBotao: 'btn-danger',
        icone: 'bi-trash'
      }
    };

    this.acaoConfirmacao = {
      acao,
      item,
      ...configuracoes[acao]
    };

    const el = document.getElementById('modalConfirmacaoAgendamento');

    if (!el) return;

    this.modalConfirmacao = bootstrap.Modal.getOrCreateInstance(el);
    this.modalConfirmacao.show();
  }

  confirmarAcaoAgendamento(): void {
    if (!this.acaoConfirmacao?.item?.id) return;

    const id = this.acaoConfirmacao.item.id;
    const acao = this.acaoConfirmacao.acao;

    let request$: any;
    let mensagemErroPadrao = 'Erro ao executar ação do agendamento.';

    switch (acao) {
      case 'confirmar':
        request$ = this.service.confirmar(id);
        mensagemErroPadrao = 'Erro ao confirmar agendamento.';
        break;
      case 'iniciar':
        this.iniciarAgendamentoComAtendimento(this.acaoConfirmacao.item);
        return;
      case 'concluir':
        request$ = this.service.concluir(id);
        mensagemErroPadrao = 'Erro ao concluir agendamento.';
        break;
      case 'naoCompareceu':
        request$ = this.service.naoCompareceu(id);
        mensagemErroPadrao = 'Erro ao registrar não comparecimento.';
        break;
      case 'excluir':
        request$ = this.service.excluir(id);
        mensagemErroPadrao = 'Erro ao excluir agendamento.';
        break;
      default:
        return;
    }

    request$.subscribe({
      next: () => {
        this.modalConfirmacao?.hide();
        this.acaoConfirmacao = null;
        this.recarregar();
      },
      error: (erro: any) => {
        this.notificacoes.erro(this.extrairMensagemErro(erro, mensagemErroPadrao));
      }
    });
  }

  fecharModalConfirmacaoAcao(): void {
    this.modalConfirmacao?.hide();
    this.acaoConfirmacao = null;
  }

  podeConfirmar(item: Agendamento): boolean { return this.apoio.podeConfirmar(item); }

  podeIniciar(item: Agendamento): boolean { return this.apoio.podeIniciar(item); }

  podeConcluir(item: Agendamento): boolean { return this.apoio.podeConcluir(item); }

  podeCancelar(item: Agendamento): boolean { return this.apoio.podeCancelar(item); }

  podeMarcarNaoCompareceu(item: Agendamento): boolean { return this.apoio.podeMarcarNaoCompareceu(item); }

  formatarStatus(status?: string | null): string { return this.apoio.formatarStatus(status); }

  statusBadgeClass(status?: string | null): string { return this.apoio.statusBadgeClass(status); }

  formatarMoedaBR(valor: any): string { return this.apoio.formatarMoedaBR(valor); }

  formatarDataHora(valor?: string | null): string { return this.apoio.formatarDataHora(valor); }

  formatarCpf(cpf?: string | null): string { return this.apoio.formatarCpf(cpf); }

  formatarPlaca(placa?: string | null): string { return this.apoio.formatarPlaca(placa); }

  private quantidadeInteiraMinima(valor: any): number { return this.apoio.quantidadeInteiraMinima(valor); }

  private idClienteDoVeiculo(veiculo: VeiculoResumo): number | undefined { return this.apoio.idClienteDoVeiculo(veiculo); }

  private placaDoVeiculo(veiculo: VeiculoResumo): string { return this.apoio.placaDoVeiculo(veiculo); }

  private fabricanteDoVeiculo(veiculo: VeiculoResumo): string { return this.apoio.fabricanteDoVeiculo(veiculo); }

  private modeloDoVeiculo(veiculo: VeiculoResumo): string { return this.apoio.modeloDoVeiculo(veiculo); }

  private corDoVeiculo(veiculo: VeiculoResumo): string { return this.apoio.corDoVeiculo(veiculo); }

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

  private fornecimentoEstaAtivo(fornecimento: FornecimentoPecaResumo): boolean { return this.apoio.fornecimentoEstaAtivo(fornecimento); }

  private idPecaObjeto(objeto: any): number | undefined { return this.apoio.idPecaObjeto(objeto); }

  private idEstoquePecaObjeto(objeto: any): number | undefined { return this.apoio.idEstoquePecaObjeto(objeto); }

  private idFornecedorObjeto(objeto: any): number | undefined { return this.apoio.idFornecedorObjeto(objeto); }

  private nomeFornecedorObjeto(objeto: any): string { return this.apoio.nomeFornecedorObjeto(objeto); }

  private unidadePadraoPeca(peca: PecaResumo): string { return this.apoio.unidadePadraoPeca(peca); }

  private unidadePadraoFornecimentoPeca(fornecimento: FornecimentoPecaResumo): string { return this.apoio.unidadePadraoFornecimentoPeca(fornecimento); }

  private valorPadraoFornecimentoPeca(fornecimento: FornecimentoPecaResumo): any { return this.apoio.valorPadraoFornecimentoPeca(fornecimento); }

  private valorPadraoServico(servico: ServicoResumo): any { return this.apoio.valorPadraoServico(servico); }

  private duracaoServicoEmMinutos(servico: ServicoResumo): number { return this.apoio.duracaoServicoEmMinutos(servico); }

  private obterCampo(objeto: any, caminhos: string[]): any { return this.apoio.obterCampo(objeto, caminhos); }

  private textoCampo(objeto: any, caminhos: string[], padrao = ''): string { return this.apoio.textoCampo(objeto, caminhos, padrao); }

  private valorCampo(objeto: any, caminhos: string[], padrao: any = 0): any { return this.apoio.valorCampo(objeto, caminhos, padrao); }

  private moedaParaNumero(valor: any): number { return this.apoio.moedaParaNumero(valor); }

  converterMoedaOpcionalParaNumero(valor: any): string { return this.apoio.converterMoedaOpcionalParaNumero(valor); }

  limparOpcional(valor: any): string { return this.apoio.limparOpcional(valor); }

  private agoraInputDateTime(): string { return this.apoio.agoraInputDateTime(); }

  private paraDatetimeLocal(valor: string): string { return this.apoio.paraDatetimeLocal(valor); }

  private normalizar(valor: any): string { return this.apoio.normalizar(valor); }

  private onlyDigits(valor: any): string { return this.apoio.onlyDigits(valor); }

  private normalizarTipoAcesso(valor: any): string { return this.apoio.normalizarTipoAcesso(valor); }

  private extrairLista<T>(resposta: any): T[] { return this.apoio.extrairLista(resposta); }

  extrairMensagemErro(erro: any, mensagemPadrao: string): string { return this.apoio.extrairMensagemErro(erro, mensagemPadrao); }

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


  ordenarPor(coluna: ColunaOrdenacaoAgendamento): void {
    if (this.colunaOrdenacao === coluna) {
      this.direcaoOrdenacao = this.direcaoOrdenacao === 'asc' ? 'desc' : 'asc';
      this.carregarPagina();return;
    }

    this.colunaOrdenacao = coluna;
    this.direcaoOrdenacao = coluna === 'dataHoraInicio' ? 'desc' : 'asc';
  this.carregarPagina(); }

  iconeOrdenacao(coluna: ColunaOrdenacaoAgendamento): string {
    if (this.colunaOrdenacao !== coluna) {
      return 'bi-arrow-down-up';
    }

    return this.direcaoOrdenacao === 'asc' ? 'bi-sort-up' : 'bi-sort-down';
  }

  private ordenarAgendamentos(lista: Agendamento[]): Agendamento[] {
    return [...lista].sort((a, b) => {
      const valorA = this.valorOrdenacao(a, this.colunaOrdenacao);
      const valorB = this.valorOrdenacao(b, this.colunaOrdenacao);
      const resultado = this.compararValores(valorA, valorB);

      return this.direcaoOrdenacao === 'asc' ? resultado : resultado * -1;
    });
  }

  private valorOrdenacao(item: Agendamento, coluna: ColunaOrdenacaoAgendamento): string | number { return this.apoio.valorOrdenacao(item, coluna); }

  private compararValores(a: string | number, b: string | number): number { return this.apoio.compararValores(a, b); }

  aoAlterarFiltros(): void {
    this.paginaAtual = 1;
  this.carregarPagina(true); }

  limparFiltros(): void {
    this.filtro = '';
    this.filtroStatus = '';
    this.filtroPrioridade = '';
    this.statusFiltroAberto = false;
    this.paginaAtual = 1;
  this.carregarPagina(); }

  aoAlterarItensPorPagina(): void {
    this.itensPorPagina = Number(this.itensPorPagina) || 10;
    this.paginaAtual = 1;
    this.ajustarPaginaAtual();
  this.carregarPagina(); }

  irParaPagina(pagina: number): void {
    if (pagina < 1 || pagina > this.totalPaginas) {
      this.carregarPagina();return;
    }

    this.paginaAtual = pagina;
  this.carregarPagina(); }

  paginaAnterior(): void {
    if (this.paginaAtual > 1) {
      this.paginaAtual--;
    }
  this.carregarPagina(); }

  proximaPagina(): void {
    if (this.paginaAtual < this.totalPaginas) {
      this.paginaAtual++;
    }
  this.carregarPagina(); }

  primeiraPagina(): void {
    this.paginaAtual = 1;
  }

  ultimaPagina(): void {
    this.paginaAtual = this.totalPaginas;
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

  trackByAgendamento(index: number, item: Agendamento): number | string { return this.apoio.trackByAgendamento(index, item); }

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

  formatarTelefone(telefone: string | null | undefined): string { return this.apoio.formatarTelefone(telefone); }

  formatarFabricante(fabricante: string | null | undefined): string { return this.apoio.formatarFabricante(fabricante); }

  capitalizar(s: string | null | undefined): string { return this.apoio.capitalizar(s); }

  private iniciarAgendamentoComAtendimento(agendamento: any): void {
    const id = Number(agendamento?.id);

    if (!id) {
      this.mensagemErro = 'Agendamento inválido para iniciar atendimento.';
      return;
    }

    this.carregando = true;

    this.service.iniciar(id).subscribe({
      next: (resposta) => {
        this.carregando = false;

        this.mensagemSucesso =
          resposta?.mensagem ||
          'Agendamento iniciado com sucesso.';

        this.recarregar();

        const atendimentoId = resposta?.atendimento?.id;

        if (atendimentoId) {
          console.log(
            'Atendimento gerado automaticamente a partir do agendamento:',
            atendimentoId
          );
          this.router.navigate(
            [this.router.url.startsWith('/menuColaborador') ? '/menuColaborador/atendimento' : '/menuAdministrador/atendimento'],
            {
              queryParams: {
                atendimentoId
              }
            }
          );
        }

        this.fecharModalConfirmacaoAcao();
      },
      error: (erro) => {
        this.carregando = false;

        console.error('Erro ao iniciar agendamento:', erro);

        this.mensagemErro = this.extrairMensagemErro(
          erro,
          'Erro ao iniciar agendamento e gerar atendimento.'
        );
      }
    });
  }
}
