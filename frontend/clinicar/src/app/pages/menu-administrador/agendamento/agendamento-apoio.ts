import { Observable, Subscription, map, tap } from 'rxjs';
import { catchError, forkJoin, of } from 'rxjs';
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
/** Regras e formatações sem estado de tela ou acesso ao servidor. */
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
type AbaNovoAgendamento = 'agendamento' | 'pecas' | 'adicionais';
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
export class AgendamentoApoio {
camposObrigatoriosAgendamento(): string[] {
    return [
      'idCliente',
      'idVeiculo',
      'idServico',
      'quilometragemAtual',
      'dataHoraInicio',
      'dataHoraFim',
      'idResponsavel'
    ];
  }

periodosSobrepostos(
    inicioNovo: Date,
    fimNovo: Date,
    inicioExistente: Date,
    fimExistente: Date
  ): boolean {
    return inicioNovo.getTime() < fimExistente.getTime()
      && fimNovo.getTime() > inicioExistente.getTime();
  }

statusBloqueiaResponsavel(status?: string | null): boolean {
    const statusNormalizado = String(status || '').toUpperCase();

    return statusNormalizado === 'CONFIRMADO'
      || statusNormalizado === 'EM_ATENDIMENTO';
  }

idResponsavelDoAgendamento(agendamento: any): number | undefined {
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

dataValida(valor?: string | null): Date | null {
    if (!valor) return null;

    const data = new Date(valor);

    if (Number.isNaN(data.getTime())) {
      return null;
    }

    return data;
  }

numeroParaBackend(valor: any): string {
    return this.moedaParaNumero(valor).toFixed(2);
  }

numeroOuNull(valor: any): number | null {
    if (valor === null || valor === undefined || valor === '') {
      return null;
    }

    const numero = Number(valor);

    return Number.isNaN(numero) || numero <= 0 ? null : numero;
  }

extrairBlocoPecasDasObservacoes(observacoes: any): string {
    const texto = this.limparOpcional(observacoes);

    if (!texto) {
      return '';
    }

    const match = texto.match(/\[PEÇAS PREVISTAS NO AGENDAMENTO\]([\s\S]*?)\[\/PEÇAS PREVISTAS NO AGENDAMENTO\]/i);

    return match ? match[1].trim() : '';
  }

removerBlocoPecasDasObservacoes(observacoes: any): string {
    const texto = this.limparOpcional(observacoes);

    if (!texto) {
      return '';
    }

    return texto
      .replace(/\s*\[PEÇAS PREVISTAS NO AGENDAMENTO\][\s\S]*?\[\/PEÇAS PREVISTAS NO AGENDAMENTO\]\s*/gi, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

valorRotuloLinhaPeca(partes: string[], rotulo: string): string {
    const rotuloNormalizado = this.normalizar(rotulo);

    const parte = partes.find(item =>
      this.normalizar(item).startsWith(`${rotuloNormalizado}:`)
    );

    if (!parte) {
      return '';
    }

    const indiceDoisPontos = parte.indexOf(':');

    if (indiceDoisPontos < 0) {
      return '';
    }

    return parte.slice(indiceDoisPontos + 1).trim();
  }

podeConfirmar(item: Agendamento): boolean {
    return item.statusAgendamento === 'AGENDADO'
      && (item.tipoExecucao === 'INTERNA' && !!item.idResponsavel
        || item.tipoExecucao === 'EXTERNA' && !!item.idFornecedor);
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

podeMarcarNaoCompareceu(item: Agendamento): boolean {
    return item.statusAgendamento === 'AGENDADO'
      || item.statusAgendamento === 'CONFIRMADO';
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

quantidadeInteiraMinima(valor: any): number {
    const numero = this.moedaParaNumero(valor);

    if (numero <= 0) return 1;

    return Math.max(1, Math.ceil(numero));
  }

idClienteDoVeiculo(veiculo: VeiculoResumo): number | undefined {
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

placaDoVeiculo(veiculo: VeiculoResumo): string {
    return this.textoCampo(
      veiculo,
      ['placa', 'placaVeiculo', 'placa_veiculo'],
      ''
    );
  }

fabricanteDoVeiculo(veiculo: VeiculoResumo): string {
    return this.textoCampo(
      veiculo,
      ['fabricante', 'marca', 'montadora'],
      ''
    );
  }

modeloDoVeiculo(veiculo: VeiculoResumo): string {
    return this.textoCampo(
      veiculo,
      ['modelo', 'nomeModelo', 'nome_modelo'],
      ''
    );
  }

corDoVeiculo(veiculo: VeiculoResumo): string {
    return this.textoCampo(
      veiculo,
      ['cor'],
      ''
    );
  }

fornecimentoEstaAtivo(fornecimento: FornecimentoPecaResumo): boolean {
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

idPecaObjeto(objeto: any): number | undefined {
    const valor = this.obterCampo(objeto, ['idPeca', 'id_peca', 'peca.id']);

    if (valor === null || valor === undefined || valor === '') return undefined;

    const numero = Number(valor);

    return Number.isNaN(numero) ? undefined : numero;
  }

idEstoquePecaObjeto(objeto: any): number | undefined {
    const valor = this.obterCampo(
      objeto,
      [
        'idEstoquePeca',
        'id_estoque_peca',
        'estoquePecaId',
        'estoque_peca_id',
        'estoquePeca.id',
        'estoque.id'
      ]
    );

    if (valor === null || valor === undefined || valor === '') return undefined;

    const numero = Number(valor);

    return Number.isNaN(numero) || numero <= 0 ? undefined : numero;
  }

idFornecedorObjeto(objeto: any): number | undefined {
    const valor = this.obterCampo(objeto, ['idFornecedor', 'id_fornecedor', 'fornecedor.id']);

    if (valor === null || valor === undefined || valor === '') return undefined;

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

unidadePadraoPeca(peca: PecaResumo): string {
    return this.textoCampo(
      peca,
      ['unidadeMedida', 'unidade_medida', 'unidade'],
      'UNIDADE'
    );
  }

unidadePadraoFornecimentoPeca(fornecimento: FornecimentoPecaResumo): string {
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

valorPadraoFornecimentoPeca(fornecimento: FornecimentoPecaResumo): any {
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

valorPadraoServico(servico: ServicoResumo): any {
    return this.valorCampo(
      servico,
      ['valorBase', 'valor_base', 'valor', 'preco'],
      0
    );
  }

duracaoServicoEmMinutos(servico: ServicoResumo): number {
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

textoCampo(objeto: any, caminhos: string[], padrao = ''): string {
    const valor = this.obterCampo(objeto, caminhos);

    if (valor === null || valor === undefined || valor === '') return padrao;

    return String(valor);
  }

valorCampo(objeto: any, caminhos: string[], padrao: any = 0): any {
    const valor = this.obterCampo(objeto, caminhos);

    if (valor === null || valor === undefined || valor === '') return padrao;

    return valor;
  }

moedaParaNumero(valor: any): number {
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

agoraInputDateTime(): string {
    const agora = new Date();
    agora.setMinutes(agora.getMinutes() - agora.getTimezoneOffset());
    return agora.toISOString().slice(0, 16);
  }

paraDatetimeLocal(valor: string): string {
    if (!valor) return '';

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

onlyDigits(valor: any): string {
    return String(valor ?? '').replace(/\D/g, '');
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

extrairLista<T>(resposta: any): T[] {
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

valorOrdenacao(item: Agendamento, coluna: ColunaOrdenacaoAgendamento): string | number {
    switch (coluna) {
      case 'codigoAgendamento':
        return item.codigoAgendamento || '';
      case 'nomeCliente':
        return item.nomeCliente || item.cliente?.nome || '';
      case 'placaVeiculo':
        return item.placaVeiculo || item.veiculo?.placa || '';
      case 'nomeServico':
        return item.nomeServico || item.servico?.nome || item.servico?.descricao || '';
      case 'dataHoraInicio':
        return this.dataValida(item.dataHoraInicio)?.getTime() || 0;
      case 'statusAgendamento':
        return item.statusAgendamento || '';
      case 'prioridade':
        return item.prioridade || '';
      case 'valorEstimado':
        return this.moedaParaNumero(item.valorEstimado);
      default:
        return '';
    }
  }

compararValores(a: string | number, b: string | number): number {
    if (typeof a === 'number' && typeof b === 'number') {
      return a - b;
    }

    return String(a).localeCompare(String(b), 'pt-BR', {
      sensitivity: 'base',
      numeric: true
    });
  }

trackByAgendamento(index: number, item: Agendamento): number | string {
    return item.id ?? item.codigoAgendamento ?? index;
  }

formatarTelefone(telefone: string | null | undefined): string {
    if (!telefone) return '-';
    const numero = telefone.replaceAll(/\D/g, '');
    const codigoPais = '55';
    if (numero.length >= 11) {
      const ddd = numero.slice(-11, -9);
      const parte1 = numero.slice(-9, -4);
      const parte2 = numero.slice(-4);
      telefone = `+${codigoPais} (${ddd}) ${parte1} -${parte2}`;
    }
    else if (numero.length >= 10) {
      const ddd = numero.slice(0, 2);
      const parte1 = numero.slice(2, 6);
      const parte2 = numero.slice(6, 10);
      telefone = `+${codigoPais} (${ddd}) ${parte1} -${parte2}`;
    }
    else if (numero.length >= 8) {
      const ddd = '11';
      const parte1 = numero.slice(0, -4);
      const parte2 = numero.slice(-4);
      telefone = `+${codigoPais} (${ddd}) ${parte1} -${parte2}`;
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
