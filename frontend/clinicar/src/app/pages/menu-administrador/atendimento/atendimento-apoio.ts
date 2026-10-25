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
  FornecedorResumo,
  PecaResumo,
  FornecimentoPecaResumo,
  ServicoResumo,
  UsuarioResumo
} from './atendimento.service';
/** Regras e formatações sem estado de tela ou acesso ao servidor. */
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
export class AtendimentoApoio {
podeDevolverPeca(item: Atendimento): boolean {
    return !!item.estoqueBaixado && ['CONCLUIDO', 'ENTREGUE'].includes(item.statusAtendimento || '');
  }

saldoDevolucaoAtendimento(saida: MovimentacaoEstoquePeca): number {
    if(saida.quantidadeDisponivelOriginal!=null)return Math.max(0,Number(saida.quantidadeDisponivelOriginal));
    return Math.max(0, Number(saida.quantidade || 0) - Number(saida.quantidadeDevolvida || 0));
  }

trackByAtendimento(index: number, item: Atendimento): number | string {
    return item.id ?? item.codigoAtendimento ?? index;
  }

valorOrdenacaoAtendimento(item: Atendimento, coluna: ColunaOrdenacaoAtendimento): string | number {
    switch (coluna) {
      case 'codigoAtendimento':
        return item.codigoAtendimento || '';
      case 'nomeCliente':
        return item.nomeCliente || '';
      case 'placaVeiculo':
        return item.placaVeiculo || '';
      case 'nomeServico':
        return item.nomeServico || '';
      case 'statusAtendimento':
        return item.statusAtendimento || '';
      case 'tipoExecucao':
        return item.tipoExecucao || '';
      case 'valorTotal':
        return this.moedaParaNumero(item.valorTotal);
      case 'dataEntrada':
        return item.dataEntrada ? new Date(item.dataEntrada).getTime() || 0 : 0;
      case 'os':
        return this.formatarStatusOs(item);
      default:
        return '';
    }
  }

tipoExecucaoPadraoDoServico(servico?: ServicoResumo): string {
    if (!servico) {
      return 'INTERNO';
    }

    const tipoPrestador = this.normalizar(
      this.textoCampo(servico, ['tipoPrestador', 'tipoDoPrestador', 'tipo_do_prestador', 'tipo_prestador'], '')
    );

    if (tipoPrestador.includes('terceir')) {
      return 'TERCEIRO';
    }

    if (tipoPrestador.includes('misto')) {
      return 'MISTO';
    }

    return 'INTERNO';
  }

idPecaObjeto(objeto: any): number | undefined {
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

fornecimentoEstaAtivo(fornecimento: FornecimentoPecaResumo): boolean {
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

unidadePadraoFornecimentoPeca(
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

valorPadraoFornecimentoPeca(
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

extrairLista<T>(resposta: any): T[] {
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

podeGerenciarItens(item: Atendimento): boolean {
    return this.podeEditarItensAtendimento(item);
  }

podeEditarItensAtendimento(item?: Atendimento | null): boolean {
    if (!item?.id) return false;

    return item.statusAtendimento === 'EM_EXECUCAO'
      && item.aprovado !== true
      && item.estoqueBaixado !== true;
  }

podeIniciar(item: Atendimento): boolean {
    return item.statusAtendimento === 'APROVADO';
  }

podeAprovar(item: Atendimento): boolean {
    return !item.aprovado && item.statusAtendimento === 'AGUARDANDO_APROVACAO';
  }

podeConcluir(item: Atendimento): boolean {
    return ['EM_EXECUCAO', 'AGUARDANDO_TERCEIRO'].includes(item.statusAtendimento ?? '');
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
      case 'PAUSADO':
        return 'bg-secondary';
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

clonarPecasAtendimento(pecas: AtendimentoPeca[]): AtendimentoPeca[] {
    return (pecas || []).map(item => ({ ...item }));
  }

clonarServicosAtendimento(servicos: AtendimentoServicoExecutado[]): AtendimentoServicoExecutado[] {
    return (servicos || []).map(item => ({ ...item }));
  }

moedaParaNumero(valor: any): number {
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

numeroDetectavel(valor: any): number | null {
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

montarPayload(dados: Partial<Atendimento>): AtendimentoRequest {
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

montarPayloadPecaSalva(item: AtendimentoPeca): AtendimentoPecaRequest {
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

unidadePadraoPeca(peca: PecaResumo): string {
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

valorPadraoPeca(peca: PecaResumo): any {
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

valorPadraoServico(servico: ServicoResumo): any {
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

obterCampo(objeto: any, caminhos: string[]): any {
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

textoCampo(objeto: any, caminhos: string[], padrao: string = ''): string {
    const valor = this.obterCampo(objeto, caminhos);

    if (valor === null || valor === undefined || valor === '') {
      return padrao;
    }

    return String(valor);
  }

valorCampo(objeto: any, caminhos: string[], padrao: any = 0): any {
    const valor = this.obterCampo(objeto, caminhos);

    if (valor === null || valor === undefined || valor === '') {
      return padrao;
    }

    return valor;
  }

idFornecedorObjeto(objeto: any): number | undefined {
    const valor = this.obterCampo(objeto, ['idFornecedor', 'id_fornecedor', 'fornecedor.id']);

    if (valor === null || valor === undefined || valor === '') {
      return undefined;
    }

    const numero = Number(valor);

    return Number.isNaN(numero) ? undefined : numero;
  }

nomeFornecedorObjeto(objeto: any): string {
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

campoPorPadraoNumero(
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

normalizarChaveCampo(valor: string): string {
    return String(valor || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');
  }

agoraInputDateTime(): string {
    const agora = new Date();
    agora.setMinutes(agora.getMinutes() - agora.getTimezoneOffset());
    return agora.toISOString().slice(0, 16);
  }

paraDatetimeLocal(valor: string): string {
    const data = new Date(valor);

    if (Number.isNaN(data.getTime())) {
      return valor;
    }

    data.setMinutes(data.getMinutes() - data.getTimezoneOffset());

    return data.toISOString().slice(0, 16);
  }

normalizar(valor: any): string {
    return String(valor ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

normalizarTipoAcesso(valor: any): string {
    return String(valor ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase()
      .replace(/-/g, '_')
      .replace(/ /g, '_')
      .trim();
  }

valorPrimeiro(...valores: any[]): any {
    for (const valor of valores) {
      if (valor !== null && valor !== undefined && valor !== '') {
        return valor;
      }
    }

    return '';
  }

extrairMensagemErro(erro: any, mensagemPadrao: string): string {
    if (typeof erro?.error === 'string' && erro.error.trim()) return erro.error;
    if (typeof erro?.error?.mensagem === 'string' && erro.error.mensagem.trim()) return erro.error.mensagem;
    if (typeof erro?.error?.message === 'string' && erro.error.message.trim()) return erro.error.message;
    if (typeof erro?.error?.erro === 'string' && erro.error.erro.trim()) return erro.error.erro;
    if (typeof erro?.message === 'string' && erro.message.trim()) return erro.message;
    return mensagemPadrao;
  }
}
