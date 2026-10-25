import { AtendimentoApoio } from './atendimento-apoio';
import { SeletorRemotoComponent } from '../../../shared/tabelas/seletor-remoto.component';
import { PaginacaoComponent } from '../../../shared/tabelas/paginacao.component';
import { ConsultaPaginadaService, PaginaCadastro } from '../../../shared/tabelas/consulta-paginada.service';
import { Subscription, tap } from 'rxjs';
import { DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { UnidadePecaPipe } from '../../../shared/forms/unidade-peca.pipe';
import { FieldHelpPanelComponent } from '../../../shared/field-help/field-help-panel.component';
import { FieldHelpDirective } from '../../../shared/field-help/field-help.directive';
import { podeAcessarEtapa } from '../../../shared/forms/etapas-cadastro';
import { inject as injectFeedback } from '@angular/core';
import { NotificacaoService } from '../../../shared/feedback/notificacao.service';
import { CommonModule, Location } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MovimentacaoEstoquePeca } from '../controle-estoque-pecas/controle-estoque-pecas.service';
import { Observable, from, catchError, forkJoin, of } from 'rxjs';
import { concatMap, map, toArray } from 'rxjs/operators';


import {
  AgendamentoResumo,
  Atendimento,
  AtendimentoCancelamentoRequest,
  AtendimentoPeca,
  AtendimentoPecaRequest,
  AtendimentoRequest,
  AtendimentoServicoExecutado,
  AtendimentoServicoExecutadoRequest,
  AtendimentoService,
  OrcamentoAtendimento,
  FornecedorResumo,
  PecaResumo,
  FornecimentoPecaResumo,
  ServicoResumo,
  UsuarioResumo
} from './atendimento.service';

declare var bootstrap: any;

type DirecaoOrdenacaoAtendimento = 'asc' | 'desc';
type ColunaOrdenacaoAtendimento =
  | 'codigoAtendimento'
  | 'nomeCliente'
  | 'placaVeiculo'
  | 'nomeServico'
  | 'statusAtendimento'
  | 'tipoExecucao'
  | 'valorTotal'
  | 'dataEntrada'
  | 'os';

@Component({
    selector: 'app-atendimento',
    imports: [SeletorRemotoComponent,PaginacaoComponent,UnidadePecaPipe, FieldHelpPanelComponent, FieldHelpDirective, CommonModule, FormsModule, RouterLink],
    templateUrl: './atendimento.component.html',
    styleUrl: './atendimento.component.css'
})
export class AtendimentoComponent implements OnInit {
  private readonly apoio = new AtendimentoApoio();
  atendimentoDevolucao: Atendimento | null = null;
  movimentosDevolucao: MovimentacaoEstoquePeca[] = [];
  saidaDevolucaoId: number | null = null;
  quantidadeDevolucao: number | null = null;
  motivoDevolucao = '';
  tratamentoCobrancaDevolucao = '';
  valorRestituicaoDevolucao: number | null = null;
  carregandoDevolucao = false;
  salvandoDevolucao = false;
  erroDevolucao = '';
  private modalDevolucao: any;

  podeDevolverPeca(item: Atendimento): boolean { return this.apoio.podeDevolverPeca(item); }

  abrirDevolucao(item: Atendimento): void {
    if (!item.id || !this.podeDevolverPeca(item)) return;
    this.atendimentoDevolucao = item; this.movimentosDevolucao = [];
    this.saidaDevolucaoId = null; this.quantidadeDevolucao = null; this.motivoDevolucao = '';
    this.tratamentoCobrancaDevolucao = ''; this.valorRestituicaoDevolucao = null; this.erroDevolucao = '';
    this.carregandoDevolucao = true;
    const el = document.getElementById('modalDevolucaoAtendimento');
    if (el) { this.modalDevolucao = bootstrap.Modal.getOrCreateInstance(el); this.modalDevolucao.show(); }
    if(this.modoPaginado){this.carregandoDevolucao=false;return;}
    this.service.listarDevolucoes(item.id).subscribe({
      next: lista => { if (this.atendimentoDevolucao?.id !== item.id) return; this.movimentosDevolucao = lista || []; this.carregandoDevolucao = false; },
      error: erro => { if (this.atendimentoDevolucao?.id !== item.id) return; this.carregandoDevolucao = false; this.erroDevolucao = this.extrairMensagemErro(erro, 'Não foi possível consultar as saídas deste atendimento.'); }
    });
  }

  get saidasDevolucaoAtendimento(): MovimentacaoEstoquePeca[] {
    return this.movimentosDevolucao.filter(m => m.tipoMovimento === 'SAIDA' && this.saldoDevolucaoAtendimento(m) > 0);
  }

  recursoDevolucoes():string{return 'atendimento/'+this.atendimentoDevolucao?.id+'/devolucoes';}
  selecionarSaidaDevolucao(saida:MovimentacaoEstoquePeca|null):void{this.movimentosDevolucao=saida?[saida]:[];this.quantidadeDevolucao=null;this.valorRestituicaoDevolucao=null;}

  saldoDevolucaoAtendimento(saida: MovimentacaoEstoquePeca): number { return this.apoio.saldoDevolucaoAtendimento(saida); }

  get saidaDevolucaoSelecionada(): MovimentacaoEstoquePeca | undefined {
    return this.saidasDevolucaoAtendimento.find(m => m.id === this.saidaDevolucaoId);
  }

  get custoDevolucaoAtendimento(): number | null {
    const saida = this.saidaDevolucaoSelecionada;
    const custo = saida?.custoUnitarioEstoque ?? saida?.custoMedioAtual;
    return custo == null ? null : Number(custo);
  }

  get restituicaoDevolucaoValida(): boolean {
    const valor = Number(this.valorRestituicaoDevolucao);
    return !!this.saidaDevolucaoSelecionada && Number.isFinite(valor) && valor > 0
      && valor <= Number(this.saidaDevolucaoSelecionada.valorUnitario || 0) * Number(this.quantidadeDevolucao);
  }
  get devolucaoAtendimentoValida(): boolean {
    const saida = this.saidaDevolucaoSelecionada;
    const quantidade = Number(this.quantidadeDevolucao);
    const valor = Number(this.valorRestituicaoDevolucao);
    return !!saida && quantidade > 0 && Number.isFinite(quantidade) && quantidade <= this.saldoDevolucaoAtendimento(saida)
      && this.custoDevolucaoAtendimento !== null && Number.isFinite(this.custoDevolucaoAtendimento) && this.custoDevolucaoAtendimento >= 0 && !!this.motivoDevolucao.trim()
      && ['SEM_RESTITUICAO', 'RESTITUICAO_PENDENTE'].includes(this.tratamentoCobrancaDevolucao)
      && (this.tratamentoCobrancaDevolucao !== 'RESTITUICAO_PENDENTE'
          || this.restituicaoDevolucaoValida);
  }

  confirmarDevolucaoAtendimento(): void {
    if (!this.devolucaoAtendimentoValida || this.salvandoDevolucao || !this.atendimentoDevolucao?.id || !this.saidaDevolucaoId) return;
    this.salvandoDevolucao = true; this.erroDevolucao = '';
    this.service.devolverPeca(this.atendimentoDevolucao.id, {
      idMovimentacaoOrigem: this.saidaDevolucaoId, quantidade: String(this.quantidadeDevolucao), motivo: this.motivoDevolucao.trim(),
      tratamentoCobranca: this.tratamentoCobrancaDevolucao,
      valorRestituicao: this.tratamentoCobrancaDevolucao === 'RESTITUICAO_PENDENTE' ? Number(this.valorRestituicaoDevolucao).toFixed(2) : '0'
    }).subscribe({
      next: () => { this.salvandoDevolucao = false; this.modalDevolucao?.hide(); this.notificacoes.sucesso('Devolução registrada com vínculo ao atendimento e à saída original.'); this.recarregar(); },
      error: erro => { this.salvandoDevolucao = false; this.erroDevolucao = this.extrairMensagemErro(erro, 'Não foi possível registrar a devolução.'); }
    });
  }
  private readonly notificacoes = injectFeedback(NotificacaoService);

  atendimentos: Atendimento[] = [];
  agendamentos: AgendamentoResumo[] = [];
  usuarios: UsuarioResumo[] = [];
  fornecedores: FornecedorResumo[] = [];
  pecasCatalogo: PecaResumo[] = [];
  servicosCatalogo: ServicoResumo[] = [];
  fornecimentosPecas: FornecimentoPecaResumo[] = [];
  pecasAtendimento: AtendimentoPeca[] = [];
  servicosAtendimento: AtendimentoServicoExecutado[] = [];

  pecasAtendimentoOriginais: AtendimentoPeca[] = [];
  servicosAtendimentoOriginais: AtendimentoServicoExecutado[] = [];
  pecasAtendimentoRemovidasIds: number[] = [];
  servicosAtendimentoRemovidosIds: number[] = [];
  pecasAtendimentoAlteradasIds: number[] = [];
  servicosAtendimentoAlteradosIds: number[] = [];

  pecasNovoAtendimento: AtendimentoPeca[] = [];
  servicosNovoAtendimento: AtendimentoServicoExecutado[] = [];

  novoAtendimento: Partial<Atendimento> = {};
  atendimentoSelecionado: Atendimento | null = null;
  orcamentosDoAtendimento: OrcamentoAtendimento[] = [];
  pecasDetalhesAtendimento: AtendimentoPeca[] = [];
  carregandoPecasDetalhes = false;

  pecaForm: Partial<AtendimentoPeca> = {};
  servicoForm: Partial<AtendimentoServicoExecutado> = {};

  filtro = '';
  filtroStatus = '';
  filtroTipoExecucao = '';

  paginaAtual = 1;
  itensPorPagina = 10;
  opcoesItensPorPagina = [5, 10, 20, 50];

  colunaOrdenacao: ColunaOrdenacaoAtendimento = 'dataEntrada';
  direcaoOrdenacao: DirecaoOrdenacaoAtendimento = 'desc';

  carregando = false;
  mensagemErro = '';

  mensagemErroModal = '';
  mensagemErroEdicao = '';
  carregandoModalEdicao = false;
  sincronizandoServicoPrincipal = false;
  edicaoItensAlterada = false;
  salvandoEdicaoAtendimento = false;
  etapaSalvamentoEdicao = '';

  abaNovoAtendimento: 'atendimento' | 'itens' | 'adicionais' = 'atendimento';
  abaEdicaoAtendimento: 'resumo' | 'pecas' | 'servicos' = 'resumo';

  modoItensAtendimento: 'novo' | 'existente' = 'existente';

  modalCadastro: any;
  modalConclusao: any;
  atendimentoConclusao: Atendimento | null = null;
  quilometragemSaidaConclusao: number | null = null;
  erroConclusao = '';
  concluindo = false;
  modalEdicao: any;
  modalPecas: any;
  modalServicos: any;
  modalDetalhes: any;
  modalCancelamento: any;

  editandoPecaId: number | null = null;
  editandoServicoId: number | null = null;

  private tempPecaId = -1;
  private tempServicoId = -1;

  motivoCancelamento = '';

  estoqueBaixado?: boolean;
  estoqueBaixadoEm?: string | null;

  readonly tiposExecucao = ['INTERNO', 'TERCEIRO', 'MISTO'];
  readonly statusAtendimentos = [
    'ABERTO',
    'EM_DIAGNOSTICO',
    'AGUARDANDO_APROVACAO',
    'APROVADO',
    'EM_EXECUCAO',
    'PAUSADO',
    'AGUARDANDO_TERCEIRO',
    'CONCLUIDO',
    'ENTREGUE',
    'CANCELADO'
  ];
  readonly statusItemServico = ['PENDENTE', 'EM_EXECUCAO', 'EXECUTADO', 'CANCELADO'];

  constructor(
    private service: AtendimentoService,
    private location: Location
  ) {}

  modoPaginado=false;
  private readonly destroyRef=injectFeedback(DestroyRef);
  private readonly consultaPaginada=injectFeedback(ConsultaPaginadaService);
  private paginaServidor?:PaginaCadastro<Atendimento>;
  private consultaPagina?:Subscription;
  private filtroTimer?:ReturnType<typeof setTimeout>;
  private consultarPagina():Observable<PaginaCadastro<Atendimento>> {
    return this.consultaPaginada.consultar<Atendimento>('atendimento',{pagina:this.paginaAtual-1,tamanho:this.itensPorPagina,busca:this.filtro,ordenar:({nomeCliente:'cliente.nome',placaVeiculo:'veiculoPlacaHistorica',nomeServico:'servico.nome',os:'codigoAtendimento'} as Record<string,string>)[this.colunaOrdenacao]??this.colunaOrdenacao,decrescente:this.direcaoOrdenacao==='desc',statusAtendimento:this.filtroStatus,tipoExecucao:this.filtroTipoExecucao}).pipe(tap(pagina=>this.paginaServidor=pagina));
  }
  private carregarPagina(esperar=false):void {
    if(!this.modoPaginado)return;
    clearTimeout(this.filtroTimer);
    if(esperar){this.filtroTimer=setTimeout(()=>this.carregarPagina(),250);return;}
    this.consultaPagina?.unsubscribe();this.carregando=true;this.mensagemErro='';
    this.consultaPagina=this.consultarPagina().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({next:pagina=>{
      this.atendimentos=pagina.content.map(item=>item);this.carregando=false;
      if(this.paginaAtual>Math.max(1,pagina.totalPages)){this.paginaAtual=Math.max(1,pagina.totalPages);this.carregarPagina();}
    },error:erro=>{this.carregando=false;this.mensagemErro=this.extrairMensagemErro(erro,'Não foi possível carregar a página.');}});
  }
  ngOnInit(): void {this.modoPaginado=true;this.destroyRef.onDestroy(()=>clearTimeout(this.filtroTimer));
    this.carregarTudo();
  }

  get atendimentosFiltrados(): Atendimento[] {if(this.modoPaginado)return this.atendimentos;
    const termo = this.normalizar(this.filtro);
    const status = String(this.filtroStatus || '').trim();
    const tipoExecucao = String(this.filtroTipoExecucao || '').trim();

    const filtrados = this.atendimentos.filter(item => {
      const statusOk = !status || item.statusAtendimento === status;
      const tipoOk = !tipoExecucao || item.tipoExecucao === tipoExecucao;

      const texto = this.normalizar([
        item.codigoAtendimento,
        item.codigoAgendamento,
        item.nomeCliente,
        item.cpfCliente,
        item.telefoneCliente,
        item.emailCliente,
        item.placaVeiculo,
        item.modeloVeiculo,
        item.fabricanteVeiculo,
        item.nomeServico,
        item.categoriaServico,
        item.razaoSocialFornecedor,
        item.nomeResponsavel,
        item.statusAtendimento,
        item.tipoExecucao,
        item.osEmailDestino
      ].join(' '));

      return statusOk && tipoOk && (!termo || texto.includes(termo));
    });

    return this.ordenarAtendimentos(filtrados);
  }

  get atendimentosPaginados(): Atendimento[] {if(this.modoPaginado)return this.atendimentos;
    this.ajustarPaginaAtual();

    const inicio = (this.paginaAtual - 1) * this.itensPorPagina;
    const fim = inicio + this.itensPorPagina;

    return this.atendimentosFiltrados.slice(inicio, fim);
  }

  get totalRegistrosFiltrados(): number {if(this.modoPaginado)return this.paginaServidor?.totalElements??0;
    return this.atendimentosFiltrados.length;
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

  get possuiFiltrosAplicados(): boolean {
    return !!(
      this.filtro.trim()
      || this.filtroStatus.trim()
      || this.filtroTipoExecucao.trim()
    );
  }

  get totalAbertos(): number {if(this.modoPaginado)return this.paginaServidor?.resumo['ABERTO']??0;
    return this.atendimentos.filter(a => a.statusAtendimento === 'ABERTO').length;
  }

  get totalCancelados(): number {if(this.modoPaginado)return this.paginaServidor?.resumo['CANCELADO']??0;
    return this.atendimentos.filter(a => a.statusAtendimento === 'CANCELADO').length;
  }

  get responsaveis(): UsuarioResumo[] {
    return this.usuarios.filter(usuario => {
      const tipo = this.normalizarTipoAcesso(usuario.tipo_do_acesso || usuario.tipoDoAcesso);
      return tipo === 'COLABORADOR' || tipo === 'ADMINISTRADOR';
    });
  }

  get totalAtendimentos(): number {if(this.modoPaginado)return this.paginaServidor?.resumo['total']??0;
    return this.atendimentos.length;
  }

  get totalEmExecucao(): number {if(this.modoPaginado)return this.paginaServidor?.resumo['EM_EXECUCAO']??0;
    return this.atendimentos.filter(a => a.statusAtendimento === 'EM_EXECUCAO').length;
  }

  get totalConcluidos(): number {if(this.modoPaginado)return this.paginaServidor?.resumo['CONCLUIDO']??0;
    return this.atendimentos.filter(a => a.statusAtendimento === 'CONCLUIDO').length;
  }

  get totalEntregues(): number {if(this.modoPaginado)return this.paginaServidor?.resumo['ENTREGUE']??0;
    return this.atendimentos.filter(a => a.statusAtendimento === 'ENTREGUE').length;
  }

  registrarCatalogo(campo:string,item:any):void {
    if(!item)return;
    const listas=this as unknown as Record<string,any[]>;
    listas[campo]=[...(listas[campo]||[]).filter(r=>Number(r.id)!==Number(item.id)),item];
    if(campo==='pecasCatalogo' && Object.prototype.hasOwnProperty.call(item,'fornecimentoPreferido')) {
      this.fornecimentosPecas=this.fornecimentosPecas.filter(r=>Number((r as any).peca?.id??(r as any).idPeca)!==Number(item.id));
      if(item.fornecimentoPreferido)this.fornecimentosPecas.push(item.fornecimentoPreferido);
    }
  }
  private catalogosCarregados=false;
  private carregandoCatalogos=false;
  carregarTudo(somenteCatalogos=false): void {
    if(this.modoPaginado&&!somenteCatalogos){this.carregarPagina();return;}
    if(somenteCatalogos && this.modoPaginado)return;
    if(somenteCatalogos){if(this.catalogosCarregados||this.carregandoCatalogos)return;this.carregandoCatalogos=true;}
  this.carregando = true;
  this.mensagemErro = '';

  forkJoin({
    atendimentos: somenteCatalogos?of(this.atendimentos):this.consultarPagina().pipe(map(pagina=>pagina.content)),
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
  }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
    next: (resposta) => {
        if(somenteCatalogos){this.catalogosCarregados=true;this.carregandoCatalogos=false;}
      this.atendimentos = resposta.atendimentos ?? [];
      this.agendamentos = resposta.agendamentos ?? [];
      this.usuarios = resposta.usuarios ?? [];
      this.fornecedores = resposta.fornecedores ?? [];
      this.pecasCatalogo = resposta.pecas ?? [];
      this.fornecimentosPecas = this.extrairLista<FornecimentoPecaResumo>(resposta.fornecimentosPecas);
      this.servicosCatalogo = resposta.servicos ?? [];
      this.ajustarPaginaAtual();
      this.carregando = false;

      console.log('Peças catálogo:', this.pecasCatalogo);
      console.log('Fornecimentos de peças:', this.fornecimentosPecas);
    },
    error: (erro) => {
        this.carregandoCatalogos=false;
      console.error(erro);
      this.mensagemErro = this.extrairMensagemErro(erro, 'Erro ao carregar atendimentos.');
      this.carregando = false;
    }
  });
}

  recarregar(): void {if(this.modoPaginado){this.carregarPagina();return;}
    this.carregando = true;

    this.service.listar().subscribe({
      next: (lista) => {
        this.atendimentos = lista ?? [];
        this.ajustarPaginaAtual();
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

  aoAlterarFiltros(): void {
    this.paginaAtual = 1;
  this.carregarPagina(true); }

  limparFiltros(): void {
    this.filtro = '';
    this.filtroStatus = '';
    this.filtroTipoExecucao = '';
    this.paginaAtual = 1;
  this.carregarPagina(); }

  aoAlterarItensPorPagina(): void {
    this.paginaAtual = 1;
    this.ajustarPaginaAtual();
  this.carregarPagina(); }

  irParaPagina(pagina: number): void {
    if (pagina < 1 || pagina > this.totalPaginas) {
      this.carregarPagina();return;
    }

    this.paginaAtual = pagina;
  this.carregarPagina(); }

  primeiraPagina(): void {
    this.irParaPagina(1);
  }

  paginaAnterior(): void {
    this.irParaPagina(this.paginaAtual - 1);
  this.carregarPagina(); }

  proximaPagina(): void {
    this.irParaPagina(this.paginaAtual + 1);
  this.carregarPagina(); }

  ultimaPagina(): void {
    this.irParaPagina(this.totalPaginas);
  }

  paginasVisiveis(): number[] {
    const total = this.totalPaginas;
    const atual = this.paginaAtual;
    const paginas: number[] = [];

    const inicio = Math.max(1, atual - 2);
    const fim = Math.min(total, atual + 2);

    for (let pagina = inicio; pagina <= fim; pagina++) {
      paginas.push(pagina);
    }

    return paginas;
  }

  ordenarPor(coluna: ColunaOrdenacaoAtendimento): void {
    if (this.colunaOrdenacao === coluna) {
      this.direcaoOrdenacao = this.direcaoOrdenacao === 'asc' ? 'desc' : 'asc';
    } else {
      this.colunaOrdenacao = coluna;
      this.direcaoOrdenacao = coluna === 'dataEntrada' || coluna === 'valorTotal' ? 'desc' : 'asc';
    }
  this.carregarPagina(); }

  iconeOrdenacao(coluna: ColunaOrdenacaoAtendimento): string {
    if (this.colunaOrdenacao !== coluna) {
      return 'bi-arrow-down-up';
    }

    return this.direcaoOrdenacao === 'asc' ? 'bi-sort-up' : 'bi-sort-down';
  }

  trackByAtendimento(index: number, item: Atendimento): number | string { return this.apoio.trackByAtendimento(index, item); }

  private ajustarPaginaAtual(): void {
    if (this.paginaAtual > this.totalPaginas) {
      this.paginaAtual = this.totalPaginas;
    }

    if (this.paginaAtual < 1) {
      this.paginaAtual = 1;
    }
  }

  private ordenarAtendimentos(lista: Atendimento[]): Atendimento[] {
    const direcao = this.direcaoOrdenacao === 'asc' ? 1 : -1;

    return [...lista].sort((a, b) => {
      const valorA = this.valorOrdenacaoAtendimento(a, this.colunaOrdenacao);
      const valorB = this.valorOrdenacaoAtendimento(b, this.colunaOrdenacao);

      if (typeof valorA === 'number' && typeof valorB === 'number') {
        return (valorA - valorB) * direcao;
      }

      return String(valorA).localeCompare(String(valorB), 'pt-BR', {
        numeric: true,
        sensitivity: 'base'
      }) * direcao;
    });
  }

  private valorOrdenacaoAtendimento(item: Atendimento, coluna: ColunaOrdenacaoAtendimento): string | number { return this.apoio.valorOrdenacaoAtendimento(item, coluna); }

  podeAcessarAbaCadastro(aba: 'atendimento' | 'itens' | 'adicionais'): boolean {
    const ordem: ('atendimento' | 'itens' | 'adicionais')[] = ['atendimento', 'itens', 'adicionais'];
    return podeAcessarEtapa(ordem, this.abaNovoAtendimento, aba, etapa => {
      switch (etapa) {
        case 'atendimento': return this.validarNovoAtendimento() === null;
        case 'itens': return true;
        case 'adicionais': return true;
      }
    });
  }

  get podeAvancarCadastro(): boolean {
    const ordem: ('atendimento' | 'itens' | 'adicionais')[] = ['atendimento', 'itens', 'adicionais'];
    const proxima = ordem[ordem.indexOf(this.abaNovoAtendimento) + 1];
    return !!proxima && this.podeAcessarAbaCadastro(proxima);
  }

  trocarAbaNovoAtendimento(aba: 'atendimento' | 'itens' | 'adicionais'): void {
    if (!this.podeAcessarAbaCadastro(aba)) return;
    this.abaNovoAtendimento = aba;
  }

  trocarAbaEdicaoAtendimento(aba: 'resumo' | 'pecas' | 'servicos'): void {
    this.abaEdicaoAtendimento = aba;
  }

  abrirModalCadastro(): void {
    if(this.modoPaginado)this.carregarTudo(true);
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
      this.notificacoes.sucesso('Atendimento cadastrado com sucesso.');
      this.recarregar();
      return;
    }

    forkJoin(requisicoes).subscribe({
      next: () => {
        this.modalCadastro?.hide();
        this.pecasNovoAtendimento = [];
        this.servicosNovoAtendimento = [];
        this.notificacoes.sucesso('Atendimento cadastrado com peças e serviços com sucesso.');
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


  abrirModalEdicao(item: Atendimento): void {
    if(this.modoPaginado)this.carregarTudo(true);
    if (!item.id) return;

    if (!this.podeEditarItensAtendimento(item)) {
      this.notificacoes.aviso('Os itens do atendimento só podem ser editados depois que o atendimento for iniciado e antes da aprovação.');
      return;
    }

    this.abaEdicaoAtendimento = 'resumo';
    this.mensagemErroEdicao = '';
    this.carregandoModalEdicao = true;
    this.sincronizandoServicoPrincipal = false;
    this.edicaoItensAlterada = false;
    this.salvandoEdicaoAtendimento = false;
    this.etapaSalvamentoEdicao = '';
    this.atendimentoSelecionado = item;
    this.pecasAtendimento = [];
    this.servicosAtendimento = [];
    this.pecasAtendimentoOriginais = [];
    this.servicosAtendimentoOriginais = [];
    this.pecasAtendimentoRemovidasIds = [];
    this.servicosAtendimentoRemovidosIds = [];
    this.pecasAtendimentoAlteradasIds = [];
    this.servicosAtendimentoAlteradosIds = [];
    this.resetarPecaForm();
    this.resetarServicoForm();

    const el = document.getElementById('modalEdicaoAtendimento');

    if (!el) {
      console.error('Modal modalEdicaoAtendimento não encontrado.');
      return;
    }

    this.modalEdicao = bootstrap.Modal.getOrCreateInstance(el, {
      backdrop: 'static',
      keyboard: false
    });
    this.modalEdicao.show();

    forkJoin({
      atendimento: this.service.buscarPorId(item.id),
      pecas: this.service.listarPecasAtendimento(item.id).pipe(catchError((erro) => {
        console.warn('Não foi possível carregar peças do atendimento:', erro);
        return of([] as AtendimentoPeca[]);
      })),
      servicos: this.service.listarServicosAtendimento(item.id).pipe(catchError((erro) => {
        console.warn('Não foi possível carregar serviços do atendimento:', erro);
        return of([] as AtendimentoServicoExecutado[]);
      }))
    }).subscribe({
      next: (resposta) => {
        this.atendimentoSelecionado = resposta.atendimento;

        const pecas = resposta.pecas ?? [];
        const servicos = resposta.servicos ?? [];

        this.pecasAtendimentoOriginais = this.clonarPecasAtendimento(pecas);
        this.servicosAtendimentoOriginais = this.clonarServicosAtendimento(servicos);

        this.pecasAtendimento = this.clonarPecasAtendimento(pecas);
        this.servicosAtendimento = this.clonarServicosAtendimento(servicos);

        this.pecasAtendimentoRemovidasIds = [];
        this.servicosAtendimentoRemovidosIds = [];
        this.pecasAtendimentoAlteradasIds = [];
        this.servicosAtendimentoAlteradosIds = [];
        this.edicaoItensAlterada = false;
        this.carregandoModalEdicao = false;

        this.garantirServicoPrincipalDoAtendimento();
        this.recalcularTotaisEdicaoAtendimento();
      },
      error: (erro) => {
        this.mensagemErroEdicao = this.extrairMensagemErro(erro, 'Erro ao carregar dados do atendimento para edição.');
        this.carregandoModalEdicao = false;
      }
    });
  }


  progressoEdicaoAtendimento(): number {
    return this.carregandoModalEdicao || !this.atendimentoSelecionado ? 0 : 100;
  }

  rotuloProgressoEdicaoAtendimento(): string {
    if (this.carregandoModalEdicao || !this.atendimentoSelecionado) {
      return 'Carregando dados do atendimento...';
    }

    if (this.haAlteracoesEdicaoItens()) {
      return 'Atendimento com alterações pendentes para salvar.';
    }

    return 'Atendimento pronto para edição.';
  }

  haAlteracoesEdicaoItens(): boolean {
    return this.edicaoItensAlterada;
  }

  quantidadeAlteracoesEdicaoItens(): number {
    const novasPecas = this.pecasAtendimento.filter(item => Number(item.id) < 0).length;
    const novosServicos = this.servicosAtendimento.filter(item => Number(item.id) < 0).length;

    return novasPecas
      + novosServicos
      + this.pecasAtendimentoRemovidasIds.length
      + this.servicosAtendimentoRemovidosIds.length;
  }

  textoBotaoSalvarPeca(): string {
    if (this.modoItensAtendimento === 'novo') {
      return this.editandoPecaId !== null ? 'Atualizar Peça' : 'Adicionar Peça';
    }

    return this.editandoPecaId !== null ? 'Atualizar na edição' : 'Adicionar à edição';
  }

  textoBotaoSalvarServico(): string {
    if (this.modoItensAtendimento === 'novo') {
      return this.editandoServicoId !== null ? 'Atualizar Serviço' : 'Adicionar Serviço';
    }

    return 'Adicionar à edição';
  }

  fecharModalEdicaoAtendimento(): void {
    if (this.salvandoEdicaoAtendimento) {
      return;
    }

    if (this.haAlteracoesEdicaoItens()) {
      const confirmar = confirm('Existem alterações não salvas em peças ou serviços. Deseja descartar as alterações?');

      if (!confirmar) {
        return;
      }
    }

    this.limparEstadoEdicaoAtendimento();
    this.modalEdicao?.hide();
  }

  salvarEdicaoAtendimento(): void {
    if(this.servicosPrincipaisEmConsulta.size){this.notificacoes.aviso('Aguarde a consulta do serviço principal antes de salvar.');return;}
    const atendimentoId = this.atendimentoSelecionado?.id;

    if (!atendimentoId) {
      return;
    }

    if (!this.podeEditarItensAtendimento(this.atendimentoSelecionado)) {
      this.notificacoes.aviso('As peças e os serviços só podem ser salvos após o atendimento ser iniciado e antes da aprovação.');
      return;
    }

    if (!this.haAlteracoesEdicaoItens()) {
      this.modalEdicao?.hide();
      return;
    }

    const erroValidacaoItens = this.validarItensEdicaoAntesDeSalvar();

    if (erroValidacaoItens) {
      this.mensagemErroEdicao = erroValidacaoItens;
      this.notificacoes.erro(erroValidacaoItens);
      return;
    }

    const requisicoes = this.montarRequisicoesSalvarEdicao(atendimentoId);

    if (requisicoes.length === 0) {
      this.edicaoItensAlterada = false;
      this.modalEdicao?.hide();
      return;
    }

    this.salvandoEdicaoAtendimento = true;
    this.etapaSalvamentoEdicao = 'Preparando gravação das alterações...';
    this.mensagemErroEdicao = '';

    from(requisicoes).pipe(
      concatMap((requisicao, indice) => {
        this.etapaSalvamentoEdicao = `Salvando alteração ${indice + 1} de ${requisicoes.length}...`;
        return requisicao;
      }),
      toArray()
    ).subscribe({
      next: () => {
        this.etapaSalvamentoEdicao = 'Atualizando dados do atendimento...';
        this.edicaoItensAlterada = false;
        this.pecasAtendimentoRemovidasIds = [];
        this.servicosAtendimentoRemovidosIds = [];
        this.pecasAtendimentoAlteradasIds = [];
        this.servicosAtendimentoAlteradosIds = [];
        this.salvandoEdicaoAtendimento = false;
        this.etapaSalvamentoEdicao = '';

        this.carregarPecasDoAtendimento(atendimentoId);
        this.carregarServicosDoAtendimento(atendimentoId);
        this.atualizarAtendimentoSelecionado(atendimentoId);
        this.recarregar();
        this.modalEdicao?.hide();
        this.notificacoes.sucesso('Edição do atendimento salva com sucesso.');
      },
      error: (erro) => {
        this.salvandoEdicaoAtendimento = false;
        this.etapaSalvamentoEdicao = '';
        this.mensagemErroEdicao = this.extrairMensagemErro(erro, 'Erro ao salvar alterações do atendimento.');
      }
    });
  }

  private montarRequisicoesSalvarEdicao(atendimentoId: number): Observable<any>[] {
    const requisicoes: Observable<any>[] = [];

    this.pecasAtendimentoRemovidasIds
      .filter(id => Number(id) > 0)
      .forEach(id => requisicoes.push(
        this.service.removerPecaAtendimento(atendimentoId, Number(id))
      ));

    this.servicosAtendimentoRemovidosIds
      .filter(id => Number(id) > 0)
      .forEach(id => requisicoes.push(
        this.service.removerServicoAtendimento(atendimentoId, Number(id))
      ));

    this.pecasAtendimento.forEach(item => {
      const payload = this.montarPayloadPecaSalva(item);
      const idItem = Number(item.id);

      if (idItem > 0 && this.pecasAtendimentoAlteradasIds.includes(idItem)) {
        requisicoes.push(this.service.atualizarPecaAtendimento(atendimentoId, idItem, payload));
      }

      if (!(idItem > 0)) {
        requisicoes.push(this.service.adicionarPecaAtendimento(atendimentoId, payload));
      }
    });

    this.servicosAtendimento.forEach(item => {
      const payload = this.montarPayloadServicoSalvo(item);
      const idItem = Number(item.id);

      if (idItem > 0 && this.servicosAtendimentoAlteradosIds.includes(idItem)) {
        requisicoes.push(this.service.atualizarServicoAtendimento(atendimentoId, idItem, payload));
      }

      if (!(idItem > 0)) {
        requisicoes.push(this.service.adicionarServicoAtendimento(atendimentoId, payload));
      }
    });

    return requisicoes;
  }

  private validarItensEdicaoAntesDeSalvar(): string | null {
    for (const item of this.pecasAtendimento) {
      const idItem = Number(item.id);

      if (idItem > 0 && this.pecasAtendimentoRemovidasIds.includes(idItem)) {
        continue;
      }

      const idPeca = Number(item.idPeca);
      const quantidade = this.moedaParaNumero(item.quantidade);

      if (!idPeca) {
        return 'Existe uma peça utilizada sem peça vinculada. Remova o item ou selecione uma peça válida.';
      }

      if (quantidade <= 0) {
        return `Informe uma quantidade maior que zero para a peça ${item.nomePeca || item.descricaoPeca || idPeca}.`;
      }
    }

    for (const item of this.servicosAtendimento) {
      const idItem = Number(item.id);

      if (idItem > 0 && this.servicosAtendimentoRemovidosIds.includes(idItem)) {
        continue;
      }

      const idServico = Number(item.idServico);
      const tipoExecucao = String(item.tipoExecucao || 'INTERNO').trim().toUpperCase();

      if (!idServico) {
        return 'Existe um serviço executado sem serviço vinculado. Remova o item ou selecione um serviço válido.';
      }

      if (!['INTERNO', 'TERCEIRO', 'MISTO'].includes(tipoExecucao)) {
        return `Tipo de execução inválido para o serviço ${item.nomeServico || idServico}.`;
      }

      if ((tipoExecucao === 'TERCEIRO' || tipoExecucao === 'MISTO') && !Number(item.idFornecedor)) {
        return `Informe o fornecedor para o serviço ${item.nomeServico || idServico}, pois o tipo de execução é ${tipoExecucao}.`;
      }
    }

    return null;
  }

  private limparEstadoEdicaoAtendimento(): void {
    this.pecasAtendimento = [];
    this.servicosAtendimento = [];
    this.pecasAtendimentoOriginais = [];
    this.servicosAtendimentoOriginais = [];
    this.pecasAtendimentoRemovidasIds = [];
    this.servicosAtendimentoRemovidosIds = [];
    this.pecasAtendimentoAlteradasIds = [];
    this.servicosAtendimentoAlteradosIds = [];
    this.edicaoItensAlterada = false;
    this.salvandoEdicaoAtendimento = false;
    this.etapaSalvamentoEdicao = '';
    this.mensagemErroEdicao = '';
    this.resetarPecaForm();
    this.resetarServicoForm();
  }

  abrirModalPecasEdicao(): void {
    if (!this.atendimentoSelecionado?.id) return;

    if (!this.podeEditarItensAtendimento(this.atendimentoSelecionado)) {
      this.notificacoes.aviso('As peças só podem ser alteradas depois que o atendimento for iniciado e antes da aprovação.');
      return;
    }

    this.modoItensAtendimento = 'existente';
    this.resetarPecaForm();

    const el = document.getElementById('modalPecasAtendimento');

    if (!el) return;

    this.modalPecas = bootstrap.Modal.getOrCreateInstance(el);
    this.modalPecas.show();
  }

  abrirModalEditarPecaEdicao(item: AtendimentoPeca): void {
    if (!this.atendimentoSelecionado?.id) return;

    if (!this.podeEditarItensAtendimento(this.atendimentoSelecionado)) {
      this.notificacoes.aviso('As peças só podem ser alteradas depois que o atendimento for iniciado e antes da aprovação.');
      return;
    }

    this.modoItensAtendimento = 'existente';
    this.editarPecaAtendimento(item);

    const el = document.getElementById('modalPecasAtendimento');

    if (!el) return;

    this.modalPecas = bootstrap.Modal.getOrCreateInstance(el);
    this.modalPecas.show();
  }

  abrirModalServicosEdicao(): void {
    if (!this.atendimentoSelecionado?.id) return;

    if (!this.podeEditarItensAtendimento(this.atendimentoSelecionado)) {
      this.notificacoes.aviso('Os serviços só podem ser alterados depois que o atendimento for iniciado e antes da aprovação.');
      return;
    }

    this.modoItensAtendimento = 'existente';
    this.resetarServicoForm();

    const el = document.getElementById('modalServicosAtendimento');

    if (!el) return;

    this.modalServicos = bootstrap.Modal.getOrCreateInstance(el);
    this.modalServicos.show();
  }

  abrirModalEditarServicoEdicao(item: AtendimentoServicoExecutado): void {
    if (!item) return;

    this.notificacoes.aviso('Em atendimentos já iniciados, serviços podem ser incluídos ou removidos. Para alterar um serviço, remova o item e adicione o serviço correto novamente.');
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
      next: (lista) => {
        const pecas = lista ?? [];
        this.pecasAtendimentoOriginais = this.clonarPecasAtendimento(pecas);
        this.pecasAtendimento = this.clonarPecasAtendimento(pecas);
        this.pecasAtendimentoRemovidasIds = [];
        this.pecasAtendimentoAlteradasIds = [];
        this.recalcularTotaisEdicaoAtendimento();
      },
      error: (erro) => this.notificacoes.erro(this.extrairMensagemErro(erro, 'Erro ao carregar peças do atendimento.'))
    });
  }

  private carregarServicosDoAtendimento(atendimentoId: number): void {
    this.service.listarServicosAtendimento(atendimentoId).subscribe({
      next: (lista) => {
        const servicos = lista ?? [];
        this.servicosAtendimentoOriginais = this.clonarServicosAtendimento(servicos);
        this.servicosAtendimento = this.clonarServicosAtendimento(servicos);
        this.servicosAtendimentoRemovidosIds = [];
        this.servicosAtendimentoAlteradosIds = [];
        this.garantirServicoPrincipalDoAtendimento();
        this.recalcularTotaisEdicaoAtendimento();
      },
      error: (erro) => this.notificacoes.erro(this.extrairMensagemErro(erro, 'Erro ao carregar serviços do atendimento.'))
    });
  }

  sincronizarServicoPrincipalDoAtendimento(): void {
    this.garantirServicoPrincipalDoAtendimento(true);
  }

  podeSincronizarServicoPrincipalDoAtendimento(): boolean {
    const atendimento = this.atendimentoSelecionado;

    if (!atendimento?.id || !atendimento.idServico) {
      return false;
    }

    if (!this.podeEditarItensAtendimento(atendimento)) {
      return false;
    }

    return !this.existeServicoPrincipalRegistrado(atendimento);
  }

  private garantirServicoPrincipalDoAtendimento(exibirMensagemErro = false): void {
    const atendimento = this.atendimentoSelecionado;

    if (!this.podeSincronizarServicoPrincipalDoAtendimento()) {
      return;
    }

    if (!atendimento?.id) {
      return;
    }

    if(this.modoPaginado && atendimento.idServico && !this.servicosCatalogo.some(item=>Number(item.id)===Number(atendimento.idServico))){
      if(this.servicosPrincipaisEmConsulta.has(Number(atendimento.idServico)))return;
      const idServico=Number(atendimento.idServico),idAtendimento=atendimento.id;
      this.servicosPrincipaisEmConsulta.add(idServico);
      this.consultaPaginada.registro<ServicoResumo>('servico',idServico).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next:servico=>{this.servicosPrincipaisEmConsulta.delete(idServico);this.registrarCatalogo('servicosCatalogo',servico);if(this.atendimentoSelecionado?.id===idAtendimento)this.garantirServicoPrincipalDoAtendimento(exibirMensagemErro);},
        error:()=>{this.servicosPrincipaisEmConsulta.delete(idServico);this.notificacoes.erro('Não foi possível consultar o valor do serviço principal. Atualize o atendimento para tentar novamente.');}
      });return;
    }

    const servicoVisual = this.montarServicoPrincipalVisualDoAtendimento(atendimento);

    if (!servicoVisual?.idServico) {
      if (exibirMensagemErro) {
        this.notificacoes.erro('Não foi possível montar o serviço principal do atendimento.');
      }

      return;
    }

    this.servicosAtendimento = [...this.servicosAtendimento, servicoVisual];
    this.registrarAlteracaoEdicaoItens();

    if (exibirMensagemErro) {
      this.notificacoes.aviso('Serviço principal do agendamento incluído na edição. Clique em Salvar edição para gravar no atendimento.');
    }
  }

  private readonly servicosPrincipaisEmConsulta=new Set<number>();

  private montarServicoPrincipalVisualDoAtendimento(
    atendimento: Atendimento
  ): AtendimentoServicoExecutado {
    const payload = this.montarPayloadServicoPrincipalDoAtendimento(atendimento);

    const servicoCatalogo = this.servicosCatalogo.find(servico =>
      Number(servico.id) === Number(atendimento.idServico)
    );

    const valorMaoObra = this.moedaParaNumero(payload.valorMaoObra);
    const valorTerceiro = this.moedaParaNumero(payload.valorTerceiro);
    const desconto = this.moedaParaNumero(payload.desconto);
    const quantidade = Math.max(this.moedaParaNumero(payload.quantidade) || 1, 0);
    const valorTotal = Math.max((quantidade * valorMaoObra) + valorTerceiro - desconto, 0);

    return {
      id: this.tempServicoId--,
      idAtendimento: atendimento.id,
      codigoAtendimento: atendimento.codigoAtendimento,
      idServico: payload.idServico ?? atendimento.idServico,
      nomeServico: atendimento.nomeServico || this.textoCampo(servicoCatalogo, ['nome', 'descricao'], 'Serviço principal'),
      descricaoServico: atendimento.nomeServico || this.textoCampo(servicoCatalogo, ['descricao', 'nome'], 'Serviço principal'),
      categoriaServico: atendimento.categoriaServico || this.textoCampo(servicoCatalogo, ['categoria'], ''),
      idResponsavel: payload.idResponsavel ?? atendimento.idResponsavel ?? null,
      nomeResponsavel: atendimento.nomeResponsavel || this.nomeResponsavelPorId(payload.idResponsavel),
      idFornecedor: payload.idFornecedor ?? null,
      razaoSocialFornecedor: payload.idFornecedor ? this.nomeFornecedorPorId(payload.idFornecedor) : '',
      tipoExecucao: payload.tipoExecucao || atendimento.tipoExecucao || 'INTERNO',
      quantidade: payload.quantidade || '1',
      unidadeCobranca: payload.unidadeCobranca || 'SERVICO',
      tempoExecucao: payload.tempoExecucao || null,
      unidadeTempo: payload.unidadeTempo || 'HORA',
      valorMaoObra,
      valorTerceiro,
      desconto,
      valorTotal,
      statusItem: payload.statusItem || 'EXECUTADO',
      observacoes: payload.observacoes || 'Serviço principal importado do agendamento.'
    };
  }

  private existeServicoPrincipalRegistrado(atendimento: Atendimento): boolean {
    const idServicoAtendimento = Number(atendimento.idServico);

    if (!idServicoAtendimento) {
      return true;
    }

    return this.servicosAtendimento.some(item =>
      Number(item.idServico) === idServicoAtendimento
      && this.normalizar(item.statusItem) !== 'cancelado'
    );
  }

  private montarPayloadServicoPrincipalDoAtendimento(
    atendimento: Atendimento
  ): AtendimentoServicoExecutadoRequest {
    const servicoCatalogo = this.servicosCatalogo.find(servico =>
      Number(servico.id) === Number(atendimento.idServico)
    );

    const tipoExecucao = atendimento.tipoExecucao || this.tipoExecucaoPadraoDoServico(servicoCatalogo);
    const tipoNormalizado = String(tipoExecucao || 'INTERNO').toUpperCase();

    const valorBaseCatalogo = servicoCatalogo
      ? this.moedaParaNumero(this.valorPadraoServico(servicoCatalogo))
      : 0;

    /*
     * Regra profissional:
     * o valor do serviço executado não deve ser reaproveitado do total do atendimento,
     * porque atendimento.valorMaoObra pode representar a soma de vários serviços.
     * Para o item do serviço, usamos o valor-base do cadastro do serviço.
     */
    const valorBase = valorBaseCatalogo;

    const valorTerceiro = tipoNormalizado === 'TERCEIRO'
      ? valorBase
      : 0;

    const valorMaoObra = tipoNormalizado === 'TERCEIRO'
      ? 0
      : valorBase;

    const idFornecedorServico = servicoCatalogo
      ? this.idFornecedorObjeto(servicoCatalogo)
      : undefined;

    const idFornecedor = tipoNormalizado === 'INTERNO'
      ? null
      : (atendimento.idFornecedor ?? idFornecedorServico ?? null);

    const unidadeCobranca = servicoCatalogo
      ? this.textoCampo(servicoCatalogo, ['unidadeCobranca', 'unidade_cobranca'], 'SERVICO')
      : 'SERVICO';

    const tempoExecucao = servicoCatalogo
      ? this.textoCampo(
          servicoCatalogo,
          ['duracaoEstimada', 'duracao_estimada', 'duracao', 'tempoExecucao', 'tempo_execucao', 'tempoEstimado', 'tempo_estimado'],
          ''
        )
      : '';

    const unidadeTempo = servicoCatalogo
      ? this.textoCampo(servicoCatalogo, ['unidadeDuracao', 'unidade_duracao', 'unidadeTempo', 'unidade_tempo'], 'HORA')
      : 'HORA';

    return {
      idServico: atendimento.idServico ? Number(atendimento.idServico) : null,
      idResponsavel: atendimento.idResponsavel ? Number(atendimento.idResponsavel) : null,
      idFornecedor,
      tipoExecucao: tipoNormalizado,
      quantidade: '1',
      unidadeCobranca,
      tempoExecucao,
      unidadeTempo,
      valorMaoObra: valorMaoObra.toFixed(2),
      valorTerceiro: valorTerceiro.toFixed(2),
      desconto: '0.00',
      statusItem: 'EXECUTADO',
      observacoes: atendimento.codigoAgendamento
        ? `Serviço principal importado do agendamento ${atendimento.codigoAgendamento}.`
        : 'Serviço principal importado do atendimento.'
    };
  }

  private tipoExecucaoPadraoDoServico(servico?: ServicoResumo): string { return this.apoio.tipoExecucaoPadraoDoServico(servico); }

  private atualizarAtendimentoSelecionado(atendimentoId: number): void {
    this.service.buscarPorId(atendimentoId).subscribe({
      next: (atendimento) => {
        this.atendimentoSelecionado = atendimento;

        const indice = this.atendimentos.findIndex(item => Number(item.id) === Number(atendimentoId));

        if (indice >= 0) {
          this.atendimentos[indice] = atendimento;
        }
      },
      error: (erro) => console.warn('Não foi possível atualizar resumo do atendimento:', erro)
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
      this.notificacoes.erro('Selecione uma peça.');
      return;
    }

    if (Number(this.pecaForm.quantidade || 0) <= 0) {
      this.notificacoes.erro('Informe uma quantidade maior que zero.');
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
      this.trocarAbaNovoAtendimento('itens');
      return;
    }

    if (!this.atendimentoSelecionado?.id) return;

    if (this.editandoPecaId !== null) {
      this.pecasAtendimento = this.pecasAtendimento.map(item =>
        item.id === this.editandoPecaId ? payloadVisual : item
      );

      if (Number(this.editandoPecaId) > 0 && !this.pecasAtendimentoAlteradasIds.includes(Number(this.editandoPecaId))) {
        this.pecasAtendimentoAlteradasIds.push(Number(this.editandoPecaId));
      }
    } else {
      this.pecasAtendimento = [...this.pecasAtendimento, payloadVisual];
    }

    this.registrarAlteracaoEdicaoItens();
    this.modalPecas?.hide();
    this.resetarPecaForm();
    this.abaEdicaoAtendimento = 'pecas';
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

private idPecaObjeto(objeto: any): number | undefined { return this.apoio.idPecaObjeto(objeto); }

private fornecimentoEstaAtivo(fornecimento: FornecimentoPecaResumo): boolean { return this.apoio.fornecimentoEstaAtivo(fornecimento); }

private unidadePadraoFornecimentoPeca(
  fornecimento: FornecimentoPecaResumo
): string { return this.apoio.unidadePadraoFornecimentoPeca(fornecimento); }

private valorPadraoFornecimentoPeca(
  fornecimento: FornecimentoPecaResumo
): any { return this.apoio.valorPadraoFornecimentoPeca(fornecimento); }

private extrairLista<T>(resposta: any): T[] { return this.apoio.extrairLista(resposta); }

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

    if (Number(item.id) > 0 && !this.pecasAtendimentoRemovidasIds.includes(Number(item.id))) {
      this.pecasAtendimentoRemovidasIds.push(Number(item.id));
    }

    this.pecasAtendimentoAlteradasIds = this.pecasAtendimentoAlteradasIds.filter(id => id !== Number(item.id));
    this.pecasAtendimento = this.pecasAtendimento.filter(p => p.id !== item.id);
    this.registrarAlteracaoEdicaoItens();
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

    if (this.modoItensAtendimento === 'existente') {
      this.servicoForm.quantidade = '1';
      this.servicoForm.statusItem = 'EXECUTADO';

      if (this.atendimentoSelecionado?.idResponsavel) {
        this.servicoForm.idResponsavel = Number(this.atendimentoSelecionado.idResponsavel);
      }
    }

    this.recalcularTotalServicoForm();
  }

  aoAlterarTipoExecucaoServico(): void {
    if (this.modoItensAtendimento === 'existente') {
      this.recalcularTotalServicoForm();
      return;
    }

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
    const quantidade = Math.max(this.moedaParaNumero(this.servicoForm.quantidade) || 1, 0);
    const maoObra = this.moedaParaNumero(this.servicoForm.valorMaoObra);
    const terceiro = this.moedaParaNumero(this.servicoForm.valorTerceiro);
    const desconto = this.moedaParaNumero(this.servicoForm.desconto);

    const total = Math.max((quantidade * maoObra) + terceiro - desconto, 0);

    this.servicoForm.valorTotal = this.formatarMoedaBR(total);
  }

  formatarValoresServicoForm(): void {
    this.servicoForm.valorMaoObra = this.formatarMoedaBR(this.servicoForm.valorMaoObra);
    this.servicoForm.valorTerceiro = this.formatarMoedaBR(this.servicoForm.valorTerceiro);
    this.servicoForm.desconto = this.formatarMoedaBR(this.servicoForm.desconto);

    this.recalcularTotalServicoForm();
  }

  salvarServicoAtendimento(): void {
    if (this.modoItensAtendimento === 'existente' && this.editandoServicoId !== null) {
      this.notificacoes.aviso('Para alterar um serviço executado, remova o item atual e adicione o serviço correto novamente.');
      return;
    }

    if (!this.servicoForm.idServico) {
      this.notificacoes.erro('Selecione um serviço.');
      return;
    }

    if (Number(this.servicoForm.quantidade || 0) <= 0) {
      this.notificacoes.erro('Informe uma quantidade maior que zero.');
      return;
    }

    const tipo = this.servicoForm.tipoExecucao || 'INTERNO';

    if (this.modoItensAtendimento === 'existente') {
      this.servicoForm.quantidade = '1';
      this.servicoForm.statusItem = 'EXECUTADO';
      this.recalcularTotalServicoForm();
    }

    if ((tipo === 'TERCEIRO' || tipo === 'MISTO') && !this.servicoForm.idFornecedor) {
      this.notificacoes.erro('Selecione um fornecedor para serviço terceiro ou misto.');
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
      this.trocarAbaNovoAtendimento('itens');
      return;
    }

    if (!this.atendimentoSelecionado?.id) return;

    if (this.editandoServicoId !== null) {
      this.servicosAtendimento = this.servicosAtendimento.map(item =>
        item.id === this.editandoServicoId ? payloadVisual : item
      );

      if (Number(this.editandoServicoId) > 0 && !this.servicosAtendimentoAlteradosIds.includes(Number(this.editandoServicoId))) {
        this.servicosAtendimentoAlteradosIds.push(Number(this.editandoServicoId));
      }
    } else {
      this.servicosAtendimento = [...this.servicosAtendimento, payloadVisual];
    }

    this.registrarAlteracaoEdicaoItens();
    this.modalServicos?.hide();
    this.resetarServicoForm();
    this.abaEdicaoAtendimento = 'servicos';
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

    if (Number(item.id) > 0 && !this.servicosAtendimentoRemovidosIds.includes(Number(item.id))) {
      this.servicosAtendimentoRemovidosIds.push(Number(item.id));
    }

    this.servicosAtendimentoAlteradosIds = this.servicosAtendimentoAlteradosIds.filter(id => id !== Number(item.id));
    this.servicosAtendimento = this.servicosAtendimento.filter(s => s.id !== item.id);
    this.registrarAlteracaoEdicaoItens();
  }

  abrirDetalhes(item: Atendimento): void {
    this.atendimentoSelecionado = item;
    this.orcamentosDoAtendimento = [];
    this.pecasDetalhesAtendimento = [];
    this.carregandoPecasDetalhes = !!item.id;
    if (item.id) this.service.listarOrcamentos(item.id).subscribe({
      next: versoes => this.orcamentosDoAtendimento = versoes,
      error: () => this.notificacoes.erro('Não foi possível consultar as versões do orçamento.')
    });
    if (item.id) this.service.listarPecasAtendimento(item.id).subscribe({
      next: pecas => { if (this.atendimentoSelecionado?.id === item.id) { this.pecasDetalhesAtendimento = pecas; this.carregandoPecasDetalhes = false; } },
      error: () => { if (this.atendimentoSelecionado?.id === item.id) { this.carregandoPecasDetalhes = false; this.notificacoes.erro('Não foi possível consultar as peças do atendimento.'); } }
    });

    const el = document.getElementById('modalDetalhesAtendimento');

    if (!el) return;

    this.modalDetalhes = bootstrap.Modal.getOrCreateInstance(el);
    this.modalDetalhes.show();
  }

  observacoesDetalhesAtendimento(): string {
    const observacoes = this.atendimentoSelecionado?.observacoesInternas?.trim() || '';
    if (!this.pecasDetalhesAtendimento.length) return observacoes;
    return observacoes.split('[PEÇAS PREVISTAS NO AGENDAMENTO]')[0].trim();
  }

  iniciar(item: Atendimento): void {
    if (!item.id) return;

    this.service.iniciar(item.id).subscribe({
      next: () => this.recarregar(),
      error: (erro) => this.notificacoes.erro(this.extrairMensagemErro(erro, 'Erro ao iniciar atendimento.'))
    });
  }

  diagnosticar(item: Atendimento): void {
    if (!item.id || item.statusAtendimento !== 'ABERTO') return;
    this.service.diagnosticar(item.id).subscribe({
      next: () => this.recarregar(),
      error: erro => this.notificacoes.erro(this.extrairMensagemErro(erro, 'Erro ao iniciar o diagnóstico.'))
    });
  }

  solicitarAprovacao(item: Atendimento): void {
    if (!item.id || item.statusAtendimento !== 'EM_DIAGNOSTICO') return;
    this.service.solicitarAprovacao(item.id).subscribe({
      next: () => this.recarregar(),
      error: erro => this.notificacoes.erro(this.extrairMensagemErro(erro, 'Registre o diagnóstico antes de solicitar aprovação.'))
    });
  }

  revisarOrcamento(item: Atendimento): void {
    if (!item.id || !confirm('Reabrir o diagnóstico? O aceite anterior deixará de valer e uma nova versão deverá ser enviada ao cliente.')) return;
    this.service.revisarOrcamento(item.id).subscribe({
      next: () => this.recarregar(),
      error: erro => this.notificacoes.erro(this.extrairMensagemErro(erro, 'Não foi possível revisar o orçamento.'))
    });
  }

  concluir(item: Atendimento): void {
    if (!item.id) return;
    this.atendimentoConclusao = item;
    this.quilometragemSaidaConclusao = item.quilometragemSaida ?? null;
    this.erroConclusao = '';
    const el = document.getElementById('modalConclusaoAtendimento');
    if (!el) return;
    this.modalConclusao = bootstrap.Modal.getOrCreateInstance(el, { backdrop: 'static', keyboard: false });
    this.modalConclusao.show();
  }

  confirmarConclusao(): void {
    if (!this.atendimentoConclusao?.id || this.concluindo) return;
    const km = this.quilometragemSaidaConclusao;
    const entrada = this.atendimentoConclusao.quilometragemEntrada;
    if (km == null || !Number.isInteger(km) || km < 0 || km > 2147483647) {
      this.erroConclusao = 'Informe uma quilometragem de saída válida, em quilômetros inteiros.';
      return;
    }
    if (entrada != null && km < entrada) {
      this.erroConclusao = 'A quilometragem de saída não pode ser menor que a quilometragem de entrada.';
      return;
    }
    this.concluindo = true; this.erroConclusao = '';
    this.service.concluir(this.atendimentoConclusao.id, km).subscribe({
      next: () => { this.concluindo = false; this.modalConclusao?.hide(); this.recarregar(); },
      error: (erro) => { this.concluindo = false; this.erroConclusao = this.extrairMensagemErro(erro, 'Erro ao concluir atendimento.'); }
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
          this.notificacoes.sucesso(
            'Veículo entregue com sucesso.\n\n' +
            `A Ordem de Serviço foi enviada para: ${retorno.osEmailDestino || 'e-mail do cliente'}`
          );
        } else {
          this.notificacoes.aviso(
            'Veículo entregue com sucesso.\n\n' +
            'Atenção: a Ordem de Serviço não foi enviada por e-mail.\n\n' +
            `Motivo: ${retorno.osUltimoErro || 'Não informado.'}`
          );
        }

        this.recarregar();
      },
      error: (erro) => this.notificacoes.erro(this.extrairMensagemErro(erro, 'Erro ao entregar veículo.'))
    });
  }

  marcarProntoRetirada(item: Atendimento): void {
    if (!item.id || item.statusAtendimento !== 'CONCLUIDO' || item.prontoRetiradaEm) return;
    if (!confirm('Confirma que o veículo está pronto para retirada?')) return;
    this.service.marcarProntoRetirada(item.id).subscribe({
      next: () => { this.notificacoes.sucesso('Veículo marcado como pronto para retirada.'); this.recarregar(); },
      error: erro => this.notificacoes.erro(this.extrairMensagemErro(erro, 'Não foi possível marcar o veículo como pronto.'))
    });
  }

  reenviarOsEmail(item: Atendimento): void {
    if (!item.id) return;

    this.service.reenviarOrdemServicoEmail(item.id).subscribe({
      next: (retorno) => {
        if (retorno.osEnviadaEmail) {
          this.notificacoes.sucesso(`Ordem de Serviço reenviada para: ${retorno.osEmailDestino || 'e-mail do cliente'}`);
        } else {
          this.notificacoes.erro(`Não foi possível reenviar a OS.\n\n${retorno.osUltimoErro || ''}`);
        }

        this.recarregar();
      },
      error: (erro) => this.notificacoes.erro(this.extrairMensagemErro(erro, 'Erro ao reenviar OS por e-mail.'))
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
      error: (erro) => this.notificacoes.erro(this.extrairMensagemErro(erro, 'Erro ao cancelar atendimento.'))
    });
  }

  podeGerenciarItens(item: Atendimento): boolean { return this.apoio.podeGerenciarItens(item); }

  podeEditarItensAtendimento(item?: Atendimento | null): boolean { return this.apoio.podeEditarItensAtendimento(item); }

  podeIniciar(item: Atendimento): boolean { return this.apoio.podeIniciar(item); }

  podeAprovar(item: Atendimento): boolean { return this.apoio.podeAprovar(item); }

  podeConcluir(item: Atendimento): boolean { return this.apoio.podeConcluir(item); }

  podeEntregar(item: Atendimento): boolean { return this.apoio.podeEntregar(item); }

  podeCancelar(item: Atendimento): boolean { return this.apoio.podeCancelar(item); }

  podeReenviarOsEmail(item: Atendimento): boolean { return this.apoio.podeReenviarOsEmail(item); }

  formatarStatus(status?: string | null): string { return this.apoio.formatarStatus(status); }

  statusBadgeClass(status?: string | null): string { return this.apoio.statusBadgeClass(status); }

  formatarTipoExecucao(tipo?: string | null): string { return this.apoio.formatarTipoExecucao(tipo); }

  tipoExecucaoBadgeClass(tipo?: string | null): string { return this.apoio.tipoExecucaoBadgeClass(tipo); }

  formatarStatusOs(item: Atendimento): string { return this.apoio.formatarStatusOs(item); }

  osBadgeClass(item: Atendimento): string { return this.apoio.osBadgeClass(item); }

  formatarMoedaBR(valor: any): string { return this.apoio.formatarMoedaBR(valor); }

  formatarDataHora(valor?: string | null): string { return this.apoio.formatarDataHora(valor); }

  formatarCpf(cpf?: string | null): string { return this.apoio.formatarCpf(cpf); }

  formatarPlaca(placa?: string | null): string { return this.apoio.formatarPlaca(placa); }

  limparOpcional(valor: any): string { return this.apoio.limparOpcional(valor); }

  converterMoedaOpcionalParaNumero(valor: any): string { return this.apoio.converterMoedaOpcionalParaNumero(valor); }

  formatarDescontoNovoAtendimento(): void {
    this.novoAtendimento.desconto = this.formatarMoedaBR(this.novoAtendimento.desconto);
    this.recalcularTotaisNovoAtendimento();
  }


  private clonarPecasAtendimento(pecas: AtendimentoPeca[]): AtendimentoPeca[] { return this.apoio.clonarPecasAtendimento(pecas); }

  private clonarServicosAtendimento(servicos: AtendimentoServicoExecutado[]): AtendimentoServicoExecutado[] { return this.apoio.clonarServicosAtendimento(servicos); }

  private registrarAlteracaoEdicaoItens(): void {
    this.edicaoItensAlterada = true;
    this.recalcularTotaisEdicaoAtendimento();
  }

  private recalcularTotaisEdicaoAtendimento(): void {
    if (!this.atendimentoSelecionado) {
      return;
    }

    const valorPecas = this.pecasAtendimento.reduce((total, item) => {
      return total + this.moedaParaNumero(item.valorTotal);
    }, 0);

    const valorMaoObra = this.servicosAtendimento.reduce((total, item) => {
      if (this.normalizar(item.statusItem) === 'cancelado') return total;
      const quantidade = Math.max(this.moedaParaNumero(item.quantidade) || 1, 0);
      return total + (quantidade * this.moedaParaNumero(item.valorMaoObra));
    }, 0);

    const valorTerceiros = this.servicosAtendimento.reduce((total, item) => {
      if (this.normalizar(item.statusItem) === 'cancelado') return total;
      return total + this.moedaParaNumero(item.valorTerceiro);
    }, 0);

    const desconto = this.moedaParaNumero(this.atendimentoSelecionado.desconto);
    const total = Math.max(valorPecas + valorMaoObra + valorTerceiros - desconto, 0);

    this.atendimentoSelecionado.valorPecas = this.formatarMoedaBR(valorPecas);
    this.atendimentoSelecionado.valorMaoObra = this.formatarMoedaBR(valorMaoObra);
    this.atendimentoSelecionado.valorTerceiros = this.formatarMoedaBR(valorTerceiros);
    this.atendimentoSelecionado.valorTotal = this.formatarMoedaBR(total);
  }

  private moedaParaNumero(valor: any): number { return this.apoio.moedaParaNumero(valor); }

  private numeroDetectavel(valor: any): number | null { return this.apoio.numeroDetectavel(valor); }

  private recalcularTotaisNovoAtendimento(): void {
    const valorPecas = this.pecasNovoAtendimento.reduce((total, item) => {
      return total + this.moedaParaNumero(item.valorTotal);
    }, 0);

    const valorMaoObra = this.servicosNovoAtendimento.reduce((total, item) => {
      if (item.statusItem === 'CANCELADO') return total;
      const quantidade = Math.max(this.moedaParaNumero(item.quantidade) || 1, 0);
      return total + (quantidade * this.moedaParaNumero(item.valorMaoObra));
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

  private montarPayload(dados: Partial<Atendimento>): AtendimentoRequest { return this.apoio.montarPayload(dados); }

  private montarPayloadPecaSalva(item: AtendimentoPeca): AtendimentoPecaRequest { return this.apoio.montarPayloadPecaSalva(item); }

  private montarPayloadServicoSalvo(item: AtendimentoServicoExecutado): AtendimentoServicoExecutadoRequest {
    const servicoCatalogo = this.servicosCatalogo.find(servico =>
      Number(servico.id) === Number(item.idServico)
    );

    const tipoExecucao = String(
      item.tipoExecucao || this.tipoExecucaoPadraoDoServico(servicoCatalogo) || 'INTERNO'
    ).trim().toUpperCase();

    const idFornecedorCatalogo = servicoCatalogo
      ? this.idFornecedorObjeto(servicoCatalogo)
      : undefined;

    let idFornecedor: number | null = item.idFornecedor
      ? Number(item.idFornecedor)
      : (idFornecedorCatalogo ? Number(idFornecedorCatalogo) : null);

    if (tipoExecucao === 'INTERNO') {
      idFornecedor = null;
    }

    /*
     * Regra profissional:
     * valores não são editados no atendimento. Ao salvar, enviamos o valor do catálogo
     * apenas como apoio de compatibilidade; o backend também deve recalcular pelo cadastro.
     */
    const valorMaoObraCatalogo = servicoCatalogo
      ? this.moedaParaNumero(this.valorPadraoServico(servicoCatalogo))
      : 0;

    const valorMaoObra = tipoExecucao === 'TERCEIRO'
      ? 0
      : valorMaoObraCatalogo;

    const valorTerceiro = tipoExecucao === 'TERCEIRO'
      ? valorMaoObraCatalogo
      : 0;

    return {
      idServico: item.idServico ? Number(item.idServico) : null,
      idResponsavel: item.idResponsavel ? Number(item.idResponsavel) : null,
      idFornecedor,

      tipoExecucao,

      quantidade: '1',
      unidadeCobranca: this.limparOpcional(item.unidadeCobranca) || 'SERVICO',

      tempoExecucao: item.tempoExecucao ? String(item.tempoExecucao) : '',
      unidadeTempo: this.limparOpcional(item.unidadeTempo),

      valorMaoObra: valorMaoObra.toFixed(2),
      valorTerceiro: valorTerceiro.toFixed(2),
      desconto: '0.00',

      statusItem: 'EXECUTADO',
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

  private unidadePadraoPeca(peca: PecaResumo): string { return this.apoio.unidadePadraoPeca(peca); }

  private valorPadraoPeca(peca: PecaResumo): any { return this.apoio.valorPadraoPeca(peca); }

  private valorPadraoServico(servico: ServicoResumo): any { return this.apoio.valorPadraoServico(servico); }

  private obterCampo(objeto: any, caminhos: string[]): any { return this.apoio.obterCampo(objeto, caminhos); }

  private textoCampo(objeto: any, caminhos: string[], padrao: string = ''): string { return this.apoio.textoCampo(objeto, caminhos, padrao); }

  private valorCampo(objeto: any, caminhos: string[], padrao: any = 0): any { return this.apoio.valorCampo(objeto, caminhos, padrao); }

  private idFornecedorObjeto(objeto: any): number | undefined { return this.apoio.idFornecedorObjeto(objeto); }

  private nomeFornecedorObjeto(objeto: any): string { return this.apoio.nomeFornecedorObjeto(objeto); }

  private campoPorPadraoNumero(
    objeto: any,
    gruposObrigatorios: string[][],
    proibidos: string[] = []
  ): number | null { return this.apoio.campoPorPadraoNumero(objeto, gruposObrigatorios, proibidos); }

  private normalizarChaveCampo(valor: string): string { return this.apoio.normalizarChaveCampo(valor); }

  private agoraInputDateTime(): string { return this.apoio.agoraInputDateTime(); }

  private paraDatetimeLocal(valor: string): string { return this.apoio.paraDatetimeLocal(valor); }

  private normalizar(valor: any): string { return this.apoio.normalizar(valor); }

  private normalizarTipoAcesso(valor: any): string { return this.apoio.normalizarTipoAcesso(valor); }

  private valorPrimeiro(...valores: any[]): any { return this.apoio.valorPrimeiro(...valores); }

  extrairMensagemErro(erro: any, mensagemPadrao: string): string { return this.apoio.extrairMensagemErro(erro, mensagemPadrao); }
}
