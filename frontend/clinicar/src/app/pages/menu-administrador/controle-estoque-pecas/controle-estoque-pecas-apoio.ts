import { UnidadePecaPipe, formatarUnidadePeca } from '../../../shared/forms/unidade-peca.pipe';
import { forkJoin, of, map, catchError, throwError } from 'rxjs';
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
/** Regras e formatações sem estado de tela ou acesso ao servidor. */
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
export class ControleEstoquePecasApoio {
statusAcompanhamentoAlerta(alerta: AlertaEstoquePeca): string {
    return alerta.statusAlerta === 'ENCERRADO' ? 'Encerrado excepcionalmente' : alerta.statusAlerta === 'SUPERADO' ? 'Substituído por outro nível' : alerta.statusAlerta === 'RESOLVIDO' ? 'Resolvido' : 'Aberto';
  }

saldoDisponivel(item: Partial<EstoquePeca>): number {
    return this.quantidadeDisponivelEstoque(item);
  }

percentualSaldoMinimo(item: Partial<EstoquePeca>): number {
    const disponivel = this.quantidadeDisponivelEstoque(item);
    const minimo = this.numeroEstoque(
      (item as any)?.estoqueMinimo ??
      (item as any)?.estoque_minimo ??
      (item as any)?.minimo ??
      0
    );

    if (!minimo || minimo <= 0 || Number.isNaN(disponivel) || Number.isNaN(minimo)) {
      return 100;
    }

    return Math.max(0, Math.min(100, Math.round((disponivel / minimo) * 100)));
  }

reposicaoEstoquePendente(model: Partial<EstoquePeca>): boolean {
    return this.validarReposicaoEstoque(model) !== null;
  }

custoMedioObrigatorio(model: Partial<EstoquePeca>): boolean {
    const quantidadeAtual = this.numeroFormulario(model.quantidadeAtual);

    return !Number.isNaN(quantidadeAtual) && quantidadeAtual > 0;
  }

valorOrdenacao(item: EstoquePeca, coluna: ColunaOrdenacaoEstoque): string | number {
    if (coluna === 'quantidadeAtual') {
      return this.quantidadeAtualEstoque(item);
    }

    if (coluna === 'quantidadeReservada') {
      return this.quantidadeReservadaEstoque(item);
    }

    if (coluna === 'estoqueMinimo' || coluna === 'custoMedio') {
      return this.numeroEstoque((item as any)[coluna]);
    }

    if (coluna === 'statusEstoque') {
      return this.statusCalculadoEstoque(item);
    }

    return this.normalizarTexto((item as any)[coluna]);
  }

validarRegrasNumericasEstoque(model: Partial<EstoquePeca>): string | null {
    const atual = this.quantidadeAtualEstoque(model);
    const reservada = this.quantidadeReservadaEstoque(model);
    const minimo = this.numeroEstoque((model as any).estoqueMinimo);
    const critico = this.numeroEstoque((model as any).estoqueCritico);

    if (Number.isNaN(atual) || atual < 0) {
      return 'A quantidade atual não pode ser negativa.';
    }

    if (Number.isNaN(reservada) || reservada < 0) {
      return 'A quantidade reservada não pode ser negativa.';
    }

    if (reservada > atual) {
      return 'A quantidade reservada não pode ser maior que a quantidade atual.';
    }

    if (Number.isNaN(minimo) || minimo < 0) {
      return 'O estoque mínimo não pode ser negativo.';
    }

    if (Number.isNaN(critico) || critico < 0) {
      return 'O estoque crítico não pode ser negativo.';
    }

    if (critico > minimo) {
      return 'O estoque crítico não pode ser maior que o estoque mínimo.';
    }

    return null;
  }

validarReposicaoEstoque(model: Partial<EstoquePeca>): string | null {
    const minimo = this.numeroFormulario(model.estoqueMinimo);

    if (model.estoqueMaximo !== null && model.estoqueMaximo !== undefined && String(model.estoqueMaximo).trim() !== '') {
      const maximo = this.numeroFormulario(model.estoqueMaximo);

      if (Number.isNaN(maximo) || maximo < 0) {
        return 'Informe um estoque máximo válido, com valor igual ou maior que zero.';
      }

      if (!Number.isNaN(minimo) && maximo < minimo) {
        return 'O estoque máximo não pode ser menor que o estoque mínimo.';
      }
    }

    if (model.pontoReposicao !== null && model.pontoReposicao !== undefined && String(model.pontoReposicao).trim() !== '') {
      const pontoReposicao = this.numeroFormulario(model.pontoReposicao);

      if (Number.isNaN(pontoReposicao) || pontoReposicao < 0) {
        return 'Informe um ponto de reposição válido, com valor igual ou maior que zero.';
      }
    }

    if (model.quantidadeReposicaoSugerida !== null && model.quantidadeReposicaoSugerida !== undefined && String(model.quantidadeReposicaoSugerida).trim() !== '') {
      const reposicao = this.numeroFormulario(model.quantidadeReposicaoSugerida);

      if (Number.isNaN(reposicao) || reposicao < 0) {
        return 'Informe uma quantidade de reposição válida, com valor igual ou maior que zero.';
      }
    }

    const custoMedioVazio = model.custoMedio === null
      || model.custoMedio === undefined
      || String(model.custoMedio).trim() === '';

    if (this.custoMedioObrigatorio(model) && custoMedioVazio) {
      return 'Informe o custo médio quando a quantidade atual for maior que zero.';
    }

    if (!custoMedioVazio) {
      const custoMedio = this.numeroFormulario(model.custoMedio, true);

      if (Number.isNaN(custoMedio) || custoMedio < 0) {
        return 'Informe um custo médio válido, com valor igual ou maior que zero.';
      }
    }

    return null;
  }

custoMedioInvalido(model: Partial<EstoquePeca>): boolean {
    const custoMedioVazio = model.custoMedio === null
      || model.custoMedio === undefined
      || String(model.custoMedio).trim() === '';

    if (custoMedioVazio) {
      return this.custoMedioObrigatorio(model);
    }

    const custoMedio = this.numeroFormulario(model.custoMedio, true);

    return Number.isNaN(custoMedio) || custoMedio < 0;
  }

quantidadeObrigatoriaInvalida(valor: any, permitirZero: boolean): boolean {
    if (valor === null || valor === undefined || String(valor).trim() === '') {
      return true;
    }

    const numero = this.numeroFormulario(valor);

    if (Number.isNaN(numero)) {
      return true;
    }

    return permitirZero ? numero < 0 : numero <= 0;
  }

numeroFormulario(valor: any, removerMoeda = false): number {
    if (valor === null || valor === undefined || String(valor).trim() === '') {
      return Number.NaN;
    }

    if (typeof valor === 'number') {
      return Number.isFinite(valor) ? valor : Number.NaN;
    }

    let texto = String(valor).replace(/\s/g, '').trim();

    if (removerMoeda) {
      texto = texto.replace('R$', '');
    }

    if (texto.includes(',')) {
      texto = texto.replace(/\./g, '').replace(',', '.');
    }

    const numero = Number(texto);

    return Number.isFinite(numero) ? numero : Number.NaN;
  }

montarPayloadEstoque(model: Partial<EstoquePeca>): EstoquePecaRequest {
    return {
      idPeca: model.idPeca ?? null,
      idLocalEstoque: model.idLocalEstoque ?? null,

      quantidadeAtual: this.converterQuantidadeParaBackend(model.quantidadeAtual),
      quantidadeReservada: this.converterQuantidadeParaBackend(model.quantidadeReservada),

      estoqueMinimo: this.converterQuantidadeParaBackend(model.estoqueMinimo),
      estoqueCritico: this.converterQuantidadeParaBackend(model.estoqueCritico),
      estoqueMaximo: this.converterQuantidadeOpcionalParaBackend(model.estoqueMaximo),

      pontoReposicao: this.converterQuantidadeOpcionalParaBackend(model.pontoReposicao),
      quantidadeReposicaoSugerida: this.converterQuantidadeOpcionalParaBackend(model.quantidadeReposicaoSugerida),

      custoMedio: this.converterMoedaOpcionalParaNumero(model.custoMedio),
      localizacaoFisica: this.limparOpcional(model.localizacaoFisica),

      ativo: model.ativo === null || model.ativo === undefined
        ? true
        : Boolean(model.ativo)
    };
  }

pecaTexto(model: Partial<EstoquePeca>): string {
    if (!model.nomePeca) {
      return '';
    }

    const fabricante = model.fabricantePeca ? ` - ${model.fabricantePeca}` : '';
    const modelo = model.modeloPeca ? ` / ${model.modeloPeca}` : '';

    return `${model.nomePeca}${fabricante}${modelo}`;
  }

rotuloOrigemMovimentacao(origem?: string | null): string {
  const rotulos: Record<string, string> = {
    COMPRA: 'Compra', DEVOLUCAO_NAO_UTILIZADA: 'Devolução de peça não utilizada',
    BONIFICACAO: 'Bonificação do fornecedor', OUTRA: 'Outra origem',
    CONSUMO_INTERNO: 'Consumo interno', DEVOLUCAO_FORNECEDOR: 'Devolução ao fornecedor',
    PERDA_AVARIA: 'Perda ou avaria', INVENTARIO: 'Inventário',
    CORRECAO_LANCAMENTO: 'Correção de lançamento', ATENDIMENTO: 'Atendimento',
    MANUAL: 'Manual', AJUSTE_MANUAL: 'Ajuste manual', INVENTARIO_INICIAL: 'Inventário inicial'
  };
  return origem ? rotulos[origem] || origem : '—';
}

formatarQuantidade(valor: any, unidade?: string | null): string {
    const numero = this.numeroEstoque(valor);

    const texto = numero.toLocaleString('pt-BR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 3
    });

    return `${texto} ${unidade || 'un.'}`;
  }

formatarQuantidadeSemUnidade(valor: any): string {
    const numero = this.numeroEstoque(valor);

    return numero.toLocaleString('pt-BR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 3
    });
  }

formatarMensagemAlertaEstoque(mensagem: string | null | undefined): string {
    if (!mensagem) return '';
    // A mensagem histórica usa o ponto como separador decimal do BigDecimal (2.000 = 2).
    return mensagem.replace(
      /(Estoque atual|Quantidade reservada|Quantidade disponível|Estoque mínimo|Estoque crítico):(\s*)(-?\d+(?:\.\d{1,3})?)(?=\.|\s|$)/g,
      (_trecho, campo: string, espaco: string, quantidade: string) =>
        `${campo}:${espaco}${this.formatarQuantidadeSemUnidade(Number(quantidade))}`
    );
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

formatarStatus(status?: string): string {
    if (!status) {
      return '';
    }

    if (status === 'NORMAL') {
      return 'Normal';
    }

    if (status === 'ATENCAO') {
      return 'Atenção';
    }

    if (status === 'CRITICO') {
      return 'Crítico';
    }

    if (status === 'ZERADO') {
      return 'Zerado';
    }

    return status;
  }

statusBadgeClass(status?: string): string {
    if (status === 'NORMAL') {
      return 'bg-success';
    }

    if (status === 'ATENCAO') {
      return 'bg-warning text-dark';
    }

    if (status === 'CRITICO') {
      return 'bg-danger';
    }

    if (status === 'ZERADO') {
      return 'bg-dark';
    }

    return 'bg-secondary';
  }

movimentoBadgeClass(tipo?: string): string {
    if (tipo === 'ENTRADA' || tipo === 'AJUSTE_ENTRADA') {
      return 'bg-success';
    }

    if (tipo === 'SAIDA' || tipo === 'AJUSTE_SAIDA') {
      return 'bg-danger';
    }

    return 'bg-secondary';
  }

formatarTipoMovimento(tipo?: string): string {
    if (!tipo) {
      return '';
    }

    if (tipo === 'ENTRADA') {
      return 'Entrada';
    }

    if (tipo === 'SAIDA') {
      return 'Saída';
    }

    if (tipo === 'AJUSTE_ENTRADA') {
      return 'Ajuste Entrada';
    }

    if (tipo === 'AJUSTE_SAIDA') {
      return 'Ajuste Saída';
    }

    return tipo;
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

capitalizar(texto: string | null | undefined): string {
    if (!texto) {
      return '';
    }

    return texto
      .trim()
      .split(' ')
      .filter(parte => parte.length > 0)
      .map(parte => parte.charAt(0).toUpperCase() + parte.slice(1).toLowerCase())
      .join(' ');
  }

normalizarTexto(valor: any): string {
    return (valor ?? '')
      .toString()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

onlyDigits(valor: any): string {
    return (valor ?? '').toString().replace(/\D/g, '');
  }

converterQuantidadeParaBackend(valor: any): string {
    if (valor === null || valor === undefined || valor === '') {
      return '0';
    }

    if (typeof valor === 'number') {
      return valor.toString();
    }

    let texto = valor
      .toString()
      .replace(/\s/g, '')
      .trim();

    if (texto.includes(',')) {
      texto = texto.replace(/\./g, '').replace(',', '.');
    }

    const numero = Number(texto);

    if (Number.isNaN(numero)) {
      return '0';
    }

    return numero.toString();
  }

converterQuantidadeOpcionalParaBackend(valor: any): string {
    if (valor === null || valor === undefined || valor === '') {
      return '';
    }

    return this.converterQuantidadeParaBackend(valor);
  }

converterMoedaOpcionalParaNumero(valor: any): string {
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

normalizarDecimalParaExibicao(valor: any): string {
    if (valor === null || valor === undefined || valor === '') {
      return '';
    }

    const numero = Number(valor);

    if (Number.isNaN(numero)) {
      return valor.toString();
    }

    return numero.toLocaleString('pt-BR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 3
    });
  }

limparOpcional(valor: string | null | undefined): string | undefined {
    if (valor === null || valor === undefined || valor.trim() === '') {
      return undefined;
    }

    return valor.trim();
  }

extrairMensagemErro(erro: any, mensagemPadrao: string): string {
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

quantidadeAtualEstoque(item: any): number {
    return this.numeroEstoque(
      item?.quantidadeAtual ??
      item?.quantidade_atual ??
      item?.atual ??
      0
    );
  }

quantidadeReservadaEstoque(item: any): number {
    return this.numeroEstoque(
      item?.quantidadeReservada ??
      item?.quantidade_reservada ??
      item?.reservada ??
      0
    );
  }

quantidadeDisponivelEstoque(item: any): number {
    const disponivelBackend = item?.quantidadeDisponivel
      ?? item?.quantidade_disponivel
      ?? item?.disponivel;

    if (disponivelBackend !== null && disponivelBackend !== undefined && disponivelBackend !== '') {
      return Math.max(0, this.numeroEstoque(disponivelBackend));
    }

    const atual = this.quantidadeAtualEstoque(item);
    const reservada = this.quantidadeReservadaEstoque(item);

    return Math.max(0, atual - reservada);
  }

numeroEstoque(valor: any): number {
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

    if (/^-?\d+\.\d{1,4}$/.test(texto)) {
      return Number(texto);
    }

    if (texto.includes(',')) {
      texto = texto.replace(/\./g, '').replace(',', '.');
    }

    const numero = Number(texto);

    return Number.isNaN(numero) ? 0 : numero;
  }

unidadeEstoque(item: any): string {
    return formatarUnidadePeca(item?.unidadePeca
      || item?.unidadeMedida
      || item?.unidade_medida
      || item?.unidade
      || item?.peca?.unidade
      || 'un.');
  }

statusCalculadoEstoque(item: any): string {
    const disponivel = this.quantidadeDisponivelEstoque(item);

    const minimo = this.numeroEstoque(
      item?.estoqueMinimo ??
      item?.estoque_minimo ??
      item?.minimo ??
      0
    );

    const critico = this.numeroEstoque(
      item?.estoqueCritico ??
      item?.estoque_critico ??
      item?.critico ??
      0
    );

    if (disponivel <= 0) {
      return 'ZERADO';
    }

    if (critico > 0 && disponivel <= critico) {
      return 'CRITICO';
    }

    if (minimo > 0 && disponivel <= minimo) {
      return 'ATENCAO';
    }

    return 'NORMAL';
  }
}
