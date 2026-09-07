import {
  AfterViewInit,
  Component,
  OnInit
} from '@angular/core';

import {
  CommonModule,
  Location
} from '@angular/common';

import { FormsModule } from '@angular/forms';

import {
  HttpClient,
  HttpHeaders
} from '@angular/common/http';

import { forkJoin } from 'rxjs';

declare var bootstrap: any;

const API_BASE = 'http://localhost:8080';

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

  fabricante?: string;

  modelo?: string;

  ativo?: boolean;

  [key: string]: any;
}


/* =========================================================
   COMPONENTE
   ========================================================= */

@Component({
  selector: 'app-exibe-regras-manutencao',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './exibe-regras-manutencao.component.html',
  styleUrls: ['./exibe-regras-manutencao.component.css']
})
export class ExibeRegrasManutencaoComponent
  implements OnInit, AfterViewInit {

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

  readonly origensOleo = [
    'MINERAL',
    'SINTETICO'
  ];


  constructor(
    private readonly http: HttpClient,
    private readonly location: Location
  ) {}


  /* =======================================================
     CICLO DE VIDA
     ======================================================= */

  ngOnInit(): void {
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

  carregarTudo(): void {

    this.loading = true;

    this.errorMsg = '';


    forkJoin({

      regras:
        this.http.get<any[]>(
          this.regraUrl,
          {
            withCredentials: true
          }
        ),

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

    }).subscribe({

      next: ({
        regras,
        servicos,
        pecas
      }) => {

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


        this.paginaAtual = 1;

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


  recarregar(): void {
    this.carregarTudo();
  }


  /* =======================================================
     NORMALIZAÇÃO DA RESPOSTA
     ======================================================= */

  private normalizarRegra(
    item: any
  ): RegraManutencaoPreventiva {

    const idServico =
      this.numeroOuNull(
        item?.idServico
        ?? item?.id_servico
        ?? item?.servico?.id
      );

    const idPeca =
      this.numeroOuNull(
        item?.idPeca
        ?? item?.id_peca
        ?? item?.peca?.id
      );


    return {

      id:
        this.numeroOuUndefined(
          item?.id
        ),

      grupoManutencao:
        this.texto(
          item?.grupoManutencao
          ?? item?.grupo_manutencao
        ),

      descricao:
        this.texto(
          item?.descricao
        ),

      idServico,

      idPeca,

      origemOleo:
        this.textoOuNull(
          item?.origemOleo
          ?? item?.origem_oleo
        ),

      intervaloKm:
        this.numeroOuNull(
          item?.intervaloKm
          ?? item?.intervalo_km
        ),

      intervaloDias:
        this.numeroOuNull(
          item?.intervaloDias
          ?? item?.intervalo_dias
        ),

      prioridade:
        this.numeroOuPadrao(
          item?.prioridade,
          100
        ),

      ativo:
        this.booleano(
          item?.ativo,
          true
        ),

      observacoes:
        this.textoOuNull(
          item?.observacoes
        ),

      nomeServico:
        this.textoOuNull(
          item?.nomeServico
          ?? item?.nome_servico
          ?? item?.servico?.nome
          ?? item?.servico?.descricao
        ),

      nomePeca:
        this.textoOuNull(
          item?.nomePeca
          ?? item?.nome_peca
          ?? item?.peca?.nome
          ?? item?.peca?.descricao
        ),

      servico:
        item?.servico,

      peca:
        item?.peca,

      criadoEm:
        item?.criadoEm
        ?? item?.criado_em,

      atualizadoEm:
        item?.atualizadoEm
        ?? item?.atualizado_em
    };
  }


  /* =======================================================
     FILTROS
     ======================================================= */

  get regrasFiltradas():
    RegraManutencaoPreventiva[] {

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
  }


  aoAlterarFiltros(): void {
    this.paginaAtual = 1;
  }


  /* =======================================================
     RESUMOS
     ======================================================= */

  get totalRegras(): number {
    return this.todasRegras.length;
  }


  get totalAtivas(): number {

    return this.todasRegras.filter(
      regra =>
        this.regraAtiva(regra)
    ).length;
  }


  get totalInativas(): number {

    return this.todasRegras.filter(
      regra =>
        !this.regraAtiva(regra)
    ).length;
  }


  get totalTrocaOleo(): number {

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
    number {

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
    RegraManutencaoPreventiva[] {

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
  }


  paginaAnterior(): void {

    if (this.paginaAtual > 1) {
      this.paginaAtual--;
    }
  }


  proximaPagina(): void {

    if (
      this.paginaAtual
      < this.totalPaginas
    ) {
      this.paginaAtual++;
    }
  }


  irParaPagina(
    pagina: number
  ): void {

    if (
      pagina < 1
      || pagina > this.totalPaginas
    ) {
      return;
    }

    this.paginaAtual = pagina;
  }


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

      return;
    }


    this.colunaOrdenacao =
      coluna;

    this.direcaoOrdenacao =
      'asc';
  }


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
     CADASTRO
     ======================================================= */

  abrirCadastro(): void {

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

          alert(
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

        alert(
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
              this.formulario
                .origemOleo
              || null
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


    const intervaloKm =
      Number(
        this.formulario
          .intervaloKm
        || 0
      );

    const intervaloDias =
      Number(
        this.formulario
          .intervaloDias
        || 0
      );


    if (
      intervaloKm <= 0
      && intervaloDias <= 0
    ) {

      return (
        'Informe pelo menos um intervalo de manutenção: quilometragem ou quantidade de dias.'
      );
    }


    if (
      intervaloKm < 0
      || intervaloDias < 0
    ) {

      return (
        'Os intervalos de manutenção não podem ser negativos.'
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


    if (
      Number(
        this.formulario
          .prioridade
      ) < 0
    ) {

      return (
        'A prioridade não pode ser negativa.'
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

        alert(
          'Regra de manutenção ativada com sucesso.'
        );

        this.recarregar();
      },

      error: erro => {

        console.error(
          'Erro ao ativar regra:',
          erro
        );

        alert(
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

        alert(
          'Regra de manutenção desativada com sucesso.'
        );

        this.recarregar();
      },

      error: erro => {

        console.error(
          'Erro ao desativar regra:',
          erro
        );

        alert(
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

        alert(
          'Regra de manutenção removida com sucesso.'
        );

        this.recarregar();
      },

      error: erro => {

        console.error(
          'Erro ao remover regra:',
          erro
        );

        alert(
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
  ): string {

    return (
      servico?.nome
      || servico?.descricao
      || (
        servico?.id
          ? `Serviço #${servico.id}`
          : 'Serviço'
      )
    );
  }


  nomePeca(
    peca:
      PecaResumo
  ): string {

    return (
      peca?.nome
      || peca?.descricao
      || (
        peca?.id
          ? `Peça #${peca.id}`
          : 'Peça'
      )
    );
  }


  /* =======================================================
     FORMATAÇÃO
     ======================================================= */

  regraAtiva(
    regra:
      RegraManutencaoPreventiva
  ): boolean {

    return regra?.ativo !== false;
  }


  formatarGrupo(
    grupo?: string | null
  ): string {

    if (!grupo) {
      return '—';
    }

    return this.formatarEnum(
      grupo
    );
  }


  formatarOrigemOleo(
    origem?: string | null
  ): string {

    if (!origem) {
      return 'Não se aplica';
    }


    return this.formatarEnum(
      origem
    );
  }


  formatarPrioridade(
    prioridade?: number | null
  ): string {

    if (
      prioridade === undefined
      || prioridade === null
    ) {
      return '100';
    }

    return String(prioridade);
  }


  formatarIntervalo(
    regra:
      RegraManutencaoPreventiva
  ): string {

    const partes: string[] = [];


    if (
      regra.intervaloKm
      && regra.intervaloKm > 0
    ) {

      partes.push(
        `${this.formatarNumero(
          regra.intervaloKm
        )} km`
      );
    }


    if (
      regra.intervaloDias
      && regra.intervaloDias > 0
    ) {

      partes.push(
        `${this.formatarNumero(
          regra.intervaloDias
        )} dia(s)`
      );
    }


    return (
      partes.length
        ? partes.join(' ou ')
        : '—'
    );
  }


  formatarNumero(
    valor:
      number | string
  ): string {

    const numero =
      Number(valor || 0);


    return numero.toLocaleString(
      'pt-BR',
      {
        maximumFractionDigits: 0
      }
    );
  }


  formatarDataHora(
    valor?:
      string | null
  ): string {

    if (!valor) {
      return '—';
    }


    const data =
      new Date(valor);


    if (
      Number.isNaN(
        data.getTime()
      )
    ) {
      return valor;
    }


    return data.toLocaleString(
      'pt-BR'
    );
  }


  formatarEnum(
    valor:
      string
  ): string {

    if (!valor) {
      return '—';
    }


    return valor
      .toLowerCase()
      .split('_')
      .filter(Boolean)
      .map(
        palavra =>
          palavra.charAt(0)
            .toUpperCase()
          + palavra.slice(1)
      )
      .join(' ');
  }


  classeGrupo(
    grupo?: string | null
  ): string {

    switch (
      grupo
    ) {

      case 'TROCA_OLEO':
        return 'badge-grupo-oleo';

      case 'FILTRO_AR':
        return 'badge-grupo-filtro';

      case 'PASTILHA_FREIO':
        return 'badge-grupo-freio';

      default:
        return 'badge-grupo-outro';
    }
  }


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
    RegraManutencaoPreventivaRequest {

    return {

      grupoManutencao:
        '',

      descricao:
        '',

      idServico:
        null,

      idPeca:
        null,

      origemOleo:
        null,

      intervaloKm:
        null,

      intervaloDias:
        null,

      prioridade:
        100,

      ativo:
        true,

      observacoes:
        null
    };
  }


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
  ): string {

    return (
      valor || ''
    )
      .trim()
      .toUpperCase()
      .normalize('NFD')
      .replace(
        /[\u0300-\u036f]/g,
        ''
      )
      .replace(
        /[^A-Z0-9]+/g,
        '_'
      )
      .replace(
        /^_+|_+$/g,
        ''
      );
  }


  private normalizarTexto(
    valor:
      any
  ): string {

    return String(
      valor ?? ''
    )
      .normalize('NFD')
      .replace(
        /[\u0300-\u036f]/g,
        ''
      )
      .toLowerCase()
      .trim();
  }


  private texto(
    valor:
      any
  ): string {

    if (
      valor === undefined
      || valor === null
    ) {
      return '';
    }

    return String(valor).trim();
  }


  private textoOuNull(
    valor:
      any
  ): string | null {

    const texto =
      this.texto(valor);

    return (
      texto
        ? texto
        : null
    );
  }


  private numeroOuNull(
    valor:
      any
  ): number | null {

    if (
      valor === undefined
      || valor === null
      || valor === ''
    ) {
      return null;
    }


    const numero =
      Number(valor);


    return (
      Number.isFinite(numero)
        ? numero
        : null
    );
  }


  private numeroOuUndefined(
    valor:
      any
  ): number | undefined {

    const numero =
      this.numeroOuNull(valor);


    return (
      numero === null
        ? undefined
        : numero
    );
  }


  private numeroOuPadrao(
    valor:
      any,
    padrao:
      number
  ): number {

    const numero =
      this.numeroOuNull(valor);


    return (
      numero === null
        ? padrao
        : numero
    );
  }


  private numeroPositivoOuNull(
    valor:
      any
  ): number | null {

    const numero =
      this.numeroOuNull(valor);


    if (
      numero === null
      || numero <= 0
    ) {
      return null;
    }


    return Math.round(numero);
  }


  private booleano(
    valor:
      any,
    padrao:
      boolean
  ): boolean {

    if (
      valor === undefined
      || valor === null
      || valor === ''
    ) {
      return padrao;
    }


    if (
      typeof valor === 'boolean'
    ) {
      return valor;
    }


    if (
      typeof valor === 'number'
    ) {
      return valor !== 0;
    }


    const texto =
      String(valor)
        .trim()
        .toLowerCase();


    if (
      [
        'false',
        '0',
        'nao',
        'não',
        'inativo'
      ].includes(texto)
    ) {
      return false;
    }


    if (
      [
        'true',
        '1',
        'sim',
        'ativo'
      ].includes(texto)
    ) {
      return true;
    }


    return padrao;
  }


  private extrairMensagemErro(
    erro: any,
    padrao: string
  ): string {

    if (
      typeof erro?.error === 'string'
      && erro.error.trim()
    ) {
      return erro.error;
    }


    if (
      typeof erro?.error?.message
        === 'string'
      && erro.error.message.trim()
    ) {
      return erro.error.message;
    }


    if (
      typeof erro?.error?.mensagem
        === 'string'
      && erro.error.mensagem.trim()
    ) {
      return erro.error.mensagem;
    }


    if (
      typeof erro?.message
        === 'string'
      && erro.message.trim()
    ) {
      return erro.message;
    }


    return padrao;
  }


  trackByRegra = (
    index: number,
    regra:
      RegraManutencaoPreventiva
  ) => regra.id ?? index;


  voltar(): void {
    this.location.back();
  }
}
