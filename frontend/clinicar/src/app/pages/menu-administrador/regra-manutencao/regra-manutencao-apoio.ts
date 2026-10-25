import { Observable, Subscription, map, tap } from 'rxjs';
/** Regras e formatações sem estado de tela ou acesso ao servidor. */
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
export class RegraManutencaoApoio {
registrarCatalogo(campo:string,item:any):void {
    if(!item)return;
    const listas=this as unknown as Record<string,any[]>;
    listas[campo]=[...(listas[campo]||[]).filter(r=>Number(r.id)!==Number(item.id)),item];
  }

normalizarRegra(
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

numeroPositivoValido(valor: any): boolean {
    if (valor === null || valor === undefined || valor === '') {
      return false;
    }

    const numero = Number(valor);

    return Number.isFinite(numero) && Number.isInteger(numero) && numero > 0;
  }

pecaEhOleoMotor(peca: PecaResumo): boolean {
    const identificacao = this.normalizarEnumBackend([
      peca?.nome,
      peca?.descricao,
      peca?.tipo,
      peca?.modelo
    ].filter(Boolean).join(' '));

    return identificacao.includes('OLEO_MOTOR')
      || (identificacao.includes('OLEO') && identificacao.includes('MOTOR'));
  }

extrairOrigemOleoPeca(peca: PecaResumo): string | null {
    // A API de peças devolve a origem em um campo próprio. O texto da peça
    // pode omitir a origem ou mencionar outra especificação no nome.
    const origemCadastrada = this.textoOuNull(
      peca?.origemOleo ?? peca?.['origem_oleo']
    );

    if (origemCadastrada) {
      return this.identificarOrigemOleoNoTexto(origemCadastrada);
    }

    // Compatibilidade com cadastros antigos que descreviam a origem no texto.
    const descricaoCompleta = [
      peca?.tipo,
      peca?.nome,
      peca?.descricao,
      peca?.modelo
    ].filter(Boolean).join(' ');

    return this.identificarOrigemOleoNoTexto(descricaoCompleta);
  }

identificarOrigemOleoNoTexto(valor: string): string | null {
    const normalizado = this.normalizarEnumBackend(valor);

    if (
      normalizado.includes('SEMISSINTETICO')
      || normalizado.includes('SEMI_SINTETICO')
      || normalizado.includes('SEMISINTETICO')
    ) {
      return 'SEMISSINTETICO';
    }

    if (normalizado.includes('SINTETICO')) {
      return 'SINTETICO';
    }

    if (normalizado.includes('MINERAL')) {
      return 'MINERAL';
    }

    return null;
  }

normalizarOrigemOleo(valor: string): string {
    return this.identificarOrigemOleoNoTexto(valor)
      || this.normalizarEnumBackend(valor);
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


    const origemNormalizada =
      this.normalizarOrigemOleo(origem);

    if (origemNormalizada === 'MINERAL') {
      return 'Mineral';
    }

    if (origemNormalizada === 'SINTETICO') {
      return 'Sintético';
    }

    if (origemNormalizada === 'SEMISSINTETICO') {
      return 'Semissintético';
    }

    return this.formatarEnum(origemNormalizada);
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

novoFormulario():
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

normalizarEnumBackend(
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

normalizarTexto(
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

texto(
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

textoOuNull(
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

numeroOuNull(
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

numeroOuUndefined(
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

numeroOuPadrao(
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

numeroPositivoOuNull(
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

booleano(
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

extrairMensagemErro(
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
}
