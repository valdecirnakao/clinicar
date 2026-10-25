import { RegraManutencaoApoio } from './regra-manutencao-apoio';
import { SeletorRemotoComponent } from '../../../shared/tabelas/seletor-remoto.component';
import { PaginacaoComponent } from '../../../shared/tabelas/paginacao.component';
import { ConsultaPaginadaService, PaginaCadastro } from '../../../shared/tabelas/consulta-paginada.service';
import { Observable, Subscription, map, tap } from 'rxjs';
import { DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EstadoDuplicidade, ValidarDuplicidadeDirective } from '../../../shared/duplicidade/validar-duplicidade.directive';
import { FieldHelpPanelComponent } from '../../../shared/field-help/field-help-panel.component';
import { FieldHelpDirective } from '../../../shared/field-help/field-help.directive';
import { FeedbackDirective } from '../../../shared/feedback/feedback.directive';
import { inject as injectFeedback } from '@angular/core';
import { NotificacaoService } from '../../../shared/feedback/notificacao.service';
import {
  AfterViewInit,
  Component,
  OnInit
} from '@angular/core';

import { CommonModule, Location } from '@angular/common';

import { FormsModule } from '@angular/forms';

import {
  HttpClient,
  HttpHeaders
} from '@angular/common/http';

import { forkJoin, of } from 'rxjs';

declare var bootstrap: any;

const API_BASE = '';

type ModoFormulario = 'cadastro' | 'edicao';

type TipoConfirmacao =
  | 'ativar'
  | 'desativar'
  | 'excluir';

type DirecaoOrdenacao =
  | 'asc'
  | 'desc';

type ColunaOrdenacao =
  | 'prioridade'
  | 'grupoManutencao'
  | 'descricao'
  | 'servico'
  | 'peca'
  | 'intervalo'
  | 'origemOleo'
  | 'ativo';


/* =========================================================
   INTERFACES
   ========================================================= */

export interface RegraManutencaoPreventiva {

  id?: number;

  grupoManutencao: string;

  descricao: string;

  idServico?: number | null;

  idPeca?: number | null;

  origemOleo?: string | null;

  intervaloKm?: number | null;

  intervaloDias?: number | null;

  prioridade: number;

  ativo: boolean;

  observacoes?: string | null;

  /*
   * Campos auxiliares.
   *
   * Eles permitem que o componente funcione tanto caso
   * o backend devolva os nomes diretamente quanto caso
   * devolva objetos relacionados.
   */
  nomeServico?: string | null;

  nomePeca?: string | null;

  servico?: any;

  peca?: any;

  criadoEm?: string;

  atualizadoEm?: string;
}


export interface RegraManutencaoPreventivaRequest {

  grupoManutencao: string;

  descricao: string;

  idServico: number | null;

  idPeca: number | null;

  origemOleo: string | null;

  intervaloKm: number | null;

  intervaloDias: number | null;

  prioridade: number;

  ativo: boolean;

  observacoes: string | null;
}


export interface ServicoResumo {

  id?: number;

  nome?: string;

  descricao?: string;

  categoria?: string;

  ativo?: boolean;

  [key: string]: any;
}


export interface PecaResumo {

  id?: number;

  nome?: string;

  descricao?: string;

  tipo?: string;

  origemOleo?: string | null;

  fabricante?: string;

  modelo?: string;

  ativo?: boolean;

  [key: string]: any;
}


/* =========================================================
   COMPONENTE
   ========================================================= */

@Component({
    selector: 'app-regra-manutencao',
    imports: [SeletorRemotoComponent,PaginacaoComponent,ValidarDuplicidadeDirective, FieldHelpPanelComponent, FieldHelpDirective, FeedbackDirective,
        CommonModule,
        FormsModule
    ],
    templateUrl: './regra-manutencao.component.html',
    styleUrls: ['./regra-manutencao.component.css']
})
export class RegraManutencaoComponent
  implements OnInit, AfterViewInit {
  private readonly apoio = new RegraManutencaoApoio();
  duplicidades = new WeakMap<object, EstadoDuplicidade>();
  erroDuplicidade(model: object): string | null { return this.duplicidades.get(model)?.mensagem || null; }

  private readonly notificacoes = injectFeedback(NotificacaoService);

  /* =======================================================
     URLs
     ======================================================= */

  private readonly regraUrl =
    `${API_BASE}/api/regra-manutencao-preventiva`;

  private readonly servicoUrl =
    `${API_BASE}/api/servico`;

  private readonly pecaUrl =
    `${API_BASE}/api/peca`;

  private readonly jsonHeaders =
    new HttpHeaders({
      'Content-Type': 'application/json'
    });


  /* =======================================================
     LISTAGENS
     ======================================================= */

  regras: RegraManutencaoPreventiva[] = [];

  private todasRegras:
    RegraManutencaoPreventiva[] = [];

  servicos: ServicoResumo[] = [];

  pecas: PecaResumo[] = [];


  /* =======================================================
     FILTROS
     ======================================================= */

  filtroTexto = '';

  filtroStatus = '';

  filtroGrupo = '';

  filtroOrigemOleo = '';


  /* =======================================================
     PAGINAÇÃO
     ======================================================= */

  paginaAtual = 1;

  itensPorPagina = 10;

  readonly opcoesItensPorPagina =
    [5, 10, 20, 50];


  /* =======================================================
     ORDENAÇÃO
     ======================================================= */

  colunaOrdenacao: ColunaOrdenacao =
    'prioridade';

  direcaoOrdenacao: DirecaoOrdenacao =
    'asc';


  /* =======================================================
     ESTADO DA TELA
     ======================================================= */

  loading = false;

  salvando = false;

  errorMsg = '';

  mensagemErroModal = '';


  /* =======================================================
     MODAIS
     ======================================================= */

  modalFormulario: any;

  modalDetalhes: any;

  modalConfirmacao: any;


  /* =======================================================
     FORMULÁRIO
     ======================================================= */

  modoFormulario: ModoFormulario =
    'cadastro';

  editId: number | null = null;

  formulario:
    RegraManutencaoPreventivaRequest =
    this.novoFormulario();


  /* =======================================================
     REGISTROS SELECIONADOS
     ======================================================= */

  regraDetalhe:
    RegraManutencaoPreventiva | null =
    null;

  regraAcao:
    RegraManutencaoPreventiva | null =
    null;

  tipoConfirmacao:
    TipoConfirmacao =
    'desativar';


  /* =======================================================
     VALORES SUGERIDOS
     ======================================================= */

  readonly gruposSugeridos = [
    'TROCA_OLEO',
    'FILTRO_AR',
    'PASTILHA_FREIO'
  ];

  origensOleo = [
    'MINERAL',
    'SINTETICO',
    'SEMISSINTETICO'
  ];


  constructor(
    private readonly http: HttpClient,
    private readonly location: Location
  ) {}


  /* =======================================================
     CICLO DE VIDA
     ======================================================= */

  modoPaginado=false;
  private readonly destroyRef=injectFeedback(DestroyRef);
  private readonly consultaPaginada=injectFeedback(ConsultaPaginadaService);
  private paginaServidor?:PaginaCadastro<RegraManutencaoPreventiva>;
  private consultaPagina?:Subscription;
  private filtroTimer?:ReturnType<typeof setTimeout>;
  private consultarPagina():Observable<PaginaCadastro<RegraManutencaoPreventiva>> {
    return this.consultaPaginada.consultar<RegraManutencaoPreventiva>('regra-manutencao-preventiva',{pagina:this.paginaAtual-1,tamanho:this.itensPorPagina,busca:this.filtroTexto,ordenar:({servico:'servico.nome',peca:'peca.nome'} as Record<string,string>)[this.colunaOrdenacao]??this.colunaOrdenacao,decrescente:this.direcaoOrdenacao==='desc',ativo:this.filtroStatus==='ativo'?'true':this.filtroStatus==='inativo'?'false':'',grupoManutencao:this.filtroGrupo,origemOleo:this.filtroOrigemOleo}).pipe(tap(pagina=>this.paginaServidor=pagina));
  }
  private carregarPagina(esperar=false):void {
    if(!this.modoPaginado)return;
    clearTimeout(this.filtroTimer);
    if(esperar){this.filtroTimer=setTimeout(()=>this.carregarPagina(),250);return;}
    this.consultaPagina?.unsubscribe();this.loading=true;this.errorMsg='';
    this.consultaPagina=this.consultarPagina().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({next:pagina=>{
      this.todasRegras=pagina.content.map(item=>this.normalizarRegra(item));this.loading=false;
      if(this.paginaAtual>Math.max(1,pagina.totalPages)){this.paginaAtual=Math.max(1,pagina.totalPages);this.carregarPagina();}
    },error:erro=>{this.loading=false;this.errorMsg=this.extrairMensagemErro(erro,'Não foi possível carregar a página.');}});
  }
  ngOnInit(): void {this.modoPaginado=true;this.destroyRef.onDestroy(()=>clearTimeout(this.filtroTimer));
    this.carregarTudo();
  }


  ngAfterViewInit(): void {
    this.inicializarModais();
  }


  private inicializarModais(): void {

    const formularioElement =
      document.getElementById(
        'modalRegraManutencao'
      );

    const detalhesElement =
      document.getElementById(
        'modalDetalhesRegraManutencao'
      );

    const confirmacaoElement =
      document.getElementById(
        'modalConfirmacaoRegraManutencao'
      );


    if (
      typeof bootstrap === 'undefined'
      || !bootstrap.Modal
    ) {
      console.warn(
        'Bootstrap Modal não está disponível.'
      );

      return;
    }


    if (formularioElement) {
      this.modalFormulario =
        bootstrap.Modal.getOrCreateInstance(
          formularioElement
        );
    }


    if (detalhesElement) {
      this.modalDetalhes =
        bootstrap.Modal.getOrCreateInstance(
          detalhesElement
        );
    }


    if (confirmacaoElement) {
      this.modalConfirmacao =
        bootstrap.Modal.getOrCreateInstance(
          confirmacaoElement
        );
    }
  }


  /* =======================================================
     CARREGAMENTO
     ======================================================= */

  registrarCatalogo(campo:string,item:any):void { this.apoio.registrarCatalogo(campo, item); }
  private catalogosCarregados=false;
  private carregandoCatalogos=false;
  carregarTudo(somenteCatalogos=false): void {
    if(this.modoPaginado&&!somenteCatalogos){this.carregarPagina();return;}
    if(somenteCatalogos && this.modoPaginado)return;
    if(somenteCatalogos){if(this.catalogosCarregados||this.carregandoCatalogos)return;this.carregandoCatalogos=true;}

    this.loading = true;

    this.errorMsg = '';


    forkJoin({

      regras:
        somenteCatalogos?of(this.todasRegras):this.consultarPagina().pipe(map(pagina=>pagina.content)),

      servicos:
        this.http.get<ServicoResumo[]>(
          this.servicoUrl,
          {
            withCredentials: true
          }
        ),

      pecas:
        this.http.get<PecaResumo[]>(
          this.pecaUrl,
          {
            withCredentials: true
          }
        )

    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({

      next: ({
        regras,
        servicos,
        pecas
      }) => {
        if(somenteCatalogos){this.catalogosCarregados=true;this.carregandoCatalogos=false;}

        this.servicos =
          (servicos || [])
            .filter(
              item =>
                item?.id !== undefined
                && item?.id !== null
            )
            .sort(
              (a, b) =>
                this.nomeServico(a)
                  .localeCompare(
                    this.nomeServico(b),
                    'pt-BR'
                  )
            );


        this.pecas =
          (pecas || [])
            .filter(
              item =>
                item?.id !== undefined
                && item?.id !== null
            )
            .sort(
              (a, b) =>
                this.nomePeca(a)
                  .localeCompare(
                    this.nomePeca(b),
                    'pt-BR'
                  )
            );

        this.todasRegras =
          (regras || [])
            .map(
              item =>
                this.normalizarRegra(item)
            );


        this.regras =
          [...this.todasRegras];


        if(!somenteCatalogos)this.paginaAtual = 1;

        this.loading = false;
      },

      error: erro => {

        console.error(
          'Erro ao carregar regras de manutenção:',
          erro
        );

        this.loading = false;

        this.errorMsg =
          this.extrairMensagemErro(
            erro,
            'Não foi possível carregar as regras de manutenção preventiva.'
          );
      }

    });
  }


  recarregar(): void {if(this.modoPaginado){this.carregarPagina();return;}
    this.carregarTudo();
  }


  /* =======================================================
     NORMALIZAÇÃO DA RESPOSTA
     ======================================================= */

  private normalizarRegra(
    item: any
  ): RegraManutencaoPreventiva { return this.apoio.normalizarRegra(item); }


  /* =======================================================
     FILTROS
     ======================================================= */

  get regrasFiltradas():
    RegraManutencaoPreventiva[] {if(this.modoPaginado)return this.todasRegras;

    const texto =
      this.normalizarTexto(
        this.filtroTexto
      );

    const status =
      this.filtroStatus.trim();

    const grupo =
      this.filtroGrupo.trim();

    const origem =
      this.filtroOrigemOleo.trim();


    const filtradas =
      this.todasRegras.filter(
        regra => {

          const conteudo =
            this.normalizarTexto(
              [
                regra.grupoManutencao,
                regra.descricao,
                this.servicoRegra(regra),
                this.pecaRegra(regra),
                regra.origemOleo,
                regra.observacoes
              ].join(' ')
            );


          const atendeTexto =
            !texto
            || conteudo.includes(texto);


          const atendeStatus =
            !status
            || (
              status === 'ativo'
              && this.regraAtiva(regra)
            )
            || (
              status === 'inativo'
              && !this.regraAtiva(regra)
            );


          const atendeGrupo =
            !grupo
            || regra.grupoManutencao === grupo;


          const atendeOrigem =
            !origem
            || regra.origemOleo === origem;


          return (
            atendeTexto
            && atendeStatus
            && atendeGrupo
            && atendeOrigem
          );
        }
      );


    return this.ordenarRegras(
      filtradas
    );
  }


  get possuiFiltrosAplicados():
    boolean {

    return !!(
      this.filtroTexto.trim()
      || this.filtroStatus.trim()
      || this.filtroGrupo.trim()
      || this.filtroOrigemOleo.trim()
    );
  }


  get gruposDisponiveis():
    string[] {

    const grupos =
      new Set<string>();

    this.gruposSugeridos.forEach(
      grupo => grupos.add(grupo)
    );

    this.todasRegras.forEach(
      regra => {

        if (
          regra.grupoManutencao
          && regra.grupoManutencao.trim()
        ) {
          grupos.add(
            regra.grupoManutencao
          );
        }
      }
    );


    return Array
      .from(grupos)
      .sort(
        (a, b) =>
          this.formatarEnum(a)
            .localeCompare(
              this.formatarEnum(b),
              'pt-BR'
            )
      );
  }


  limparFiltros(): void {

    this.filtroTexto = '';

    this.filtroStatus = '';

    this.filtroGrupo = '';

    this.filtroOrigemOleo = '';

    this.paginaAtual = 1;
  this.carregarPagina(); }


  aoAlterarFiltros(): void {
    this.paginaAtual = 1;
  this.carregarPagina(true); }


  /* =======================================================
     RESUMOS
     ======================================================= */

  get totalRegras(): number {if(this.modoPaginado)return this.paginaServidor?.resumo['total']??0;
    return this.todasRegras.length;
  }


  get totalAtivas(): number {if(this.modoPaginado)return this.paginaServidor?.resumo['ativos']??0;

    return this.todasRegras.filter(
      regra =>
        this.regraAtiva(regra)
    ).length;
  }


  get totalInativas(): number {if(this.modoPaginado)return this.paginaServidor?.resumo['inativos']??0;

    return this.todasRegras.filter(
      regra =>
        !this.regraAtiva(regra)
    ).length;
  }


  get totalTrocaOleo(): number {if(this.modoPaginado)return this.paginaServidor?.resumo['trocaOleo']??0;

    return this.todasRegras.filter(
      regra =>
        regra.grupoManutencao
          === 'TROCA_OLEO'
    ).length;
  }


  /* =======================================================
     PAGINAÇÃO
     ======================================================= */

  get totalRegistrosFiltrados():
    number {if(this.modoPaginado)return this.paginaServidor?.totalElements??0;

    return this.regrasFiltradas.length;
  }


  get totalPaginas():
    number {

    return Math.max(
      1,
      Math.ceil(
        this.totalRegistrosFiltrados
        / this.itensPorPagina
      )
    );
  }


  get indiceInicialPagina():
    number {

    if (
      this.totalRegistrosFiltrados === 0
    ) {
      return 0;
    }

    return (
      (this.paginaAtual - 1)
      * this.itensPorPagina
    ) + 1;
  }


  get indiceFinalPagina():
    number {

    return Math.min(
      this.paginaAtual
      * this.itensPorPagina,
      this.totalRegistrosFiltrados
    );
  }


  get regrasPaginadas():
    RegraManutencaoPreventiva[] {if(this.modoPaginado)return this.todasRegras;

    this.ajustarPaginaAtual();

    const inicio =
      (this.paginaAtual - 1)
      * this.itensPorPagina;

    const fim =
      inicio
      + this.itensPorPagina;

    return this.regrasFiltradas.slice(
      inicio,
      fim
    );
  }


  aoAlterarItensPorPagina(): void {

    this.paginaAtual = 1;

    this.ajustarPaginaAtual();
  this.carregarPagina(); }


  paginaAnterior(): void {

    if (this.paginaAtual > 1) {
      this.paginaAtual--;
    }
  this.carregarPagina(); }


  proximaPagina(): void {

    if (
      this.paginaAtual
      < this.totalPaginas
    ) {
      this.paginaAtual++;
    }
  this.carregarPagina(); }


  irParaPagina(
    pagina: number
  ): void {

    if (
      pagina < 1
      || pagina > this.totalPaginas
    ) {
      this.carregarPagina();return;
    }

    this.paginaAtual = pagina;
  this.carregarPagina(); }


  paginasVisiveis(): number[] {

    const total =
      this.totalPaginas;

    const atual =
      this.paginaAtual;

    const inicio =
      Math.max(
        1,
        atual - 2
      );

    const fim =
      Math.min(
        total,
        atual + 2
      );

    const paginas: number[] = [];


    for (
      let pagina = inicio;
      pagina <= fim;
      pagina++
    ) {
      paginas.push(pagina);
    }


    return paginas;
  }


  private ajustarPaginaAtual():
    void {

    if (
      this.paginaAtual
      > this.totalPaginas
    ) {
      this.paginaAtual =
        this.totalPaginas;
    }


    if (
      this.paginaAtual < 1
    ) {
      this.paginaAtual = 1;
    }
  }


  /* =======================================================
     ORDENAÇÃO
     ======================================================= */

  ordenarPor(
    coluna: ColunaOrdenacao
  ): void {

    if (
      this.colunaOrdenacao === coluna
    ) {

      this.direcaoOrdenacao =
        this.direcaoOrdenacao === 'asc'
          ? 'desc'
          : 'asc';

      this.carregarPagina();return;
    }


    this.colunaOrdenacao =
      coluna;

    this.direcaoOrdenacao =
      'asc';
  this.carregarPagina(); }


  iconeOrdenacao(
    coluna: ColunaOrdenacao
  ): string {

    if (
      this.colunaOrdenacao !== coluna
    ) {
      return 'bi-arrow-down-up';
    }


    return (
      this.direcaoOrdenacao === 'asc'
        ? 'bi-sort-up'
        : 'bi-sort-down'
    );
  }


  private ordenarRegras(
    lista:
      RegraManutencaoPreventiva[]
  ): RegraManutencaoPreventiva[] {

    const fator =
      this.direcaoOrdenacao === 'asc'
        ? 1
        : -1;


    return [...lista].sort(
      (a, b) => {

        let valorA:
          string | number = '';

        let valorB:
          string | number = '';


        switch (
          this.colunaOrdenacao
        ) {

          case 'prioridade':

            valorA =
              Number(
                a.prioridade ?? 100
              );

            valorB =
              Number(
                b.prioridade ?? 100
              );

            break;


          case 'grupoManutencao':

            valorA =
              a.grupoManutencao || '';

            valorB =
              b.grupoManutencao || '';

            break;


          case 'descricao':

            valorA =
              a.descricao || '';

            valorB =
              b.descricao || '';

            break;


          case 'servico':

            valorA =
              this.servicoRegra(a);

            valorB =
              this.servicoRegra(b);

            break;


          case 'peca':

            valorA =
              this.pecaRegra(a);

            valorB =
              this.pecaRegra(b);

            break;


          case 'intervalo':

            valorA =
              Number(
                a.intervaloKm
                ?? a.intervaloDias
                ?? 0
              );

            valorB =
              Number(
                b.intervaloKm
                ?? b.intervaloDias
                ?? 0
              );

            break;


          case 'origemOleo':

            valorA =
              a.origemOleo || '';

            valorB =
              b.origemOleo || '';

            break;


          case 'ativo':

            valorA =
              this.regraAtiva(a)
                ? 1
                : 0;

            valorB =
              this.regraAtiva(b)
                ? 1
                : 0;

            break;
        }


        if (
          typeof valorA === 'number'
          && typeof valorB === 'number'
        ) {

          return (
            valorA - valorB
          ) * fator;
        }


        return String(valorA)
          .localeCompare(
            String(valorB),
            'pt-BR',
            {
              sensitivity: 'base'
            }
          ) * fator;
      }
    );
  }


  /* =======================================================
     PROGRESSO E PREENCHIMENTO AUTOMÁTICO
     ======================================================= */

  get progressoFormulario(): number {
    const verificacoes = this.verificacoesCamposObrigatorios();
    const preenchidos = verificacoes.filter(Boolean).length;

    return Math.round((preenchidos / verificacoes.length) * 100);
  }


  get formularioProntoParaSalvar(): boolean {
    return this.validarFormulario() === null;
  }


  get mensagemBloqueioFormulario(): string {
    return this.validarFormulario() || '';
  }


  aoAlterarPecaFormulario(): void {
    const peca = this.pecaSelecionadaFormulario();

    if (!peca || !this.pecaEhOleoMotor(peca)) {
      return;
    }

    this.formulario.grupoManutencao = 'TROCA_OLEO';
    this.preencherOrigemOleoDaPeca(peca);
  }


  pecaSelecionadaEhOleoMotor(): boolean {
    const peca = this.pecaSelecionadaFormulario();

    return Boolean(peca && this.pecaEhOleoMotor(peca));
  }


  private verificacoesCamposObrigatorios(): boolean[] {
    const grupo = this.formulario.grupoManutencao?.trim() || '';
    const descricao = this.formulario.descricao?.trim() || '';
    const possuiVinculo = Boolean(
      this.numeroOuNull(this.formulario.idServico)
      || this.numeroOuNull(this.formulario.idPeca)
    );
    const possuiPeriodicidade = this.numeroPositivoValido(this.formulario.intervaloKm)
      || this.numeroPositivoValido(this.formulario.intervaloDias);
    const verificacoes = [
      Boolean(grupo),
      Boolean(descricao),
      possuiVinculo,
      possuiPeriodicidade,
      this.prioridadeValida()
    ];

    if (this.ehRegraTrocaOleoFormulario()) {
      verificacoes.push(Boolean(this.formulario.origemOleo));
    }

    return verificacoes;
  }


  private numeroPositivoValido(valor: any): boolean { return this.apoio.numeroPositivoValido(valor); }


  private prioridadeValida(): boolean {
    const valor = this.formulario.prioridade;

    if (valor === null || valor === undefined || String(valor).trim() === '') {
      return false;
    }

    const prioridade = Number(valor);

    return Number.isFinite(prioridade)
      && Number.isInteger(prioridade)
      && prioridade >= 0;
  }


  private pecaSelecionadaFormulario(): PecaResumo | null {
    const idPeca = this.numeroOuNull(this.formulario.idPeca);

    if (!idPeca) {
      return null;
    }

    return this.pecas.find(peca => Number(peca.id) === idPeca) || null;
  }


  private pecaEhOleoMotor(peca: PecaResumo): boolean { return this.apoio.pecaEhOleoMotor(peca); }


  private preencherOrigemOleoDaPeca(peca: PecaResumo): void {
    const origem = this.extrairOrigemOleoPeca(peca);

    if (!origem) {
      this.formulario.origemOleo = null;
      return;
    }

    this.formulario.origemOleo = origem;
  }


  private extrairOrigemOleoPeca(peca: PecaResumo): string | null { return this.apoio.extrairOrigemOleoPeca(peca); }


  private identificarOrigemOleoNoTexto(valor: string): string | null { return this.apoio.identificarOrigemOleoNoTexto(valor); }


  private normalizarOrigemOleo(valor: string): string { return this.apoio.normalizarOrigemOleo(valor); }


  /* =======================================================
     CADASTRO
     ======================================================= */

  abrirCadastro(): void {
    if(this.modoPaginado)this.carregarTudo(true);

    this.modoFormulario =
      'cadastro';

    this.editId =
      null;

    this.formulario =
      this.novoFormulario();

    this.mensagemErroModal =
      '';

    this.garantirModalFormulario();

    this.modalFormulario?.show();
  }


  /* =======================================================
     EDIÇÃO
     ======================================================= */

  abrirEdicao(
    regra:
      RegraManutencaoPreventiva
  ): void {
    if(this.modoPaginado)this.carregarTudo(true);

    if (!regra?.id) {
      return;
    }


    this.modoFormulario =
      'edicao';

    this.editId =
      regra.id;


    this.formulario = {

      grupoManutencao:
        regra.grupoManutencao
        || '',

      descricao:
        regra.descricao
        || '',

      idServico:
        regra.idServico
        ?? null,

      idPeca:
        regra.idPeca
        ?? null,

      origemOleo:
        regra.origemOleo
        ?? null,

      intervaloKm:
        regra.intervaloKm
        ?? null,

      intervaloDias:
        regra.intervaloDias
        ?? null,

      prioridade:
        Number(
          regra.prioridade
          ?? 100
        ),

      ativo:
        this.regraAtiva(regra),

      observacoes:
        regra.observacoes
        ?? null
    };


    this.ajustarGrupoFormulario();

    const pecaSelecionada =
      this.pecaSelecionadaFormulario();

    if (
      pecaSelecionada
      && this.pecaEhOleoMotor(pecaSelecionada)
    ) {
      this.formulario.grupoManutencao =
        'TROCA_OLEO';

      this.preencherOrigemOleoDaPeca(
        pecaSelecionada
      );
    }

    this.mensagemErroModal =
      '';

    this.garantirModalFormulario();

    this.modalFormulario?.show();
  }


  /* =======================================================
     SALVAMENTO
     ======================================================= */

  salvar(): void {

    this.mensagemErroModal =
      '';


    const mensagemValidacao =
      this.validarFormulario();


    if (mensagemValidacao) {

      this.mensagemErroModal =
        mensagemValidacao;

      return;
    }


    const payload =
      this.montarPayload();


    this.salvando = true;


    if (
      this.modoFormulario
        === 'edicao'
      && this.editId
    ) {

      this.http.put<
        RegraManutencaoPreventiva
      >(
        `${this.regraUrl}/${this.editId}`,
        payload,
        {
          headers:
            this.jsonHeaders,

          withCredentials:
            true
        }
      ).subscribe({

        next: () => {

          this.salvando = false;

          this.modalFormulario?.hide();

          this.notificacoes.sucesso(
            'Regra de manutenção atualizada com sucesso.'
          );

          this.recarregar();
        },

        error: erro => {

          console.error(
            'Erro ao atualizar regra de manutenção:',
            erro
          );

          this.salvando = false;

          this.mensagemErroModal =
            this.extrairMensagemErro(
              erro,
              'Não foi possível atualizar a regra de manutenção.'
            );
        }

      });

      return;
    }


    this.http.post<
      RegraManutencaoPreventiva
    >(
      this.regraUrl,
      payload,
      {
        headers:
          this.jsonHeaders,

        withCredentials:
          true
      }
    ).subscribe({

      next: () => {

        this.salvando = false;

        this.modalFormulario?.hide();

        this.notificacoes.sucesso(
          'Regra de manutenção cadastrada com sucesso.'
        );

        this.recarregar();
      },

      error: erro => {

        console.error(
          'Erro ao cadastrar regra de manutenção:',
          erro
        );

        this.salvando = false;

        this.mensagemErroModal =
          this.extrairMensagemErro(
            erro,
            'Não foi possível cadastrar a regra de manutenção.'
          );
      }

    });
  }


  private montarPayload():
    RegraManutencaoPreventivaRequest {

    const grupo =
      this.normalizarEnumBackend(
        this.formulario
          .grupoManutencao
      );


    return {

      grupoManutencao:
        grupo,

      descricao:
        (
          this.formulario
            .descricao || ''
        ).trim(),

      idServico:
        this.numeroOuNull(
          this.formulario
            .idServico
        ),

      idPeca:
        this.numeroOuNull(
          this.formulario
            .idPeca
        ),

      origemOleo:
        grupo === 'TROCA_OLEO'
          ? (
              this.formulario.origemOleo
                ? this.normalizarOrigemOleo(
                    this.formulario.origemOleo
                  )
                : null
            )
          : null,

      intervaloKm:
        this.numeroPositivoOuNull(
          this.formulario
            .intervaloKm
        ),

      intervaloDias:
        this.numeroPositivoOuNull(
          this.formulario
            .intervaloDias
        ),

      prioridade:
        Math.max(
          0,
          Number(
            this.formulario
              .prioridade
            ?? 100
          )
        ),

      ativo:
        this.formulario
          .ativo !== false,

      observacoes:
        this.textoOuNull(
          this.formulario
            .observacoes
        )
    };
  }


  private validarFormulario():
    string | null {
    const duplicidade = this.erroDuplicidade(this.formulario);
    if (duplicidade) return duplicidade;

    if (
      !this.formulario
        .grupoManutencao
        ?.trim()
    ) {
      return (
        'Informe o grupo de manutenção.'
      );
    }


    if (
      !this.formulario
        .descricao
        ?.trim()
    ) {
      return (
        'Informe a descrição da regra de manutenção.'
      );
    }


    if (
      !this.numeroOuNull(
        this.formulario.idServico
      )
      && !this.numeroOuNull(
        this.formulario.idPeca
      )
    ) {
      return (
        'Vincule pelo menos um serviço ou uma peça à regra de manutenção.'
      );
    }


    const intervaloKmInformado =
      this.formulario.intervaloKm !== null
      && this.formulario.intervaloKm !== undefined
      && String(this.formulario.intervaloKm).trim() !== '';

    const intervaloDiasInformado =
      this.formulario.intervaloDias !== null
      && this.formulario.intervaloDias !== undefined
      && String(this.formulario.intervaloDias).trim() !== '';

    const intervaloKm =
      Number(this.formulario.intervaloKm);

    const intervaloDias =
      Number(this.formulario.intervaloDias);


    if (
      intervaloKmInformado
      && !this.numeroPositivoValido(intervaloKm)
    ) {
      return 'Informe um intervalo em quilômetros inteiro e maior que zero.';
    }


    if (
      intervaloDiasInformado
      && !this.numeroPositivoValido(intervaloDias)
    ) {
      return 'Informe um intervalo em dias inteiro e maior que zero.';
    }


    if (
      !this.numeroPositivoValido(intervaloKm)
      && !this.numeroPositivoValido(intervaloDias)
    ) {

      return (
        'Informe pelo menos um intervalo de manutenção: quilometragem ou quantidade de dias.'
      );
    }


    const grupo =
      this.normalizarEnumBackend(
        this.formulario
          .grupoManutencao
      );


    if (
      grupo === 'TROCA_OLEO'
      && !this.formulario
        .origemOleo
    ) {

      return (
        'Informe o tipo/origem do óleo para regras de troca de óleo.'
      );
    }


    if (!this.prioridadeValida()) {

      return (
        'Informe uma prioridade inteira, com valor igual ou maior que zero.'
      );
    }


    return null;
  }


  /* =======================================================
     ALTERAÇÃO DE GRUPO
     ======================================================= */

  ajustarGrupoFormulario(): void {

    this.formulario
      .grupoManutencao =
      this.normalizarEnumBackend(
        this.formulario
          .grupoManutencao
      );


    if (
      !this.ehRegraTrocaOleoFormulario()
    ) {

      this.formulario
        .origemOleo =
        null;

      return;
    }


    const pecaSelecionada =
      this.pecaSelecionadaFormulario();

    if (
      pecaSelecionada
      && this.pecaEhOleoMotor(pecaSelecionada)
    ) {
      this.preencherOrigemOleoDaPeca(
        pecaSelecionada
      );
    }
  }


  ehRegraTrocaOleoFormulario():
    boolean {

    return (
      this.normalizarEnumBackend(
        this.formulario
          .grupoManutencao
      ) === 'TROCA_OLEO'
    );
  }


  /* =======================================================
     DETALHES
     ======================================================= */

  abrirDetalhes(
    regra:
      RegraManutencaoPreventiva
  ): void {

    this.regraDetalhe =
      regra;

    this.garantirModalDetalhes();

    this.modalDetalhes?.show();
  }


  /* =======================================================
     CONFIRMAÇÃO
     ======================================================= */

  abrirConfirmacao(
    regra:
      RegraManutencaoPreventiva,
    tipo:
      TipoConfirmacao
  ): void {

    this.regraAcao =
      regra;

    this.tipoConfirmacao =
      tipo;

    this.garantirModalConfirmacao();

    this.modalConfirmacao?.show();
  }


  confirmarAcao(): void {

    if (
      !this.regraAcao?.id
    ) {
      return;
    }


    const id =
      this.regraAcao.id;


    switch (
      this.tipoConfirmacao
    ) {

      case 'ativar':

        this.ativar(id);

        break;


      case 'desativar':

        this.desativar(id);

        break;


      case 'excluir':

        this.excluir(id);

        break;
    }
  }


  /* =======================================================
     ATIVAR
     ======================================================= */

  private ativar(
    id: number
  ): void {

    this.http.patch<
      RegraManutencaoPreventiva
    >(
      `${this.regraUrl}/${id}/ativar`,
      {},
      {
        withCredentials: true
      }
    ).subscribe({

      next: () => {

        this.modalConfirmacao?.hide();

        this.notificacoes.sucesso(
          'Regra de manutenção ativada com sucesso.'
        );

        this.recarregar();
      },

      error: erro => {

        console.error(
          'Erro ao ativar regra:',
          erro
        );

        this.notificacoes.erro(
          this.extrairMensagemErro(
            erro,
            'Não foi possível ativar a regra de manutenção.'
          )
        );
      }

    });
  }


  /* =======================================================
     DESATIVAR
     ======================================================= */

  private desativar(
    id: number
  ): void {

    this.http.patch<
      RegraManutencaoPreventiva
    >(
      `${this.regraUrl}/${id}/desativar`,
      {},
      {
        withCredentials: true
      }
    ).subscribe({

      next: () => {

        this.modalConfirmacao?.hide();

        this.notificacoes.sucesso(
          'Regra de manutenção desativada com sucesso.'
        );

        this.recarregar();
      },

      error: erro => {

        console.error(
          'Erro ao desativar regra:',
          erro
        );

        this.notificacoes.erro(
          this.extrairMensagemErro(
            erro,
            'Não foi possível desativar a regra de manutenção.'
          )
        );
      }

    });
  }


  /* =======================================================
     EXCLUSÃO
     ======================================================= */

  private excluir(
    id: number
  ): void {

    this.http.delete<void>(
      `${this.regraUrl}/${id}`,
      {
        withCredentials: true
      }
    ).subscribe({

      next: () => {

        this.modalConfirmacao?.hide();

        this.notificacoes.sucesso(
          'Regra de manutenção removida com sucesso.'
        );

        this.recarregar();
      },

      error: erro => {

        console.error(
          'Erro ao remover regra:',
          erro
        );

        this.notificacoes.erro(
          this.extrairMensagemErro(
            erro,
            'Não foi possível remover a regra de manutenção.'
          )
        );
      }

    });
  }


  /* =======================================================
     NOMES DE SERVIÇOS E PEÇAS
     ======================================================= */

  servicoRegra(
    regra:
      RegraManutencaoPreventiva
  ): string {

    if (
      regra.nomeServico
      && regra.nomeServico.trim()
    ) {
      return regra.nomeServico;
    }


    if (
      regra.servico
    ) {

      const nome =
        regra.servico.nome
        ?? regra.servico.descricao;

      if (nome) {
        return String(nome);
      }
    }


    if (
      regra.idServico
    ) {

      const servico =
        this.servicos.find(
          item =>
            Number(item.id)
            === Number(
              regra.idServico
            )
        );

      if (servico) {
        return this.nomeServico(
          servico
        );
      }
    }


    return '—';
  }


  pecaRegra(
    regra:
      RegraManutencaoPreventiva
  ): string {

    if (
      regra.nomePeca
      && regra.nomePeca.trim()
    ) {
      return regra.nomePeca;
    }


    if (
      regra.peca
    ) {

      const nome =
        regra.peca.nome
        ?? regra.peca.descricao;

      if (nome) {
        return String(nome);
      }
    }


    if (
      regra.idPeca
    ) {

      const peca =
        this.pecas.find(
          item =>
            Number(item.id)
            === Number(
              regra.idPeca
            )
        );

      if (peca) {
        return this.nomePeca(
          peca
        );
      }
    }


    return '—';
  }


  nomeServico(
    servico:
      ServicoResumo
  ): string { return this.apoio.nomeServico(servico); }


  nomePeca(
    peca:
      PecaResumo
  ): string { return this.apoio.nomePeca(peca); }


  /* =======================================================
     FORMATAÇÃO
     ======================================================= */

  regraAtiva(
    regra:
      RegraManutencaoPreventiva
  ): boolean { return this.apoio.regraAtiva(regra); }


  formatarGrupo(
    grupo?: string | null
  ): string { return this.apoio.formatarGrupo(grupo); }


  formatarOrigemOleo(
    origem?: string | null
  ): string { return this.apoio.formatarOrigemOleo(origem); }


  formatarPrioridade(
    prioridade?: number | null
  ): string { return this.apoio.formatarPrioridade(prioridade); }


  formatarIntervalo(
    regra:
      RegraManutencaoPreventiva
  ): string { return this.apoio.formatarIntervalo(regra); }


  formatarNumero(
    valor:
      number | string
  ): string { return this.apoio.formatarNumero(valor); }


  formatarDataHora(
    valor?:
      string | null
  ): string { return this.apoio.formatarDataHora(valor); }


  formatarEnum(
    valor:
      string
  ): string { return this.apoio.formatarEnum(valor); }


  classeGrupo(
    grupo?: string | null
  ): string { return this.apoio.classeGrupo(grupo); }


  /* =======================================================
     CONFIRMAÇÃO - TEXTO
     ======================================================= */

  get tituloConfirmacao():
    string {

    switch (
      this.tipoConfirmacao
    ) {

      case 'ativar':
        return 'Ativar regra';

      case 'desativar':
        return 'Desativar regra';

      case 'excluir':
        return 'Remover regra';

      default:
        return 'Confirmar ação';
    }
  }


  get mensagemConfirmacao():
    string {

    const descricao =
      this.regraAcao?.descricao
      || 'esta regra';


    switch (
      this.tipoConfirmacao
    ) {

      case 'ativar':

        return (
          `Deseja ativar a regra "${descricao}"?`
        );


      case 'desativar':

        return (
          `Deseja desativar a regra "${descricao}"? Regras inativas deixam de participar das previsões de manutenção.`
        );


      case 'excluir':

        return (
          `Deseja remover a regra "${descricao}"?`
        );


      default:

        return (
          'Deseja confirmar esta operação?'
        );
    }
  }


  get iconeConfirmacao():
    string {

    switch (
      this.tipoConfirmacao
    ) {

      case 'ativar':
        return 'bi-check-circle';

      case 'desativar':
        return 'bi-pause-circle';

      case 'excluir':
        return 'bi-trash';

      default:
        return 'bi-question-circle';
    }
  }


  /* =======================================================
     HELPERS
     ======================================================= */

  private novoFormulario():
    RegraManutencaoPreventivaRequest { return this.apoio.novoFormulario(); }


  private garantirModalFormulario():
    void {

    if (!this.modalFormulario) {
      this.inicializarModais();
    }
  }


  private garantirModalDetalhes():
    void {

    if (!this.modalDetalhes) {
      this.inicializarModais();
    }
  }


  private garantirModalConfirmacao():
    void {

    if (!this.modalConfirmacao) {
      this.inicializarModais();
    }
  }


  private normalizarEnumBackend(
    valor?: string | null
  ): string { return this.apoio.normalizarEnumBackend(valor); }


  private normalizarTexto(
    valor:
      any
  ): string { return this.apoio.normalizarTexto(valor); }


  private texto(
    valor:
      any
  ): string { return this.apoio.texto(valor); }


  private textoOuNull(
    valor:
      any
  ): string | null { return this.apoio.textoOuNull(valor); }


  private numeroOuNull(
    valor:
      any
  ): number | null { return this.apoio.numeroOuNull(valor); }


  private numeroOuUndefined(
    valor:
      any
  ): number | undefined { return this.apoio.numeroOuUndefined(valor); }


  private numeroOuPadrao(
    valor:
      any,
    padrao:
      number
  ): number { return this.apoio.numeroOuPadrao(valor, padrao); }


  private numeroPositivoOuNull(
    valor:
      any
  ): number | null { return this.apoio.numeroPositivoOuNull(valor); }


  private booleano(
    valor:
      any,
    padrao:
      boolean
  ): boolean { return this.apoio.booleano(valor, padrao); }


  private extrairMensagemErro(
    erro: any,
    padrao: string
  ): string { return this.apoio.extrairMensagemErro(erro, padrao); }


  trackByRegra = (
    index: number,
    regra:
      RegraManutencaoPreventiva
  ) => regra.id ?? index;


  voltar(): void {
    this.location.back();
  }
}
