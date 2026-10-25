import { ControleEstoquePecasApoio } from './controle-estoque-pecas-apoio';
import { SelecaoCadastroComponent } from '../../../shared/tabelas/selecao-cadastro.component';
import { SeletorRemotoComponent } from '../../../shared/tabelas/seletor-remoto.component';
import { PaginacaoComponent } from '../../../shared/tabelas/paginacao.component';
import { ConsultaPaginadaService, PaginaCadastro } from '../../../shared/tabelas/consulta-paginada.service';
import { Subscription } from 'rxjs';
import { EstadoDuplicidade, ValidarDuplicidadeDirective } from '../../../shared/duplicidade/validar-duplicidade.directive';
import { UnidadePecaPipe, formatarUnidadePeca } from '../../../shared/forms/unidade-peca.pipe';
import { podeAcessarEtapa } from '../../../shared/forms/etapas-cadastro';
import { FeedbackDirective } from '../../../shared/feedback/feedback.directive';
import { inject as injectFeedback } from '@angular/core';
import { NotificacaoService } from '../../../shared/feedback/notificacao.service';
import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FieldHelpDirective } from '../../../shared/field-help/field-help.directive';
import { FieldHelpPanelComponent } from '../../../shared/field-help/field-help-panel.component';
import { ActivatedRoute, Router } from '@angular/router';
import { DestroyRef } from '@angular/core';
import { forkJoin, of, map, catchError, throwError } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FluxoEstoqueService } from '../../../shared/fornecedores/fluxo-estoque.service';
import { aposFecharModal } from '../../../shared/fornecedores/transicao-modal';
import { PecaComponent } from '../peca/peca.component';
import { Peca } from '../peca/peca.service';

import {
  AlertaEstoquePeca,
  EstoquePeca,
  EstoquePecaRequest,
  ControleEstoquePecasService,
  LocalEstoque,
  LocalEstoqueRequest,
  MovimentacaoEstoquePeca,
  MovimentacaoEstoquePecaRequest,
  PecaResumo
} from './controle-estoque-pecas.service';

declare var bootstrap: any;

type ModoSelecaoPeca = 'cadastro' | 'edicao';
type TipoMovimentacaoTela = 'ENTRADA' | 'SAIDA' | 'AJUSTE_ENTRADA' | 'AJUSTE_SAIDA';
type AbaEstoque = 'identificacao' | 'quantidades' | 'reposicao' | 'revisao';
type DirecaoOrdenacao = 'asc' | 'desc';
type ColunaOrdenacaoEstoque =
  | 'nomePeca'
  | 'fabricantePeca'
  | 'nomeLocalEstoque'
  | 'quantidadeAtual'
  | 'quantidadeReservada'
  | 'estoqueMinimo'
  | 'custoMedio'
  | 'localizacaoFisica'
  | 'statusEstoque';
type OrigemModalPeca = 'cadastro' | 'edicao' | null;

@Component({
    selector: 'app-controle-estoque-pecas',
    imports: [SeletorRemotoComponent,SelecaoCadastroComponent,PaginacaoComponent,PecaComponent, ValidarDuplicidadeDirective, UnidadePecaPipe, FeedbackDirective, CommonModule, FormsModule, FieldHelpDirective, FieldHelpPanelComponent],
    templateUrl: './controle-estoque-pecas.component.html',
    styleUrls: ['./controle-estoque-pecas.component.css']
})
export class ControleEstoquePecasComponent implements OnInit {
  get acessoColaborador(): boolean { return this.router.url.startsWith('/menuColaborador'); }
  private readonly apoio = new ControleEstoquePecasApoio();
  cadastrandoPeca = false;

  cadastrarNovaPeca(): void {
    if (this.acessoColaborador) return;
    if (this.cadastrandoPeca || this.modoSelecaoPeca !== 'cadastro' || this.pecaContinuidade) return;
    aposFecharModal('modalSelecionarPecaEstoque', this.modalPeca,
      () => this.cadastrandoPeca = true, this.destroyRef);
  }

  cancelarCadastroPeca(): void {
    this.cadastrandoPeca = false;
    this.modalPeca?.show();
  }

  pecaCriadaNoEstoque(peca: Peca): void {
    this.cadastrandoPeca = false;
    if (!peca.id) {
      this.notificacoes.aviso('Não foi possível selecionar a peça salva. Atualize a lista e selecione-a.');
      this.modalPeca?.show();
      return;
    }
    this.pecas = [...this.pecas.filter(item => item.id !== peca.id), peca];
    this.aplicarFiltroPeca();
    Object.assign(this.novoEstoque, {
      idPeca: peca.id, nomePeca: peca.nome, fabricantePeca: peca.fabricante,
      modeloPeca: peca.modelo, unidadePeca: peca.unidade
    });
    this.origemModalPeca = null;
    this.abaCadastroEstoque = 'identificacao';
    this.notificacoes.sucesso('Peça cadastrada e selecionada para o controle de estoque.');
    this.modalCadastro?.show();
  }

  registrarDuplicidade(evento: { model: object; estado: EstadoDuplicidade }): void {
    this.duplicidades.set(evento.model, evento.estado);
    if (!evento.estado.duplicado) return;
    if (evento.model === this.novoEstoque) this.abaCadastroEstoque = 'identificacao';
  }
  duplicidades = new WeakMap<object, EstadoDuplicidade>();
  erroDuplicidade(model: object): string | null { return this.duplicidades.get(model)?.mensagem || null; }

  private readonly notificacoes = injectFeedback(NotificacaoService);
  private readonly rota = injectFeedback(ActivatedRoute);
  private readonly fluxoEstoque = injectFeedback(FluxoEstoqueService);
  private readonly destroyRef = injectFeedback(DestroyRef);
  pecaContinuidade: PecaResumo | null = null;
  salvandoCadastro = false;

  private controlesDaContinuidade:EstoquePeca[]=[];
  get estoquesDaPeca(): EstoquePeca[] {
    return this.pecaContinuidade ? (this.modoPaginado?this.controlesDaContinuidade:this.todos).filter(estoque => Number(estoque.idPeca) === this.pecaContinuidade!.id) : [];
  }

  localJaCadastrado(idLocal: number | undefined, idPeca = this.novoEstoque.idPeca): boolean {
    return !!idLocal && !!idPeca && (this.modoPaginado&&idPeca===this.pecaContinuidade?.id?this.controlesDaContinuidade:this.todos).some(estoque => Number(estoque.idPeca) === Number(idPeca) && Number(estoque.idLocalEstoque) === Number(idLocal));
  }

  consultarEstoqueExistente(estoque: EstoquePeca): void {
    aposFecharModal('modalCadastroEstoquePeca', this.modalCadastro, () => this.abrirDetalhes(estoque), this.destroyRef);
  }

  estoques: EstoquePeca[] = [];
  private todos: EstoquePeca[] = [];

  pecas: PecaResumo[] = [];
  pecasFiltradas: PecaResumo[] = [];
  filtroPeca = '';

  locais: LocalEstoque[] = [];

  alertasAbertos: AlertaEstoquePeca[] = [];
  alertasExibidos: AlertaEstoquePeca[] = [];
  paginaAlertas = 1;
  itensPorPaginaAlertas = 5;
  alertaDetalhado: AlertaEstoquePeca | null = null;
  modalDetalhesAlerta: any;

  get limiteItensAlertas(): number {
    const reserva = window.innerWidth < 768 ? 566 : 474;
    return Math.max(1, Math.min(10, Math.floor((window.innerHeight - reserva) / 64)));
  }
  get opcoesItensAlertas(): number[] {
    return [...new Set([5, 10, this.limiteItensAlertas].filter(n => n <= this.limiteItensAlertas))].sort((a,b) => a-b);
  }
  get tamanhoPaginaAlertas(): number { return Math.min(this.itensPorPaginaAlertas, this.limiteItensAlertas); }
  get totalPaginasAlertas(): number { return Math.max(1, Math.ceil(this.alertasExibidos.length / this.tamanhoPaginaAlertas)); }
  get alertasPaginados(): AlertaEstoquePeca[] {
    const inicio = (this.paginaAlertas - 1) * this.tamanhoPaginaAlertas;
    return this.alertasExibidos.slice(inicio, inicio + this.tamanhoPaginaAlertas);
  }
  get inicioPaginaAlertas(): number { return this.alertasExibidos.length ? (this.paginaAlertas - 1) * this.tamanhoPaginaAlertas + 1 : 0; }
  get fimPaginaAlertas(): number { return Math.min(this.paginaAlertas * this.tamanhoPaginaAlertas, this.alertasExibidos.length); }
  paginasVisiveisAlertas(): number[] {
    const inicio = Math.max(1, Math.min(this.paginaAlertas - 2, this.totalPaginasAlertas - 4));
    return Array.from({length: Math.min(5, this.totalPaginasAlertas - inicio + 1)}, (_,i) => inicio+i);
  }
  irParaPaginaAlertas(pagina: number): void {
    if (pagina >= 1 && pagina <= this.totalPaginasAlertas) this.paginaAlertas = pagina;
  }
  alterarTamanhoPaginaAlertas(): void { this.paginaAlertas = 1; this.ajustarPaginacaoAlertas(); }
  @HostListener('window:resize')
  ajustarPaginacaoAlertas(): void {
    this.itensPorPaginaAlertas = Math.max(1, Math.min(this.itensPorPaginaAlertas, this.limiteItensAlertas));
    this.paginaAlertas = Math.min(this.paginaAlertas, this.totalPaginasAlertas);
  }
  statusAcompanhamentoAlerta(alerta: AlertaEstoquePeca): string { return this.apoio.statusAcompanhamentoAlerta(alerta); }
  visualizarAlerta(alerta: AlertaEstoquePeca): void {
    this.alertaDetalhado = alerta;
    aposFecharModal('modalAlertasEstoque', this.modalAlertas, () => {
      const el = document.getElementById('modalDetalhesAlertaEstoque');
      if (el) { this.modalDetalhesAlerta = bootstrap.Modal.getOrCreateInstance(el); this.modalDetalhesAlerta.show(); }
    }, this.destroyRef);
  }
  voltarDetalhesAlerta(): void {
    aposFecharModal('modalDetalhesAlertaEstoque', this.modalDetalhesAlerta, () => this.abrirModalAlertas(), this.destroyRef);
  }
  incluirAlertasEncerrados = false;
  alertaParaEncerrar: AlertaEstoquePeca | null = null;
  justificativaEncerramento = '';
  processandoAlerta = false;
  modalEncerramentoAlerta: any;
  get justificativaEncerramentoValida(): boolean {
    const tamanho = this.justificativaEncerramento.trim().length;
    return tamanho >= 10 && tamanho <= 1000;
  }

  atualizarListaAlertas(reiniciarPagina = true): void {
    if (reiniciarPagina) this.paginaAlertas = 1;
    const consulta = this.incluirAlertasEncerrados ? this.service.listarAlertas() : this.service.listarAlertasAbertos();
    consulta.subscribe({ next: lista => { this.alertasExibidos = lista ?? []; this.ajustarPaginacaoAlertas(); },
      error: erro => this.notificacoes.erro(this.extrairMensagemErro(erro, 'Não foi possível carregar os alertas.')) });
  }
  alertasTodos: AlertaEstoquePeca[] = [];

  movimentacoes: MovimentacaoEstoquePeca[] = [];

  novoEstoque: Partial<EstoquePeca> = {};
  edit: Partial<EstoquePeca> = {};
  novoLocal: Partial<LocalEstoque> = {};
  movimento: Partial<MovimentacaoEstoquePecaRequest> = {};

  estoqueSelecionado: EstoquePeca | null = null;
  editId: number | null = null;

  tipoMovimentacaoSelecionado: TipoMovimentacaoTela = 'ENTRADA';
  ajusteSaidaSelecionado = false;
  modoSelecaoPeca: ModoSelecaoPeca = 'cadastro';

  loading = false;
  errorMsg = '';

  filtroTexto = '';
  filtroStatus = '';
  filtroLocal = '';

  paginaAtual = 1;
  itensPorPagina = 10;
  opcoesItensPorPagina = [5, 10, 20, 50];

  colunaOrdenacao: ColunaOrdenacaoEstoque = 'nomePeca';
  direcaoOrdenacao: DirecaoOrdenacao = 'asc';

  abaCadastroEstoque: AbaEstoque = 'identificacao';
  abaEdicaoEstoque: AbaEstoque = 'quantidades';

  mensagemErroModal = '';
  estoqueDetalhes: EstoquePeca | null = null;
  private origemModalPeca: OrigemModalPeca = null;

  modalCadastro: any;
  modalEdicao: any;
  modalPeca: any;
  modalMovimentacao: any;
  modalFornecedorMovimentacao: any;
  modalMovimentacoes: any;
  modalAlertas: any;
  modalNovoLocal: any;
  modalDetalhes: any;

  resumo = {
    total: 0,
    normal: 0,
    atencao: 0,
    critico: 0,
    zerado: 0,
    alertasAbertos: 0
  };

  readonly statusFiltro = [
    '',
    'NORMAL',
    'ATENCAO',
    'CRITICO',
    'ZERADO'
  ];

  readonly tiposAjuste = [
    'AJUSTE_ENTRADA',
    'AJUSTE_SAIDA'
  ];

  constructor(
    private readonly service: ControleEstoquePecasService,
    private readonly location: Location
  ) {}

  modoPaginado=false;
  private readonly consultaPaginada=injectFeedback(ConsultaPaginadaService);
  private paginaServidor?:PaginaCadastro<EstoquePeca>;
  private consultaPagina?:Subscription;
  private filtroTimer?:ReturnType<typeof setTimeout>;
  private carregarPagina(esperar=false):void {
    if(!this.modoPaginado)return;
    clearTimeout(this.filtroTimer);
    if(esperar){this.filtroTimer=setTimeout(()=>this.carregarPagina(),250);return;}
    this.consultaPagina?.unsubscribe();this.loading=true;this.errorMsg='';
    this.consultaPagina=this.consultaPaginada.consultar<EstoquePeca>('estoque-pecas',{pagina:this.paginaAtual-1,tamanho:this.itensPorPagina,busca:this.filtroTexto,ordenar:({nomePeca:'peca.nome',fabricantePeca:'peca.fabricante',modeloPeca:'peca.modelo',nomeLocalEstoque:'localEstoque.nome'} as Record<string,string>)[this.colunaOrdenacao]??this.colunaOrdenacao,decrescente:this.direcaoOrdenacao==='desc',statusEstoque:this.filtroStatus==='INATIVO'?'':this.filtroStatus,ativo:this.filtroStatus==='INATIVO'?'false':'','localEstoque.nome':this.filtroLocal}).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({next:pagina=>{
      this.paginaServidor=pagina;this.todos=pagina.content;this.estoques=pagina.content;this.loading=false;
      this.atualizarResumo();
      if(this.paginaAtual>Math.max(1,pagina.totalPages)){this.paginaAtual=Math.max(1,pagina.totalPages);this.carregarPagina();}
    },error:erro=>{this.loading=false;this.errorMsg=this.extrairMensagemErro(erro,'Não foi possível carregar a página.');}});
  }
  ngOnInit(): void {this.modoPaginado=true;this.destroyRef.onDestroy(()=>clearTimeout(this.filtroTimer));
    if (this.fluxoEstoque.possuiContexto(this.rota)) {
      this.carregarContinuidadeEstoque();
      return;
    }
    this.carregarPecas();
    this.carregarLocais();
    this.carregarAlertas();
    this.recarregar();
  }

  private carregarContinuidadeEstoque(): void {
    let idPeca: number;
    try { idPeca = this.fluxoEstoque.obterPecaId(this.rota); }
    catch (erro) { this.errorMsg = (erro as Error).message; return; }
    this.loading = true;
    forkJoin({ pecas: this.modoPaginado?this.consultaPaginada.registro<PecaResumo>('peca',idPeca).pipe(map(peca=>peca?[peca]:[]),catchError(erro=>erro.status===404?of([]):throwError(()=>erro))):this.service.listarPecas(), locais: this.modoPaginado ? this.consultaPaginada.consultar<LocalEstoque>('local-estoque',{ativo:true,selecao:true,tamanho:2}).pipe(map(p=>p.content)) : this.service.listarLocaisAtivos(), estoques: this.modoPaginado?this.service.listarEstoquesDaPeca(idPeca):this.service.listarEstoques() })
      .pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: ({ pecas, locais, estoques }) => {
          this.loading = false;
          this.pecas = pecas; this.pecasFiltradas = [...pecas]; this.locais = locais; this.todos = estoques; this.controlesDaContinuidade=estoques;
          this.aplicarFiltros(); this.atualizarResumo(); this.carregarAlertas();
          const peca = pecas.find(item => item.id === idPeca);
          if (!peca) { this.errorMsg = 'A peça do fornecimento não foi encontrada. Atualize a página para tentar novamente.'; return; }
          this.abrirModalCadastro(false);
          this.pecaContinuidade = peca;
          Object.assign(this.novoEstoque, { idPeca: peca.id, nomePeca: peca.nome, fabricantePeca: peca.fabricante, modeloPeca: peca.modelo, unidadePeca: peca.unidade });
          if (this.localJaCadastrado(this.novoEstoque.idLocalEstoque)) {
            this.novoEstoque.idLocalEstoque = undefined; this.novoEstoque.nomeLocalEstoque = '';
          }
          this.modalCadastro?.show();
          this.fluxoEstoque.consumirContexto(this.rota);
        },
        error: erro => {
          this.loading = false;
          this.errorMsg = this.extrairMensagemErro(erro, 'Não foi possível carregar a peça, os locais e os controles de estoque. Atualize a página para tentar novamente.');
        }
      });
  }

  recarregar(): void {if(this.modoPaginado){this.carregarPagina();return;}
    this.loading = true;
    this.errorMsg = '';

    this.service.listarEstoques().subscribe({
      next: (lista) => {
        this.todos = lista ?? [];
        this.aplicarFiltros();

        this.loading = false;
        this.atualizarResumo();
      },
      error: (erro) => {
        console.error('Erro ao carregar estoque de peças:', erro);

        this.loading = false;
        this.errorMsg = this.extrairMensagemErro(
          erro,
          'Falha ao carregar o controle de estoque de peças.'
        );
      }
    });

    this.carregarAlertas();
  }

  private carregarPecas(): void {if(this.modoPaginado)return;
    this.service.listarPecas().subscribe({
      next: (lista) => {
        this.pecas = lista ?? [];
        this.pecasFiltradas = [...this.pecas];
      },
      error: (erro) => {
        console.error('Erro ao carregar peças:', erro);
      }
    });
  }

  private carregarLocais(): void {
    if(this.modoPaginado){
      this.consultaPaginada.consultar<LocalEstoque>('local-estoque',{ativo:true,selecao:true,tamanho:2}).subscribe({next:pagina=>this.locais=pagina.content,error:()=>this.notificacoes.erro('Não foi possível consultar os locais de estoque.')});return;
    }
    this.service.listarLocaisAtivos().subscribe({
      next: (lista) => {
        this.locais = lista ?? [];
      },
      error: (erro) => {
        console.error('Erro ao carregar locais de estoque:', erro);
      }
    });
  }

  registrarLocal(local: LocalEstoque | null): void {
    if(local)this.locais=[...this.locais.filter(item=>item.id!==local.id),local];
  }
  registrarFornecedorMovimentacao(fornecedor: any): void {
    this.fornecedoresMovimentacao=fornecedor?[fornecedor]:[];
  }

  abrirSelecaoFornecedorMovimentacao(): void {
    aposFecharModal('modalMovimentacaoEstoque', this.modalMovimentacao, () => {
      const el = document.getElementById('modalSelecionarFornecedorMovimentacao');
      if (el) {
        this.modalFornecedorMovimentacao = bootstrap.Modal.getOrCreateInstance(el, {backdrop:'static',keyboard:false});
        this.modalFornecedorMovimentacao.show();
      }
    }, this.destroyRef);
  }

  selecionarFornecedorMovimentacao(fornecedor: any): void {
    if (!fornecedor?.id || (this.compraSelecionada && !fornecedor.ativo)) return;
    this.movimento.idFornecedor = fornecedor.id;
    this.registrarFornecedorMovimentacao(fornecedor);
    this.fecharSelecaoFornecedorMovimentacao();
  }

  fecharSelecaoFornecedorMovimentacao(): void {
    aposFecharModal('modalSelecionarFornecedorMovimentacao', this.modalFornecedorMovimentacao,
      () => this.modalMovimentacao?.show(), this.destroyRef);
  }

  private carregarAlertas(): void {
    this.service.listarAlertasAbertos().subscribe({
      next: (lista) => {
        this.alertasAbertos = lista ?? [];
        this.resumo.alertasAbertos = this.alertasAbertos.length;
      },
      error: (erro) => {
        console.error('Erro ao carregar alertas abertos:', erro);
      }
    });
  }

  filtrar(term: string): void {
    this.filtroTexto = term ?? '';
    this.aplicarFiltros();
  }

  aplicarFiltros(): void {if(this.modoPaginado){this.carregarPagina(true);return;}
    const texto = this.normalizarTexto(this.filtroTexto);
    const textoNumerico = this.onlyDigits(this.filtroTexto);
    const statusSelecionado = (this.filtroStatus || '').toUpperCase().trim();
    const localSelecionado = this.normalizarTexto(this.filtroLocal);

    const filtrados = this.todos.filter(item => {
      const statusCalculado = this.statusCalculadoEstoque(item);
      const statusOriginal = (item.statusEstoque || '').toUpperCase().trim();

      const atendeStatus = !statusSelecionado
        || statusCalculado === statusSelecionado
        || statusOriginal === statusSelecionado;

      const atendeLocal = !localSelecionado
        || this.normalizarTexto(item.nomeLocalEstoque) === localSelecionado;

      const textoItem = [
        item.nomePeca,
        item.fabricantePeca,
        item.modeloPeca,
        item.nomeLocalEstoque,
        item.localizacaoFisica,
        item.statusEstoque,
        statusCalculado,
        this.formatarStatus(statusCalculado),
        this.quantidadeAtualEstoque(item),
        this.quantidadeReservadaEstoque(item),
        this.quantidadeDisponivelEstoque(item)
      ].join(' ');

      const atendeTexto = !texto
        || this.normalizarTexto(textoItem).includes(texto)
        || (!!textoNumerico && this.onlyDigits(item.idPeca).includes(textoNumerico));

      return atendeStatus && atendeLocal && atendeTexto;
    });

    this.estoques = this.ordenarEstoques(filtrados);
    this.ajustarPaginaAtual();
  }


  private atualizarResumo(): void {if(this.modoPaginado){Object.assign(this.resumo,this.paginaServidor?.resumo??{});return;}
    this.resumo.total = this.todos.length;
    this.resumo.normal = this.todos.filter(e => this.statusCalculadoEstoque(e) === 'NORMAL').length;
    this.resumo.atencao = this.todos.filter(e => this.statusCalculadoEstoque(e) === 'ATENCAO').length;
    this.resumo.critico = this.todos.filter(e => this.statusCalculadoEstoque(e) === 'CRITICO').length;
    this.resumo.zerado = this.todos.filter(e => this.statusCalculadoEstoque(e) === 'ZERADO').length;
    this.resumo.alertasAbertos = this.alertasAbertos.length;
  }


  get locaisDisponiveisFiltro(): string[] {if(this.modoPaginado)return this.paginaServidor?.opcoes['localEstoque.nome']??[];
    return Array.from(
      new Set(
        this.todos
          .map(item => (item.nomeLocalEstoque || '').trim())
          .filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }

  get possuiFiltrosAplicados(): boolean {
    return !!(
      this.filtroTexto.trim() ||
      this.filtroStatus.trim() ||
      this.filtroLocal.trim()
    );
  }

  get totalRegistrosFiltrados(): number {if(this.modoPaginado)return this.paginaServidor?.totalElements??0;
    return this.estoques.length;
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

  get estoquesPaginados(): EstoquePeca[] {if(this.modoPaginado)return this.todos;
    this.ajustarPaginaAtual();

    const inicio = (this.paginaAtual - 1) * this.itensPorPagina;
    const fim = inicio + this.itensPorPagina;

    return this.estoques.slice(inicio, fim);
  }

  get cadastroEstoqueProntoParaSalvar(): boolean {
    return this.validarEstoque(this.novoEstoque, true) === null;
  }

  get edicaoEstoqueProntaParaSalvar(): boolean {
    return this.validarEstoque(this.edit, false) === null;
  }

  get mensagemBloqueioCadastro(): string {
    return this.validarEstoque(this.novoEstoque, true) || '';
  }

  get mensagemBloqueioEdicao(): string {
    return this.validarEstoque(this.edit, false) || '';
  }

  get progressoCadastroEstoque(): number {
    return this.calcularProgressoEstoque(this.novoEstoque, true);
  }

  get progressoEdicaoEstoque(): number {
    return this.calcularProgressoEstoque(this.edit, false);
  }

  get totalNormal(): number {if(this.modoPaginado)return this.paginaServidor?.resumo['normal']??0;
    return this.estoques.filter(item =>
      this.statusCalculadoEstoque(item) === 'NORMAL'
    ).length;
  }


  get totalAtencao(): number {if(this.modoPaginado)return this.paginaServidor?.resumo['atencao']??0;
    return this.estoques.filter(item =>
      this.statusCalculadoEstoque(item) === 'ATENCAO'
    ).length;
  }


  get totalCritico(): number {if(this.modoPaginado)return this.paginaServidor?.resumo['critico']??0;
    return this.estoques.filter(item =>
      this.statusCalculadoEstoque(item) === 'CRITICO'
    ).length;
  }


  get totalZerado(): number {if(this.modoPaginado)return this.paginaServidor?.resumo['zerado']??0;
    return this.estoques.filter(item =>
      this.statusCalculadoEstoque(item) === 'ZERADO'
    ).length;
  }

  aoAlterarFiltros(): void {
    this.paginaAtual = 1;
    this.aplicarFiltros();
  }

  limparFiltros(): void {
    this.filtroTexto = '';
    this.filtroStatus = '';
    this.filtroLocal = '';
    this.paginaAtual = 1;
    this.aplicarFiltros();
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

  paginasVisiveis(): number[] {
    const paginas: number[] = [];
    const inicio = Math.max(1, this.paginaAtual - 2);
    const fim = Math.min(this.totalPaginas, this.paginaAtual + 2);

    for (let pagina = inicio; pagina <= fim; pagina++) {
      paginas.push(pagina);
    }

    return paginas;
  }

  ordenarPor(coluna: ColunaOrdenacaoEstoque): void {
    if (this.colunaOrdenacao === coluna) {
      this.direcaoOrdenacao = this.direcaoOrdenacao === 'asc' ? 'desc' : 'asc';
    } else {
      this.colunaOrdenacao = coluna;
      this.direcaoOrdenacao = 'asc';
    }

    this.aplicarFiltros();
  this.carregarPagina(); }

  iconeOrdenacao(coluna: ColunaOrdenacaoEstoque): string {
    if (this.colunaOrdenacao !== coluna) {
      return 'bi-arrow-down-up';
    }

    return this.direcaoOrdenacao === 'asc' ? 'bi-sort-up' : 'bi-sort-down';
  }

  podeAcessarAbaCadastro(aba: AbaEstoque): boolean {
    if (aba !== 'identificacao' && this.erroDuplicidade(this.novoEstoque)) return false;
    const ordem: (AbaEstoque)[] = ['identificacao', 'quantidades', 'reposicao', 'revisao'];
    return podeAcessarEtapa(ordem, this.abaCadastroEstoque, aba, etapa => {
      switch (etapa) {
        case 'identificacao': return !this.identificacaoEstoquePendente(this.novoEstoque);
        case 'quantidades': return !this.quantidadesEstoquePendentes(this.novoEstoque);
        case 'reposicao': return !this.reposicaoEstoquePendente(this.novoEstoque) && !this.estoqueCampoInvalido(this.novoEstoque, 'custoMedio', false);
        case 'revisao': return true;
      }
    });
  }

  get podeAvancarCadastro(): boolean {
    const ordem: (AbaEstoque)[] = ['identificacao', 'quantidades', 'reposicao', 'revisao'];
    const proxima = ordem[ordem.indexOf(this.abaCadastroEstoque) + 1];
    return !!proxima && this.podeAcessarAbaCadastro(proxima);
  }

  trocarAbaCadastroEstoque(aba: AbaEstoque): void {
    if (!this.podeAcessarAbaCadastro(aba)) return;
    this.abaCadastroEstoque = aba;
  }

  trocarAbaEdicaoEstoque(aba: AbaEstoque): void {
    this.abaEdicaoEstoque = aba;
  }

  avancarAbaCadastroEstoque(): void {
    if (!this.podeAvancarCadastro) return;
    const ordem: AbaEstoque[] = ['identificacao', 'quantidades', 'reposicao', 'revisao'];
    const atual = ordem.indexOf(this.abaCadastroEstoque);

    if (atual < ordem.length - 1) {
      this.abaCadastroEstoque = ordem[atual + 1];
    }
  }

  voltarAbaCadastroEstoque(): void {
    const ordem: AbaEstoque[] = ['identificacao', 'quantidades', 'reposicao', 'revisao'];
    const atual = ordem.indexOf(this.abaCadastroEstoque);

    if (atual > 0) {
      this.abaCadastroEstoque = ordem[atual - 1];
    }
  }

  avancarAbaEdicaoEstoque(): void {
    const ordem: AbaEstoque[] = ['identificacao', 'quantidades', 'reposicao', 'revisao'];
    const atual = ordem.indexOf(this.abaEdicaoEstoque);

    if (atual < ordem.length - 1) {
      this.abaEdicaoEstoque = ordem[atual + 1];
    }
  }

  voltarAbaEdicaoEstoque(): void {
    const ordem: AbaEstoque[] = ['identificacao', 'quantidades', 'reposicao', 'revisao'];
    const atual = ordem.indexOf(this.abaEdicaoEstoque);

    if (atual > 0) {
      this.abaEdicaoEstoque = ordem[atual - 1];
    }
  }

  abrirDetalhes(item: EstoquePeca): void {
    this.estoqueDetalhes = item;

    const el = document.getElementById('modalDetalhesEstoquePeca');

    if (!el) {
      console.error('Modal modalDetalhesEstoquePeca não encontrado.');
      return;
    }

    this.modalDetalhes = bootstrap.Modal.getOrCreateInstance(el);
    this.modalDetalhes.show();
  }

  saldoDisponivel(item: Partial<EstoquePeca>): number { return this.apoio.saldoDisponivel(item); }


  percentualSaldoMinimo(item: Partial<EstoquePeca>): number { return this.apoio.percentualSaldoMinimo(item); }


  estoqueCampoInvalido(model: Partial<EstoquePeca>, campo: string, validarPecaELocal = true): boolean {
    if (campo === 'idPeca') {
      return validarPecaELocal && !model.idPeca;
    }

    if (campo === 'idLocalEstoque') {
      return validarPecaELocal && (!model.idLocalEstoque || this.localJaCadastrado(model.idLocalEstoque, model.idPeca));
    }

    if (campo === 'quantidadeAtual') {
      return this.quantidadeObrigatoriaInvalida(model.quantidadeAtual, true);
    }

    if (campo === 'quantidadeReservada') {
      return this.quantidadeObrigatoriaInvalida(model.quantidadeReservada, true);
    }

    if (campo === 'estoqueMinimo') {
      return this.quantidadeObrigatoriaInvalida(model.estoqueMinimo, true);
    }

    if (campo === 'estoqueCritico') {
      return this.quantidadeObrigatoriaInvalida(model.estoqueCritico, true);
    }

    if (campo === 'custoMedio') {
      return this.custoMedioInvalido(model);
    }

    return false;
  }

  identificacaoEstoquePendente(model: Partial<EstoquePeca>, validarPecaELocal = true): boolean {
    return this.estoqueCampoInvalido(model, 'idPeca', validarPecaELocal) ||
      this.estoqueCampoInvalido(model, 'idLocalEstoque', validarPecaELocal);
  }

  quantidadesEstoquePendentes(model: Partial<EstoquePeca>): boolean {
    return this.estoqueCampoInvalido(model, 'quantidadeAtual', false) ||
      this.estoqueCampoInvalido(model, 'quantidadeReservada', false) ||
      this.estoqueCampoInvalido(model, 'estoqueMinimo', false) ||
      this.estoqueCampoInvalido(model, 'estoqueCritico', false) ||
      this.validarRegrasNumericasEstoque(model) !== null;
  }

  reposicaoEstoquePendente(model: Partial<EstoquePeca>): boolean { return this.apoio.reposicaoEstoquePendente(model); }

  custoMedioObrigatorio(model: Partial<EstoquePeca>): boolean { return this.apoio.custoMedioObrigatorio(model); }

  private ajustarPaginaAtual(): void {
    if (this.paginaAtual > this.totalPaginas) {
      this.paginaAtual = this.totalPaginas;
    }

    if (this.paginaAtual < 1) {
      this.paginaAtual = 1;
    }
  }

  private ordenarEstoques(lista: EstoquePeca[]): EstoquePeca[] {
    return [...lista].sort((a, b) => {
      const valorA = this.valorOrdenacao(a, this.colunaOrdenacao);
      const valorB = this.valorOrdenacao(b, this.colunaOrdenacao);
      const multiplicador = this.direcaoOrdenacao === 'asc' ? 1 : -1;

      if (typeof valorA === 'number' && typeof valorB === 'number') {
        return (valorA - valorB) * multiplicador;
      }

      return String(valorA).localeCompare(String(valorB), 'pt-BR') * multiplicador;
    });
  }

  private valorOrdenacao(item: EstoquePeca, coluna: ColunaOrdenacaoEstoque): string | number { return this.apoio.valorOrdenacao(item, coluna); }


  private calcularProgressoEstoque(model: Partial<EstoquePeca>, validarPecaELocal: boolean): number {
    const verificacoesObrigatorias = this.verificacoesCamposObrigatorios(
      model,
      validarPecaELocal
    );

    const validos = verificacoesObrigatorias.filter(Boolean).length;
    const percentual = Math.round((validos / verificacoesObrigatorias.length) * 100);

    return Math.max(0, Math.min(100, percentual));
  }


  private verificacoesCamposObrigatorios(
    model: Partial<EstoquePeca>,
    validarPecaELocal: boolean
  ): boolean[] {
    const verificacoes = validarPecaELocal
      ? [
          !this.estoqueCampoInvalido(model, 'idPeca', true),
          !this.estoqueCampoInvalido(model, 'idLocalEstoque', true),
          !this.estoqueCampoInvalido(model, 'quantidadeAtual', false),
          !this.estoqueCampoInvalido(model, 'quantidadeReservada', false),
          !this.estoqueCampoInvalido(model, 'estoqueMinimo', false),
          !this.estoqueCampoInvalido(model, 'estoqueCritico', false)
        ]
      : [
          !this.estoqueCampoInvalido(model, 'quantidadeAtual', false),
          !this.estoqueCampoInvalido(model, 'quantidadeReservada', false),
          !this.estoqueCampoInvalido(model, 'estoqueMinimo', false),
          !this.estoqueCampoInvalido(model, 'estoqueCritico', false)
        ];

    if (this.custoMedioObrigatorio(model)) {
      verificacoes.push(!this.estoqueCampoInvalido(model, 'custoMedio', false));
    }

    return verificacoes;
  }


  trackByEstoque = (_: number, item: EstoquePeca) => item.id ?? item.idPeca ?? _;
  trackByPeca = (_: number, item: PecaResumo) => item.id ?? item.nome;
  trackByLocal = (_: number, item: LocalEstoque) => item.id ?? item.nome;
  trackByMovimentacao = (_: number, item: MovimentacaoEstoquePeca) => item.id ?? _;
  trackByAlerta = (_: number, item: AlertaEstoquePeca) => item.id ?? _;

  // ======================================================
  // CADASTRO / EDIÇÃO DO CONTROLE DE ESTOQUE
  // ======================================================

  abrirModalCadastro(exibir = true): void {
    this.pecaContinuidade = null;
    this.abaCadastroEstoque = 'identificacao';
    this.mensagemErroModal = '';

    this.novoEstoque = {
      idPeca: undefined,
      nomePeca: '',
      fabricantePeca: '',
      modeloPeca: '',
      unidadePeca: '',

      idLocalEstoque: this.locais.length === 1 ? this.locais[0].id : undefined,
      nomeLocalEstoque: this.locais.length === 1 ? this.locais[0].nome : '',

      quantidadeAtual: '0',
      quantidadeReservada: '0',

      estoqueMinimo: '',
      estoqueCritico: '',
      estoqueMaximo: '',

      pontoReposicao: '',
      quantidadeReposicaoSugerida: '',

      custoMedio: '',
      localizacaoFisica: '',

      ativo: true
    };

    const el = document.getElementById('modalCadastroEstoquePeca');

    if (!el) {
      console.error('Modal modalCadastroEstoquePeca não encontrado.');
      return;
    }

    this.modalCadastro = bootstrap.Modal.getOrCreateInstance(el);
    if (exibir) this.modalCadastro.show();
  }

  salvarNovoEstoque(): void {
    if (this.salvandoCadastro) return;
    const erroValidacao = this.validarEstoque(this.novoEstoque, true);

    if (erroValidacao) {
      this.mensagemErroModal = erroValidacao;
      this.direcionarAbaErroEstoque(this.novoEstoque, true, 'cadastro');
      return;
    }

    const payload = this.montarPayloadEstoque(this.novoEstoque);
    this.salvandoCadastro = true;

    this.service.cadastrarEstoque(payload).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.salvandoCadastro = false;
        this.modalCadastro?.hide();
        this.notificacoes.sucesso('Controle de estoque cadastrado com sucesso.');
        this.recarregar();
      },
      error: (erro) => {
        this.salvandoCadastro = false;
        console.error('Erro ao cadastrar controle de estoque:', erro);

        this.mensagemErroModal = this.extrairMensagemErro(
          erro,
          'Erro ao cadastrar controle de estoque.'
        );
      }
    });
  }

  abrirModalEdicao(item: EstoquePeca): void {
    this.abaEdicaoEstoque = 'quantidades';
    this.mensagemErroModal = '';
    this.editId = item.id ?? null;

    this.edit = {
      ...item,
      quantidadeAtual: this.normalizarDecimalParaExibicao(item.quantidadeAtual),
      quantidadeReservada: this.normalizarDecimalParaExibicao(item.quantidadeReservada),
      estoqueMinimo: this.normalizarDecimalParaExibicao(item.estoqueMinimo),
      estoqueCritico: this.normalizarDecimalParaExibicao(item.estoqueCritico),
      estoqueMaximo: this.normalizarDecimalParaExibicao(item.estoqueMaximo),
      pontoReposicao: this.normalizarDecimalParaExibicao(item.pontoReposicao),
      quantidadeReposicaoSugerida: this.normalizarDecimalParaExibicao(item.quantidadeReposicaoSugerida),
      custoMedio: this.formatarMoedaBR(item.custoMedio)
    };

    const el = document.getElementById('modalEdicaoEstoquePeca');

    if (!el) {
      console.error('Modal modalEdicaoEstoquePeca não encontrado.');
      return;
    }

    this.modalEdicao = bootstrap.Modal.getOrCreateInstance(el);
    this.modalEdicao.show();
  }

  salvarEdicao(): void {
    if (!this.editId) {
      return;
    }

    const erroValidacao = this.validarEstoque(this.edit, false);

    if (erroValidacao) {
      this.mensagemErroModal = erroValidacao;
      this.direcionarAbaErroEstoque(this.edit, false, 'edicao');
      return;
    }

    const payload = this.montarPayloadEstoque(this.edit);

    this.service.atualizarEstoque(this.editId, payload).subscribe({
      next: () => {
        this.modalEdicao?.hide();
        this.notificacoes.sucesso('Controle de estoque atualizado com sucesso.');
        this.recarregar();
      },
      error: (erro) => {
        console.error('Erro ao atualizar controle de estoque:', erro);

        this.mensagemErroModal = this.extrairMensagemErro(
          erro,
          'Erro ao atualizar controle de estoque.'
        );
      }
    });
  }

  private validarEstoque(model: Partial<EstoquePeca>, validarPecaELocal: boolean): string | null {
    const duplicidade = this.erroDuplicidade(model);
    if (duplicidade) return duplicidade;
    if (validarPecaELocal && !model.idPeca) {
      return 'Selecione uma peça ou insumo para controlar o estoque.';
    }

    if (validarPecaELocal && !model.idLocalEstoque) {
      return 'Selecione o local de estoque.';
    }
    if (validarPecaELocal && this.localJaCadastrado(model.idLocalEstoque, model.idPeca)) {
      return 'Já existe controle de estoque para esta peça neste local. Consulte o controle existente ou escolha outro local.';
    }

    if (this.quantidadeObrigatoriaInvalida(model.quantidadeAtual, true)) {
      return 'Informe a quantidade atual com valor igual ou maior que zero.';
    }

    if (this.quantidadeObrigatoriaInvalida(model.quantidadeReservada, true)) {
      return 'Informe a quantidade reservada com valor igual ou maior que zero.';
    }

    if (this.quantidadeObrigatoriaInvalida(model.estoqueMinimo, true)) {
      return 'Informe o estoque mínimo com valor igual ou maior que zero.';
    }

    if (this.quantidadeObrigatoriaInvalida(model.estoqueCritico, true)) {
      return 'Informe o estoque crítico com valor igual ou maior que zero.';
    }

    const erroNumerico = this.validarRegrasNumericasEstoque(model);

    if (erroNumerico) {
      return erroNumerico;
    }

    const erroReposicao = this.validarReposicaoEstoque(model);

    if (erroReposicao) {
      return erroReposicao;
    }

    return null;
  }

  private validarRegrasNumericasEstoque(model: Partial<EstoquePeca>): string | null { return this.apoio.validarRegrasNumericasEstoque(model); }


  private validarReposicaoEstoque(model: Partial<EstoquePeca>): string | null { return this.apoio.validarReposicaoEstoque(model); }


  private custoMedioInvalido(model: Partial<EstoquePeca>): boolean { return this.apoio.custoMedioInvalido(model); }

  private quantidadeObrigatoriaInvalida(valor: any, permitirZero: boolean): boolean { return this.apoio.quantidadeObrigatoriaInvalida(valor, permitirZero); }


  private numeroFormulario(valor: any, removerMoeda = false): number { return this.apoio.numeroFormulario(valor, removerMoeda); }


  private direcionarAbaErroEstoque(model: Partial<EstoquePeca>, validarPecaELocal: boolean, modo: 'cadastro' | 'edicao'): void {
    let aba: AbaEstoque = 'identificacao';

    if (this.identificacaoEstoquePendente(model, validarPecaELocal)) {
      aba = 'identificacao';
    } else if (this.quantidadesEstoquePendentes(model)) {
      aba = 'quantidades';
    } else if (this.reposicaoEstoquePendente(model)) {
      aba = 'reposicao';
    }

    if (modo === 'cadastro') {
      this.abaCadastroEstoque = aba;
    } else {
      this.abaEdicaoEstoque = aba;
    }
  }

  private montarPayloadEstoque(model: Partial<EstoquePeca>): EstoquePecaRequest { return this.apoio.montarPayloadEstoque(model); }

  // ======================================================
  // SELEÇÃO DE PEÇA
  // ======================================================

  abrirModalPeca(modo: ModoSelecaoPeca): void {
    if (modo === 'cadastro' && this.pecaContinuidade) return;
    this.modoSelecaoPeca = modo;
    this.origemModalPeca = modo;
    this.filtroPeca = '';
    this.aplicarFiltroPeca();

    aposFecharModal(modo === 'cadastro' ? 'modalCadastroEstoquePeca' : 'modalEdicaoEstoquePeca',
      modo === 'cadastro' ? this.modalCadastro : this.modalEdicao, () => {
      const el = document.getElementById('modalSelecionarPecaEstoque');

      if (!el) {
        console.error('Modal modalSelecionarPecaEstoque não encontrado.');
        return;
      }

      this.modalPeca = bootstrap.Modal.getOrCreateInstance(el, {
        backdrop: 'static',
        keyboard: false
      });
      this.modalPeca.show();
    }, this.destroyRef);
  }

  aplicarFiltroPeca(): void {
    const t = this.filtroPeca.trim().toLowerCase();

    if (!t) {
      this.pecasFiltradas = [...this.pecas];
      return;
    }

    this.pecasFiltradas = this.pecas.filter(peca => {
      return (
        (peca.nome || '').toLowerCase().includes(t) ||
        (peca.fabricante || '').toLowerCase().includes(t) ||
        (peca.modelo || '').toLowerCase().includes(t) ||
        (peca.tipo || '').toLowerCase().includes(t) ||
        (peca.especificacao || '').toLowerCase().includes(t)
      );
    });
  }

  selecionarPeca(peca: PecaResumo): void {
    if(this.modoPaginado&&peca?.id&&!this.pecas.some(row=>row.id===peca.id))this.pecas.push(peca);

    if (this.modoSelecaoPeca === 'cadastro' && this.pecaContinuidade) return;
    if (!peca.id) {
      return;
    }

    const target = this.modoSelecaoPeca === 'cadastro'
      ? this.novoEstoque
      : this.edit;

    target.idPeca = peca.id;
    target.nomePeca = peca.nome;
    target.fabricantePeca = peca.fabricante;
    target.modeloPeca = peca.modelo;
    target.unidadePeca = peca.unidade;

    this.fecharModalPeca(true);
  }

  fecharModalPeca(reabrirOrigem = true): void {
    this.modalPeca?.hide();

    if (!reabrirOrigem || !this.origemModalPeca) {
      this.origemModalPeca = null;
      return;
    }

    const origem = this.origemModalPeca;
    this.origemModalPeca = null;

    setTimeout(() => {
      const modalId = origem === 'cadastro'
        ? 'modalCadastroEstoquePeca'
        : 'modalEdicaoEstoquePeca';

      const el = document.getElementById(modalId);

      if (!el) {
        return;
      }

      const modal = bootstrap.Modal.getOrCreateInstance(el);

      if (origem === 'cadastro') {
        this.modalCadastro = modal;
      } else {
        this.modalEdicao = modal;
      }

      modal.show();
    }, 250);
  }

  pecaTexto(model: Partial<EstoquePeca>): string { return this.apoio.pecaTexto(model); }

  // ======================================================
  // LOCAL DE ESTOQUE
  // ======================================================

  abrirModalNovoLocal(): void {
    this.novoLocal = {
      nome: '',
      descricao: '',
      ativo: true
    };

    const el = document.getElementById('modalNovoLocalEstoque');

    if (!el) {
      console.error('Modal modalNovoLocalEstoque não encontrado.');
      return;
    }

    this.modalNovoLocal = bootstrap.Modal.getOrCreateInstance(el);
    this.modalNovoLocal.show();
  }

  salvarNovoLocal(): void {
    const duplicidade = this.erroDuplicidade(this.novoLocal);
    if (duplicidade) { this.notificacoes.erro(duplicidade); return; }
    if (!String(this.novoLocal.nome ?? '').trim()) {
      this.notificacoes.erro('Informe o nome do local de estoque.');
      return;
    }

    const payload: LocalEstoqueRequest = {
      nome: this.capitalizar(this.novoLocal.nome),
      descricao: this.limparOpcional(this.novoLocal.descricao),
      ativo: this.novoLocal.ativo === null || this.novoLocal.ativo === undefined
        ? true
        : Boolean(this.novoLocal.ativo)
    };

    this.service.cadastrarLocal(payload).subscribe({
      next: () => {
        this.modalNovoLocal?.hide();
        this.notificacoes.sucesso('Local de estoque cadastrado com sucesso.');
        this.carregarLocais();
      },
      error: (erro) => {
        console.error('Erro ao cadastrar local de estoque:', erro);

        this.notificacoes.erro(
          this.extrairMensagemErro(
            erro,
            'Erro ao cadastrar local de estoque.'
          )
        );
      }
    });
  }

  atualizarNomeLocalCadastro(): void {
    const local = this.locais.find(l => l.id === Number(this.novoEstoque.idLocalEstoque));
    this.novoEstoque.nomeLocalEstoque = local?.nome ?? '';
  }

  atualizarNomeLocalEdicao(): void {
    const local = this.locais.find(l => l.id === Number(this.edit.idLocalEstoque));
    this.edit.nomeLocalEstoque = local?.nome ?? this.edit.nomeLocalEstoque ?? '';
  }

  // ======================================================
  // MOVIMENTAÇÃO
  // ======================================================

  abrirModalMovimentacao(item: EstoquePeca, tipo: TipoMovimentacaoTela): void {
  if (this.acessoColaborador && (tipo === 'AJUSTE_ENTRADA' || tipo === 'AJUSTE_SAIDA')) return;
  this.estoqueSelecionado = item;
  this.tipoMovimentacaoSelecionado = tipo;
  this.movimentacoesParaDevolucao = [];
  this.carregandoSaidasDevolucao = false;

  /*
   * Quando o usuário clicar no botão Ajuste da tabela,
   * o modal sempre abrirá inicialmente como AJUSTE_ENTRADA.
   */
  this.ajusteSaidaSelecionado = tipo === 'AJUSTE_SAIDA';

  this.movimento = {
    tipoMovimento: tipo,
    quantidade: '',
    valorUnitario: '',
    origem: '',
    documentoReferencia: '',
    motivo: '',
    observacoes: '',
    idUsuario: null
  };

  const el = document.getElementById('modalMovimentacaoEstoque');

  if (!el) {
    console.error('Modal modalMovimentacaoEstoque não encontrado.');
    return;
  }

  this.modalMovimentacao = bootstrap.Modal.getOrCreateInstance(el);
  this.modalMovimentacao.show();
}

alternarTipoAjuste(): void {
  if (!this.isMovimentacaoAjuste()) {
    return;
  }

  this.tipoMovimentacaoSelecionado = this.ajusteSaidaSelecionado
    ? 'AJUSTE_SAIDA'
    : 'AJUSTE_ENTRADA';

  this.movimento.tipoMovimento = this.tipoMovimentacaoSelecionado;

  /*
   * Ajuste de saída não usa valor unitário.
   * Limpamos o campo para evitar envio desnecessário.
   */
  if (this.tipoMovimentacaoSelecionado === 'AJUSTE_SAIDA') {
    this.movimento.valorUnitario = '';
  }
}

isMovimentacaoAjuste(): boolean {
  return (
    this.tipoMovimentacaoSelecionado === 'AJUSTE_ENTRADA' ||
    this.tipoMovimentacaoSelecionado === 'AJUSTE_SAIDA'
  );
}

private isMovimentacaoSaida(): boolean {
  return (
    this.tipoMovimentacaoSelecionado === 'SAIDA' ||
    this.tipoMovimentacaoSelecionado === 'AJUSTE_SAIDA'
  );
}

textoAjudaTipoMovimentacao(): string {
  if (this.tipoMovimentacaoSelecionado === 'AJUSTE_ENTRADA') {
    return 'Use esta opção quando o saldo físico encontrado for maior do que o saldo registrado no sistema.';
  }

  if (this.tipoMovimentacaoSelecionado === 'AJUSTE_SAIDA') {
    return 'Use esta opção quando o saldo físico encontrado for menor do que o saldo registrado no sistema.';
  }

  if (this.tipoMovimentacaoSelecionado === 'ENTRADA') {
    return 'Use esta opção para registrar entrada real de peças no estoque, como compra ou reposição.';
  }

  return 'Use esta opção para registrar consumo, retirada ou baixa real de peças do estoque.';
}

rotuloQuantidadeMovimentacao(): string {
  if (this.isMovimentacaoSaida()) {
    return 'Quantidade a retirar *';
  }

  return 'Quantidade a adicionar *';
}

placeholderQuantidadeMovimentacao(): string {
  if (this.isMovimentacaoSaida()) {
    return 'Ex.: 1 peça retirada';
  }

  return 'Ex.: 1 peça adicionada';
}

classePainelMovimentacao(): string {
  if (this.tipoMovimentacaoSelecionado === 'ENTRADA') {
    return 'movimento-painel movimento-entrada';
  }

  if (this.tipoMovimentacaoSelecionado === 'SAIDA') {
    return 'movimento-painel movimento-saida';
  }

  if (this.tipoMovimentacaoSelecionado === 'AJUSTE_ENTRADA') {
    return 'movimento-painel movimento-ajuste-entrada';
  }

  return 'movimento-painel movimento-ajuste-saida';
}

get opcoesOrigemMovimentacao(): { valor: string; rotulo: string; ajuda: string }[] {
  if (this.isMovimentacaoAjuste()) {
    return [
      { valor: 'INVENTARIO', rotulo: 'Inventário', ajuda: 'ajuste pela contagem física.' },
      { valor: 'CORRECAO_LANCAMENTO', rotulo: 'Correção de lançamento', ajuda: 'corrige a quantidade de uma movimentação original selecionada.' },
      { valor: 'OUTRA', rotulo: 'Outra origem', ajuda: 'explique no Motivo.' }
    ];
  }
  if (this.tipoMovimentacaoSelecionado === 'SAIDA') {
    return [
      { valor: 'CONSUMO_INTERNO', rotulo: 'Consumo interno', ajuda: 'uso fora dos atendimentos.' },
      { valor: 'DEVOLUCAO_FORNECEDOR', rotulo: 'Devolução ao fornecedor', ajuda: 'retorno vinculado ao recebimento original.' },
      { valor: 'PERDA_AVARIA', rotulo: 'Perda ou avaria', ajuda: 'peças perdidas ou danificadas.' },
      { valor: 'OUTRA', rotulo: 'Outra origem', ajuda: 'explique no Motivo.' }
    ];
  }
  return [
    { valor: 'COMPRA', rotulo: 'Compra', ajuda: 'peças compradas.' },
    { valor: 'DEVOLUCAO_NAO_UTILIZADA', rotulo: 'Devolução de peça não utilizada', ajuda: 'retorno sem uso.' },
    { valor: 'BONIFICACAO', rotulo: 'Bonificação do fornecedor', ajuda: 'peças gratuitas.' },
    { valor: 'OUTRA', rotulo: 'Outra origem', ajuda: 'explique no Motivo.' }
  ];
}

get ajudaOrigensMovimentacao(): string {
  return this.opcoesOrigemMovimentacao.map(opcao => `${opcao.rotulo}: ${opcao.ajuda}`).join(' • ');
}

get origemMovimentacaoValida(): boolean {
  return this.opcoesOrigemMovimentacao.some(opcao => opcao.valor === this.movimento.origem);
}

get motivoMovimentacaoObrigatorio(): boolean {
  return this.isMovimentacaoAjuste() || this.devolucaoFornecedorSelecionada || this.movimento.origem === 'OUTRA' || (this.custoMovimentacaoObrigatorio && this.custoMovimentacaoNumerico === 0);
}

movimentacoesParaDevolucao: MovimentacaoEstoquePeca[] = [];
carregandoSaidasDevolucao = false;

get devolucaoSelecionada(): boolean {
  return this.tipoMovimentacaoSelecionado === 'ENTRADA' && this.movimento.origem === 'DEVOLUCAO_NAO_UTILIZADA';
}

fornecedoresMovimentacao: { id: number; razaoSocial: string; ativo: boolean }[] = [];
carregandoFornecedoresMovimentacao = false;

get devolucaoFornecedorSelecionada(): boolean {
  return this.tipoMovimentacaoSelecionado === 'SAIDA' && this.movimento.origem === 'DEVOLUCAO_FORNECEDOR';
}

get compraSelecionada(): boolean {
  return this.tipoMovimentacaoSelecionado === 'ENTRADA' && this.movimento.origem === 'COMPRA';
}

get recebimentosDisponiveisFornecedor(): MovimentacaoEstoquePeca[] {
  return this.movimentacoesParaDevolucao.filter(m => m.tipoMovimento === 'ENTRADA' && ['COMPRA', 'BONIFICACAO', 'MANUAL'].includes(m.origem || '')
    && !m.idAtendimento && !m.idMovimentacaoOrigem && this.quantidadeOriginalCorrigida(m) > 0);
}

get recebimentoFornecedorSelecionado(): MovimentacaoEstoquePeca | undefined {
  return this.recebimentosDisponiveisFornecedor.find(m => m.id === this.movimento.idMovimentacaoOrigem);
}

get fornecedorMovimentacaoValido(): boolean {
  if (this.devolucaoFornecedorSelecionada && this.recebimentoFornecedorSelecionado?.idFornecedor) return true;
  if (!this.compraSelecionada && !this.devolucaoFornecedorSelecionada && !this.movimento.idFornecedor) return true;
  return this.fornecedoresMovimentacao.some(f => f.id === this.movimento.idFornecedor && (!this.compraSelecionada || f.ativo));
}

get opcoesFornecedoresMovimentacao() {
  return this.fornecedoresMovimentacao.filter(f => !this.compraSelecionada || f.ativo);
}

get exibirFornecedorMovimentacao(): boolean {
  return this.compraSelecionada || this.devolucaoFornecedorSelecionada || this.movimento.origem === 'BONIFICACAO';
}

get fornecedorMovimentacaoObrigatorio(): boolean {
  return this.compraSelecionada || this.devolucaoFornecedorSelecionada;
}
get correcaoSelecionada(): boolean {
  return this.isMovimentacaoAjuste() && this.movimento.origem === 'CORRECAO_LANCAMENTO';
}

get movimentacoesDisponiveisCorrecao(): MovimentacaoEstoquePeca[] {
  return this.movimentacoesParaDevolucao.filter(m => ['ENTRADA', 'SAIDA'].includes(m.tipoMovimento || '')
    && m.origem !== 'ATENDIMENTO' && m.origem !== 'INVENTARIO_INICIAL'
    && !m.idAtendimento && (!m.idMovimentacaoOrigem || m.origem === 'DEVOLUCAO_FORNECEDOR'));
}

quantidadeOriginalCorrigida(original: MovimentacaoEstoquePeca): number {
  if(original.quantidadeDisponivelOriginal!=null)return Number(original.quantidadeDisponivelOriginal);
  const entradaOriginal = original.tipoMovimento === 'ENTRADA';
  const quantidade = this.movimentacoesParaDevolucao.filter(m => m.idMovimentacaoOrigem === original.id)
    .reduce((total, m) => {
      const quantidadeVinculada = entradaOriginal && m.tipoMovimento === 'SAIDA' && m.origem === 'DEVOLUCAO_FORNECEDOR'
        ? this.quantidadeOriginalCorrigida(m) : Number(m.quantidade || 0);
      return total + ((m.tipoMovimento || '').endsWith('ENTRADA') === entradaOriginal ? 1 : -1) * quantidadeVinculada;
    }, Number(original.quantidade || 0));
  return Math.round(quantidade * 1000) / 1000;
}
get vinculoCorrecaoValido(): boolean {
  return this.movimentacoesDisponiveisCorrecao.some(m => m.id === this.movimento.idMovimentacaoOrigem);
}
get saidasDisponiveisDevolucao(): MovimentacaoEstoquePeca[] {
  return this.movimentacoesParaDevolucao.filter(m => m.tipoMovimento === 'SAIDA' && m.origem !== 'ATENDIMENTO' && m.origem !== 'DEVOLUCAO_FORNECEDOR'
    && m.valorUnitario != null && Number(m.valorUnitario) >= 0 && this.saldoDevolucao(m) > 0);
}

saldoDevolucao(saida: MovimentacaoEstoquePeca): number {
  if(saida.quantidadeDisponivelOriginal!=null)return Math.max(0,Number(saida.quantidadeDisponivelOriginal));
  const devolvida = this.movimentacoesParaDevolucao.filter(m => m.idMovimentacaoOrigem === saida.id)
    .reduce((total, m) => total + (m.tipoMovimento === 'AJUSTE_SAIDA' ? -1 : 1) * Number(m.quantidade || 0), 0);
  return Math.max(0, Math.round((Number(saida.quantidade || 0) - devolvida) * 1000) / 1000);
}

alterarOrigemMovimentacao(): void {
  // A origem é escolhida depois dos campos de quantidade e custo na tela.
  // Preserve o custo informado para entradas manuais; origens com custo
  // calculado pelo sistema não devem reaproveitar um valor digitado antes.
  if (this.custoAutomaticoMovimentacao !== null || this.devolucaoSelecionada) {
    this.movimento.valorUnitario = '';
  }
  this.movimento.idMovimentacaoOrigem = null;
  this.movimento.idFornecedor = null;
  if (this.exibirFornecedorMovimentacao && !this.modoPaginado) {
    this.carregandoFornecedoresMovimentacao = true;
    this.service.listarFornecedoresMovimentacao().subscribe({
      next: lista => { this.fornecedoresMovimentacao = lista || []; this.carregandoFornecedoresMovimentacao = false; },
      error: () => { this.carregandoFornecedoresMovimentacao = false; this.notificacoes.erro('Não foi possível consultar os fornecedores. Selecione novamente a origem para tentar outra vez.'); }
    });
  }
  this.movimentacoesParaDevolucao = [];
  this.carregandoSaidasDevolucao = false;
  if(this.modoPaginado)return;
  if (!(this.devolucaoSelecionada || this.correcaoSelecionada || this.devolucaoFornecedorSelecionada) || !this.estoqueSelecionado?.id) return;
  const id = this.estoqueSelecionado.id;
  this.carregandoSaidasDevolucao = true;
  this.service.listarMovimentacoes(id).subscribe({
    next: lista => {
      if (!(this.devolucaoSelecionada || this.correcaoSelecionada || this.devolucaoFornecedorSelecionada) || this.estoqueSelecionado?.id !== id) return;
      this.movimentacoesParaDevolucao = lista || []; this.carregandoSaidasDevolucao = false;
    },
    error: () => {
      if (!(this.devolucaoSelecionada || this.correcaoSelecionada || this.devolucaoFornecedorSelecionada) || this.estoqueSelecionado?.id !== id) return;
      this.carregandoSaidasDevolucao = false;
      this.notificacoes.erro('Não foi possível consultar as movimentações originais. Selecione novamente a origem para tentar outra vez.');
    }
  });
}

get custoAutomaticoMovimentacao(): number | null {
  if (this.tipoMovimentacaoSelecionado === 'ENTRADA' && this.movimento.origem === 'BONIFICACAO') return 0;
  if (this.devolucaoSelecionada && this.movimento.idMovimentacaoOrigem) {
    const saida = this.saidasDisponiveisDevolucao.find(m => m.id === this.movimento.idMovimentacaoOrigem);
    return saida?.valorUnitario == null ? null : Number(saida.valorUnitario);
  }
  if (this.devolucaoSelecionada) return null;
  if (this.tipoMovimentacaoSelecionado !== 'ENTRADA' || this.devolucaoSelecionada) {
    const custo = this.estoqueSelecionado?.custoMedio;
    return custo == null || custo === '' ? null : this.numeroEstoque(custo);
  }
  return null;
}

get custoMovimentacaoObrigatorio(): boolean {
  return this.exibirCampoValorUnitario() && !this.devolucaoSelecionada && this.custoAutomaticoMovimentacao === null;
}

get custoMovimentacaoNumerico(): number | null {
  if (this.custoAutomaticoMovimentacao !== null) return this.custoAutomaticoMovimentacao;
  const texto = this.converterMoedaOpcionalParaNumero(this.movimento.valorUnitario);
  const valor = texto ? Number(texto) : NaN;
  return Number.isFinite(valor) ? valor : null;
}

get custoMovimentacaoValido(): boolean {
  const custo = this.custoMovimentacaoNumerico;
  return custo !== null && custo >= 0 && !(this.movimento.origem === 'COMPRA' && custo === 0);
}

get quantidadeMovimentacaoValida(): boolean {
  const quantidade = this.numeroEstoque(this.movimento.quantidade);
  if (!Number.isFinite(quantidade) || quantidade <= 0) return false;
  if (this.isMovimentacaoSaida() && quantidade > this.quantidadeDisponivelEstoque(this.estoqueSelecionado)) return false;
  if (this.devolucaoFornecedorSelecionada) {
    return !!this.recebimentoFornecedorSelecionado && quantidade <= this.quantidadeOriginalCorrigida(this.recebimentoFornecedorSelecionado);
  }
  if (this.correcaoSelecionada) {
    const original = this.movimentacoesDisponiveisCorrecao.find(m => m.id === this.movimento.idMovimentacaoOrigem);
    if (!original) return false;
    const aumentaOriginal = this.tipoMovimentacaoSelecionado.endsWith('ENTRADA') === (original.tipoMovimento === 'ENTRADA');
    if (aumentaOriginal && original.origem === 'DEVOLUCAO_FORNECEDOR' && original.idMovimentacaoOrigem) {
      if(original.quantidadeDisponivelRecebimento!=null)return quantidade<=Number(original.quantidadeDisponivelRecebimento);
      const recebimento = this.movimentacoesParaDevolucao.find(m => m.id === original.idMovimentacaoOrigem);
      return !!recebimento && quantidade <= this.quantidadeOriginalCorrigida(recebimento);
    }
    return aumentaOriginal || quantidade <= this.quantidadeOriginalCorrigida(original);
  }
  if (this.devolucaoSelecionada && this.movimento.idMovimentacaoOrigem) {
    const saida = this.saidasDisponiveisDevolucao.find(m => m.id === this.movimento.idMovimentacaoOrigem);
    return !!saida && quantidade <= this.saldoDevolucao(saida);
  }
  return true;
}

get progressoMovimentacao(): number {
  const campos = [this.origemMovimentacaoValida, this.quantidadeMovimentacaoValida, this.custoMovimentacaoValido];
  if (this.devolucaoSelecionada) campos.push(!!this.movimento.idMovimentacaoOrigem && this.saidasDisponiveisDevolucao.some(m => m.id === this.movimento.idMovimentacaoOrigem));
  if (this.correcaoSelecionada) campos.push(this.vinculoCorrecaoValido);
  if (this.devolucaoFornecedorSelecionada) campos.push(!!this.recebimentoFornecedorSelecionado);
  if (this.exibirFornecedorMovimentacao) campos.push(this.fornecedorMovimentacaoValido);
  if (this.motivoMovimentacaoObrigatorio) campos.push(!!this.movimento.motivo?.trim());
  return Math.round(campos.filter(Boolean).length / campos.length * 100);
}

get movimentacaoProntaParaSalvar(): boolean {
  return !this.carregandoSaidasDevolucao && !(this.exibirFornecedorMovimentacao && this.carregandoFornecedoresMovimentacao) && this.progressoMovimentacao === 100;
}

get ajudaCustoMovimentacao(): string {
  if (this.devolucaoSelecionada && !this.movimento.idMovimentacaoOrigem) return 'Selecione a saída original para recuperar o custo da peça devolvida.';
  if (this.movimento.origem === 'BONIFICACAO') return 'Custo zero: peças recebidas gratuitamente.';
  if (this.devolucaoSelecionada && this.movimento.idMovimentacaoOrigem) return 'Custo recuperado da saída original selecionada.';
  if (this.custoAutomaticoMovimentacao !== null) return 'Custo médio registrado no estoque, aplicado automaticamente.';
  if (this.movimento.origem === 'COMPRA') return 'Custo pago pela oficina por unidade da peça. Deve ser maior que zero.';
  return 'Informe o custo por unidade. Se for zero, justifique no campo Motivo.';
}

rotuloOrigemMovimentacao(origem?: string | null): string { return this.apoio.rotuloOrigemMovimentacao(origem); }

  salvarMovimentacao(): void {
  if (this.acessoColaborador && this.isMovimentacaoAjuste()) return;
  if (!this.estoqueSelecionado?.id) {
    return;
  }

  const erroValidacao = this.validarMovimentacao();

  if (erroValidacao) {
    this.notificacoes.erro(erroValidacao);
    return;
  }

  const payload = this.montarPayloadMovimentacao();

  const id = this.estoqueSelecionado.id;

  let request$;

  if (this.tipoMovimentacaoSelecionado === 'ENTRADA') {
    request$ = this.service.registrarEntrada(id, payload);
  } else if (this.tipoMovimentacaoSelecionado === 'SAIDA') {
    request$ = this.service.registrarSaida(id, payload);
  } else {
    request$ = this.service.registrarAjuste(id, payload);
  }

  request$.subscribe({
    next: () => {
      this.modalMovimentacao?.hide();
      this.notificacoes.sucesso('Movimentação registrada com sucesso.');
      this.recarregar();
    },
    error: (erro: any) => {
      console.error('Erro ao registrar movimentação:', erro);

      this.notificacoes.erro(
        this.extrairMensagemErro(
          erro,
          'Erro ao registrar movimentação.'
        )
      );
    }
  });
}

  private validarMovimentacao(): string | null {
    if (this.devolucaoSelecionada && !this.movimento.idMovimentacaoOrigem) return 'Selecione a saída original. Sem uma saída identificada, utilize ajuste de inventário com justificativa.';
    if (this.correcaoSelecionada && !this.vinculoCorrecaoValido) return 'Selecione a movimentação original que será corrigida.';
    if (this.devolucaoFornecedorSelecionada && !this.recebimentoFornecedorSelecionado) return 'Selecione o recebimento original.';
    if (this.exibirFornecedorMovimentacao && !this.fornecedorMovimentacaoValido) return 'Selecione o fornecedor da movimentação.';
    if (!this.origemMovimentacaoValida) {
      return 'Selecione uma origem válida para a movimentação.';
    }
    if (this.motivoMovimentacaoObrigatorio && !this.movimento.motivo?.trim()) {
      return 'Preencha o motivo para justificar o ajuste ou a movimentação.';
    }
    if (!this.custoMovimentacaoValido) return 'Informe um custo unitário válido. Compras exigem um valor maior que zero; saídas exigem custo médio cadastrado.';
    if (!this.quantidadeMovimentacaoValida) return 'Informe uma quantidade válida, respeitando o estoque disponível e o saldo da movimentação original.';
    if (!String(this.movimento.quantidade ?? '').trim()) {
      return 'Informe a quantidade da movimentação.';
    }

    const quantidade = this.numeroEstoque(this.movimento.quantidade);

    if (Number.isNaN(quantidade) || quantidade <= 0) {
      return 'A quantidade da movimentação deve ser maior que zero.';
    }

    if (
      this.tipoMovimentacaoSelecionado === 'SAIDA' ||
      this.tipoMovimentacaoSelecionado === 'AJUSTE_SAIDA'
    ) {
      const disponivel = this.quantidadeDisponivelEstoque(this.estoqueSelecionado);

      if (quantidade > disponivel) {
        return 'A quantidade informada é maior que o saldo disponível.';
      }
    }

    return null;
  }


  private montarPayloadMovimentacao(): MovimentacaoEstoquePecaRequest {
  return {
    tipoMovimento: this.tipoMovimentacaoSelecionado,
    quantidade: this.converterQuantidadeParaBackend(this.movimento.quantidade),
    valorUnitario: this.custoMovimentacaoNumerico?.toFixed(2) || '',
    idMovimentacaoOrigem: (this.devolucaoSelecionada || this.correcaoSelecionada || this.devolucaoFornecedorSelecionada) ? this.movimento.idMovimentacaoOrigem ?? null : null,
    idFornecedor: this.devolucaoFornecedorSelecionada ? this.recebimentoFornecedorSelecionado?.idFornecedor ?? this.movimento.idFornecedor ?? null : this.exibirFornecedorMovimentacao ? this.movimento.idFornecedor ?? null : null,
    origem: this.limparOpcional(this.movimento.origem),
    documentoReferencia: this.limparOpcional(this.movimento.documentoReferencia),
    motivo: this.limparOpcional(this.movimento.motivo),
    observacoes: this.limparOpcional(this.movimento.observacoes),
    idUsuario: this.movimento.idUsuario ?? null
  };
}

  abrirModalMovimentacoes(item: EstoquePeca): void {
    if (!item.id) {
      return;
    }

    this.estoqueSelecionado = item;
    this.movimentacoes = [];
    if(this.modoPaginado){
      this.paginaMovimentacoes=0;this.buscaMovimentacoes='';this.totalMovimentacoes=0;
      const el=document.getElementById('modalHistoricoMovimentacoes');if(!el)return;
      this.modalMovimentacoes=bootstrap.Modal.getOrCreateInstance(el);this.modalMovimentacoes.show();this.carregarPaginaMovimentacoes();return;
    }

    this.service.listarMovimentacoes(item.id).subscribe({
      next: (lista) => {
        this.movimentacoes = lista ?? [];

        const el = document.getElementById('modalHistoricoMovimentacoes');

        if (!el) {
          console.error('Modal modalHistoricoMovimentacoes não encontrado.');
          return;
        }

        this.modalMovimentacoes = bootstrap.Modal.getOrCreateInstance(el);
        this.modalMovimentacoes.show();
      },
      error: (erro) => {
        console.error('Erro ao carregar movimentações:', erro);

        this.notificacoes.erro(
          this.extrairMensagemErro(
            erro,
            'Erro ao carregar movimentações do estoque.'
          )
        );
      }
    });
  }

  paginaMovimentacoes=0;tamanhoMovimentacoes=10;totalMovimentacoes=0;buscaMovimentacoes='';carregandoMovimentacoes=false;erroMovimentacoes='';
  private consultaMovimentacoes?:Subscription;
  recursoMovimentacoes():string{return 'estoque-pecas/'+this.estoqueSelecionado?.id+'/movimentacoes';}
  registrarMovimentacaoOriginal(movimento:MovimentacaoEstoquePeca|null):void{this.movimentacoesParaDevolucao=movimento?[movimento]:[];}
  carregarPaginaMovimentacoes(reiniciar=false):void{
    if(!this.estoqueSelecionado?.id)return;if(reiniciar)this.paginaMovimentacoes=0;
    this.consultaMovimentacoes?.unsubscribe();this.carregandoMovimentacoes=true;this.erroMovimentacoes='';this.movimentacoes=[];
    this.consultaMovimentacoes=this.consultaPaginada.consultar<MovimentacaoEstoquePeca>(this.recursoMovimentacoes(),{pagina:this.paginaMovimentacoes,tamanho:this.tamanhoMovimentacoes,busca:this.buscaMovimentacoes}).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next:pagina=>{this.movimentacoes=pagina.content;this.totalMovimentacoes=pagina.totalElements;this.carregandoMovimentacoes=false;
        if(this.paginaMovimentacoes>=pagina.totalPages&&this.paginaMovimentacoes>0){this.paginaMovimentacoes=Math.max(0,pagina.totalPages-1);this.carregarPaginaMovimentacoes();}},
      error:()=>{this.carregandoMovimentacoes=false;this.erroMovimentacoes='Não foi possível consultar o histórico. Clique em Atualizar para tentar novamente.';}
    });
  }

  tituloMovimentacao(): string {
    if (this.tipoMovimentacaoSelecionado === 'ENTRADA') {
      return 'Registrar Entrada de Estoque';
    }

    if (this.tipoMovimentacaoSelecionado === 'SAIDA') {
      return 'Registrar Saída de Estoque';
    }

    if (this.tipoMovimentacaoSelecionado === 'AJUSTE_ENTRADA') {
      return 'Registrar Ajuste de Entrada';
    }

    return 'Registrar Ajuste de Saída';
  }

  descricaoMovimentacao(): string {
    if (!this.estoqueSelecionado) {
      return '';
    }

    return `${this.estoqueSelecionado.nomePeca} | Atual: ${this.formatarQuantidade(this.quantidadeAtualEstoque(this.estoqueSelecionado), this.unidadeEstoque(this.estoqueSelecionado))} | Reservada: ${this.formatarQuantidade(this.quantidadeReservadaEstoque(this.estoqueSelecionado), this.unidadeEstoque(this.estoqueSelecionado))} | Disponível: ${this.formatarQuantidade(this.quantidadeDisponivelEstoque(this.estoqueSelecionado), this.unidadeEstoque(this.estoqueSelecionado))}`;
  }


  exibirCampoValorUnitario(): boolean {
    return (
      this.tipoMovimentacaoSelecionado === 'ENTRADA' ||
      this.tipoMovimentacaoSelecionado === 'AJUSTE_ENTRADA'
    );
  }

  // ======================================================
  // ALERTAS
  // ======================================================

  abrirModalAlertas(): void {
    this.atualizarListaAlertas(false);
    this.service.listarAlertasAbertos().subscribe({
      next: (lista) => {
        this.alertasAbertos = lista ?? [];

        const el = document.getElementById('modalAlertasEstoque');

        if (!el) {
          console.error('Modal modalAlertasEstoque não encontrado.');
          return;
        }

        this.modalAlertas = bootstrap.Modal.getOrCreateInstance(el);
        this.modalAlertas.show();

        this.atualizarResumo();
      },
      error: (erro) => {
        console.error('Erro ao carregar alertas:', erro);

        this.notificacoes.erro(
          this.extrairMensagemErro(
            erro,
            'Erro ao carregar alertas de estoque.'
          )
        );
      }
    });
  }

  registrarEntradaDoAlerta(alerta: AlertaEstoquePeca): void {
    if (!alerta.idEstoquePeca || this.processandoAlerta) return;
    this.processandoAlerta = true;
    this.service.buscarEstoque(alerta.idEstoquePeca).subscribe({
      next: estoque => {
        this.processandoAlerta = false;
        if (estoque.ativo === false) { this.notificacoes.aviso('Este estoque está inativo.'); return; }
        aposFecharModal('modalAlertasEstoque', this.modalAlertas, () => this.abrirModalMovimentacao(estoque, 'ENTRADA'), this.destroyRef);
      },
      error: erro => { this.processandoAlerta = false; this.notificacoes.erro(this.extrairMensagemErro(erro, 'Não foi possível abrir a entrada de estoque.')); }
    });
  }

  reconhecerAlerta(alerta: AlertaEstoquePeca): void {
    if (!alerta.id || alerta.reconhecidoEm || this.processandoAlerta) return;
    this.processandoAlerta = true;
    this.service.reconhecerAlerta(alerta.id).subscribe({
      next: resposta => { Object.assign(alerta, resposta); this.processandoAlerta = false; this.notificacoes.sucesso('Ciência registrada. O alerta permanece aberto até a normalização do estoque.'); },
      error: erro => { this.processandoAlerta = false; this.notificacoes.erro(this.extrairMensagemErro(erro, 'Não foi possível reconhecer o alerta.')); }
    });
  }

  abrirEncerramentoAlerta(alerta: AlertaEstoquePeca): void {
    this.alertaParaEncerrar = alerta;
    this.justificativaEncerramento = '';
    aposFecharModal('modalAlertasEstoque', this.modalAlertas, () => {
      const el = document.getElementById('modalEncerramentoAlerta');
      if (el) { this.modalEncerramentoAlerta = bootstrap.Modal.getOrCreateInstance(el); this.modalEncerramentoAlerta.show(); }
    }, this.destroyRef);
  }

  voltarAosAlertas(): void {
    aposFecharModal('modalEncerramentoAlerta', this.modalEncerramentoAlerta, () => this.abrirModalAlertas(), this.destroyRef);
  }

  confirmarEncerramentoAlerta(): void {
    if (!this.alertaParaEncerrar?.id || !this.justificativaEncerramentoValida || this.processandoAlerta) return;
    this.processandoAlerta = true;
    this.service.encerrarAlerta(this.alertaParaEncerrar.id, this.justificativaEncerramento.trim()).subscribe({
      next: () => { this.processandoAlerta = false; this.carregarAlertas(); this.notificacoes.sucesso('Alerta encerrado excepcionalmente. A justificativa foi registrada no histórico.'); this.voltarAosAlertas(); },
      error: erro => { this.processandoAlerta = false; this.notificacoes.erro(this.extrairMensagemErro(erro, 'Não foi possível encerrar o alerta.')); }
    });
  }

  private readonly router = injectFeedback(Router);
  configurarAlertasEstoque(): void {
    if (this.acessoColaborador) return;
    aposFecharModal('modalAlertasEstoque', this.modalAlertas, () => {
      void this.router.navigate(['/menuAdministrador/alertasColaboradores'])
        .then(() => setTimeout(() => document.getElementById('configuracao-estoque')?.scrollIntoView({ block: 'start' }), 0));
    }, this.destroyRef);
  }
  reenviarWhatsapp(alerta: AlertaEstoquePeca): void {
    if (!alerta.id) {
      return;
    }

    this.service.reenviarWhatsapp(alerta.id).subscribe({
      next: (resposta) => {
        if (resposta.whatsappEnviado) {
          this.notificacoes.sucesso('Alerta reenviado por WhatsApp com sucesso.');
        } else {
          this.notificacoes.aviso(
            resposta.ultimoErro ||
            'O alerta foi processado, mas o WhatsApp não foi enviado.'
          );
        }

        this.carregarAlertas();
        this.abrirModalAlertas();
      },
      error: (erro) => {
        console.error('Erro ao reenviar WhatsApp:', erro);

        this.notificacoes.erro(
          this.extrairMensagemErro(
            erro,
            'Erro ao reenviar alerta por WhatsApp.'
          )
        );
      }
    });
  }

  // ======================================================
  // FORMATAÇÕES
  // ======================================================

  formatarQuantidade(valor: any, unidade?: string | null): string { return this.apoio.formatarQuantidade(valor, unidade); }


  formatarQuantidadeSemUnidade(valor: any): string { return this.apoio.formatarQuantidadeSemUnidade(valor); }
  formatarMensagemAlertaEstoque(mensagem: string | null | undefined): string { return this.apoio.formatarMensagemAlertaEstoque(mensagem); }


  formatarMoedaBR(valor: any): string { return this.apoio.formatarMoedaBR(valor); }

  formatarValorUnitarioMovimento(): void {
    this.movimento.valorUnitario = this.formatarMoedaBR(this.movimento.valorUnitario);
  }

  formatarCustoMedioCadastro(): void {
    this.novoEstoque.custoMedio = this.formatarMoedaBR(this.novoEstoque.custoMedio);
  }

  formatarCustoMedioEdicao(): void {
    this.edit.custoMedio = this.formatarMoedaBR(this.edit.custoMedio);
  }

  formatarStatus(status?: string): string { return this.apoio.formatarStatus(status); }

  statusBadgeClass(status?: string): string { return this.apoio.statusBadgeClass(status); }

  movimentoBadgeClass(tipo?: string): string { return this.apoio.movimentoBadgeClass(tipo); }

  formatarTipoMovimento(tipo?: string): string { return this.apoio.formatarTipoMovimento(tipo); }

  formatarDataHora(data?: string | null): string { return this.apoio.formatarDataHora(data); }

  capitalizar(texto: string | null | undefined): string { return this.apoio.capitalizar(texto); }

  normalizarTexto(valor: any): string { return this.apoio.normalizarTexto(valor); }

  private onlyDigits(valor: any): string { return this.apoio.onlyDigits(valor); }


  voltar(): void {
    this.location.back();
  }

  // ======================================================
  // CONVERSÕES
  // ======================================================

  private converterQuantidadeParaBackend(valor: any): string { return this.apoio.converterQuantidadeParaBackend(valor); }

  private converterQuantidadeOpcionalParaBackend(valor: any): string { return this.apoio.converterQuantidadeOpcionalParaBackend(valor); }

  private converterMoedaOpcionalParaNumero(valor: any): string { return this.apoio.converterMoedaOpcionalParaNumero(valor); }

  private normalizarDecimalParaExibicao(valor: any): string { return this.apoio.normalizarDecimalParaExibicao(valor); }

  private limparOpcional(valor: string | null | undefined): string | undefined { return this.apoio.limparOpcional(valor); }

  private extrairMensagemErro(erro: any, mensagemPadrao: string): string { return this.apoio.extrairMensagemErro(erro, mensagemPadrao); }

  quantidadeAtualEstoque(item: any): number { return this.apoio.quantidadeAtualEstoque(item); }


  quantidadeReservadaEstoque(item: any): number { return this.apoio.quantidadeReservadaEstoque(item); }


  quantidadeDisponivelEstoque(item: any): number { return this.apoio.quantidadeDisponivelEstoque(item); }


  private numeroEstoque(valor: any): number { return this.apoio.numeroEstoque(valor); }


  unidadeEstoque(item: any): string { return this.apoio.unidadeEstoque(item); }

  statusCalculadoEstoque(item: any): string { return this.apoio.statusCalculadoEstoque(item); }

}
