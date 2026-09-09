import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

const API_BASE = '';

export interface Atendimento {
  id?: number;
  codigoAtendimento?: string;

  idAgendamento?: number;
  codigoAgendamento?: string;

  idCliente?: number;
  nomeCliente?: string;
  cpfCliente?: string;
  emailCliente?: string;
  telefoneCliente?: string;

  idVeiculo?: number;
  placaVeiculo?: string;
  fabricanteVeiculo?: string;
  modeloVeiculo?: string;
  corVeiculo?: string;
  anoModeloCombustivelVeiculo?: string;

  idServico?: number;
  nomeServico?: string;
  categoriaServico?: string;

  idFornecedor?: number | null;
  razaoSocialFornecedor?: string | null;

  idResponsavel?: number | null;
  nomeResponsavel?: string | null;

  tipoExecucao?: string;
  statusAtendimento?: string;

  dataEntrada?: string | null;
  inicioReal?: string | null;
  fimReal?: string | null;
  prazoEstimadoEntrega?: string | null;
  dataEntrega?: string | null;

  quilometragemEntrada?: number | null;
  quilometragemSaida?: number | null;

  relatoCliente?: string | null;
  diagnosticoTecnico?: string | null;
  servicoExecutado?: string | null;
  observacoesInternas?: string | null;
  recomendacoesCliente?: string | null;

  necessitaRetorno?: boolean;
  dataRetornoSugerida?: string | null;
  garantiaDias?: number | null;

  valorMaoObra?: number | string;
  valorPecas?: number | string;
  valorTerceiros?: number | string;
  desconto?: number | string;
  valorTotal?: number | string;

  aprovado?: boolean;
  aprovadoEm?: string | null;
  finalizadoEm?: string | null;
  canceladoEm?: string | null;
  motivoCancelamento?: string | null;

  osPdfGeradaEm?: string | null;
  osEnviadaEmail?: boolean;
  osEnviadaEmailEm?: string | null;
  osEmailDestino?: string | null;
  osUltimoErro?: string | null;

  criadoEm?: string;
  atualizadoEm?: string;

  estoqueBaixado?: boolean;
  estoqueBaixadoEm?: string | null;
}

export interface AtendimentoRequest {
  idAgendamento?: number | null;
  idFornecedor?: number | null;
  idResponsavel?: number | null;

  tipoExecucao?: string;
  statusAtendimento?: string;

  dataEntrada?: string;
  inicioReal?: string;
  fimReal?: string;
  prazoEstimadoEntrega?: string;
  dataEntrega?: string;

  quilometragemEntrada?: number | null;
  quilometragemSaida?: number | null;

  relatoCliente?: string;
  diagnosticoTecnico?: string;
  servicoExecutado?: string;
  observacoesInternas?: string;
  recomendacoesCliente?: string;

  necessitaRetorno?: boolean;
  dataRetornoSugerida?: string;
  garantiaDias?: number | null;

  valorMaoObra?: string;
  valorPecas?: string;
  valorTerceiros?: string;
  desconto?: string;

  aprovado?: boolean;
}

export interface AtendimentoCancelamentoRequest {
  motivoCancelamento?: string;
}

export interface AgendamentoResumo {
  id?: number;
  codigoAgendamento?: string;

  idCliente?: number;
  nomeCliente?: string;
  cpfCliente?: string;
  emailCliente?: string;
  telefoneCliente?: string;

  idVeiculo?: number;
  placaVeiculo?: string;
  fabricanteVeiculo?: string;
  modeloVeiculo?: string;
  corVeiculo?: string;
  anoModeloCombustivelVeiculo?: string;

  idServico?: number;
  nomeServico?: string;
  categoriaServico?: string;

  idFornecedor?: number | null;
  razaoSocialFornecedor?: string | null;

  idResponsavel?: number | null;
  nomeResponsavel?: string | null;

  statusAgendamento?: string;
  canalOrigem?: string;
  prioridade?: string;
  tipoAtendimento?: string;

  dataHoraInicio?: string;
  dataHoraFim?: string;

  quilometragemAtual?: number | null;
  queixaCliente?: string | null;
  diagnosticoPrevio?: string | null;
  observacoes?: string | null;
  valorEstimado?: number | string | null;

  cliente?: any;
  veiculo?: any;
  servico?: any;
  fornecedor?: any;
  responsavel?: any;
}

export interface UsuarioResumo {
  id?: number;
  nome?: string;
  nome_social?: string;
  nomeSocial?: string;
  email?: string;
  cpf?: string;
  telefone?: string;
  tipo_do_acesso?: string;
  tipoDoAcesso?: string;
  status?: string;
}

export interface FornecedorResumo {
  id?: number;
  razaoSocial?: string;
  razao_social?: string;
  nomeFantasia?: string;
  nome_fantasia?: string;
  email?: string;
  telefone?: string;
}

export interface PecaResumo {
  id?: number;
  codigo?: string;

  nome?: string;
  descricao?: string;
  tipo?: string;
  especificacao?: string;
  fabricante?: string;
  modelo?: string;

  unidade?: string;
  unidadeMedida?: string;
  unidade_medida?: string;
  unidadeCompra?: string;
  unidade_compra?: string;
  unidadeVenda?: string;
  unidade_venda?: string;

  valor?: string | number;
  preco?: string | number;
  custo?: string | number;

  valorUnitario?: string | number;
  valor_unitario?: string | number;

  valorCusto?: string | number;
  valor_custo?: string | number;

  custoUnitario?: string | number;
  custo_unitario?: string | number;

  precoUnitario?: string | number;
  preco_unitario?: string | number;

  precoCompra?: string | number;
  preco_compra?: string | number;

  valorCompra?: string | number;
  valor_compra?: string | number;

  valorVenda?: string | number;
  valor_venda?: string | number;

  valorBase?: string | number;
  valor_base?: string | number;

  custoMedio?: string | number;
  custo_medio?: string | number;

  idFornecedor?: number;
  id_fornecedor?: number;

  razaoSocialFornecedor?: string;
  razao_social_fornecedor?: string;

  fornecedor?: any;
}

export interface FornecimentoPecaResumo {
  id?: number;

  idPeca?: number;
  id_peca?: number;

  idFornecedor?: number;
  id_fornecedor?: number;

  valorUnitario?: string | number;
  valor_unitario?: string | number;

  valorCusto?: string | number;
  valor_custo?: string | number;

  custoUnitario?: string | number;
  custo_unitario?: string | number;

  precoUnitario?: string | number;
  preco_unitario?: string | number;

  precoCompra?: string | number;
  preco_compra?: string | number;

  valorCompra?: string | number;
  valor_compra?: string | number;

  valorFornecimento?: string | number;
  valor_fornecimento?: string | number;

  custo?: string | number;
  preco?: string | number;
  valor?: string | number;

  unidadeMedida?: string;
  unidade_medida?: string;

  unidadeCompra?: string;
  unidade_compra?: string;

  unidadeCobranca?: string;
  unidade_cobranca?: string;

  ativo?: boolean | string | number;

  razaoSocialFornecedor?: string;
  razao_social_fornecedor?: string;

  peca?: any;
  fornecedor?: any;

  criadoEm?: string;
  atualizadoEm?: string;
}

export interface ServicoResumo {
  id?: number;
  codigo?: string;

  nome?: string;
  descricao?: string;
  categoria?: string;

  tipoPrestador?: string;
  tipoDoPrestador?: string;
  tipo_do_prestador?: string;
  tipo_prestador?: string;

  duracao?: string | number;
  duracaoEstimada?: string | number;
  duracao_estimada?: string | number;

  tempoExecucao?: string | number;
  tempo_execucao?: string | number;
  tempoEstimado?: string | number;
  tempo_estimado?: string | number;

  unidadeDuracao?: string;
  unidade_duracao?: string;
  unidadeTempo?: string;
  unidade_tempo?: string;

  valor?: string | number;
  preco?: string | number;

  valorBase?: string | number;
  valor_base?: string | number;

  valorServico?: string | number;
  valor_servico?: string | number;

  unidadeCobranca?: string;
  unidade_cobranca?: string;

  idFornecedor?: number;
  id_fornecedor?: number;

  razaoSocialFornecedor?: string;
  razao_social_fornecedor?: string;

  fornecedor?: any;
}

export interface AtendimentoPeca {
  id?: number;

  idAtendimento?: number;
  codigoAtendimento?: string;

  idPeca?: number;
  nomePeca?: string;
  descricaoPeca?: string;
  fabricantePeca?: string;
  modeloPeca?: string;

  idEstoquePeca?: number | null;

  idFornecedor?: number | null;
  razaoSocialFornecedor?: string | null;

  quantidade?: number | string;
  valorUnitario?: number | string;
  valorTotal?: number | string;

  unidadeMedida?: string | null;
  observacoes?: string | null;

  criadoEm?: string;
  atualizadoEm?: string;
}

export interface AtendimentoPecaRequest {
  idPeca?: number | null;
  idEstoquePeca?: number | null;
  idFornecedor?: number | null;

  quantidade?: string;
  valorUnitario?: string;

  unidadeMedida?: string;
  observacoes?: string;
}

export interface AtendimentoServicoExecutado {
  id?: number;

  idAtendimento?: number;
  codigoAtendimento?: string;

  idServico?: number;
  nomeServico?: string;
  descricaoServico?: string;
  categoriaServico?: string;

  idResponsavel?: number | null;
  nomeResponsavel?: string | null;

  idFornecedor?: number | null;
  razaoSocialFornecedor?: string | null;

  tipoExecucao?: string;

  quantidade?: number | string;
  unidadeCobranca?: string | null;

  tempoExecucao?: number | string | null;
  unidadeTempo?: string | null;

  valorMaoObra?: number | string;
  valorTerceiro?: number | string;
  desconto?: number | string;
  valorTotal?: number | string;

  statusItem?: string;
  observacoes?: string | null;

  criadoEm?: string;
  atualizadoEm?: string;
}

export interface AtendimentoServicoExecutadoRequest {
  idServico?: number | null;

  idResponsavel?: number | null;
  idFornecedor?: number | null;

  tipoExecucao?: string;

  quantidade?: string;
  unidadeCobranca?: string;

  tempoExecucao?: string;
  unidadeTempo?: string;

  valorMaoObra?: string;
  valorTerceiro?: string;
  desconto?: string;

  statusItem?: string;
  observacoes?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ExibeAtendimentosService {

  private readonly atendimentoUrl = `${API_BASE}/api/atendimento`;
  private readonly agendamentoUrl = `${API_BASE}/api/agendamento`;
  private readonly usuarioUrl = `${API_BASE}/api/usuario`;
  private readonly fornecedorUrl = `${API_BASE}/api/fornecedor`;

  // Se seu controller de peças estiver como /api/pecas, altere somente esta linha.
  private readonly pecaUrl = `${API_BASE}/api/peca`;
  private readonly fornecimentoPecasUrl = `${API_BASE}/api/fornecimento-pecas`;
  private readonly servicoUrl = `${API_BASE}/api/servico`;

  private readonly jsonHeaders = new HttpHeaders({
    'Content-Type': 'application/json'
  });

  constructor(private http: HttpClient) {}

  listar(): Observable<Atendimento[]> {
    return this.http.get<Atendimento[]>(this.atendimentoUrl, {
      withCredentials: true
    });
  }

  buscarPorId(id: number): Observable<Atendimento> {
    return this.http.get<Atendimento>(`${this.atendimentoUrl}/${id}`, {
      withCredentials: true
    });
  }

  criar(body: AtendimentoRequest): Observable<Atendimento> {
    return this.http.post<Atendimento>(this.atendimentoUrl, body, {
      headers: this.jsonHeaders,
      withCredentials: true
    });
  }

  atualizar(id: number, body: AtendimentoRequest): Observable<Atendimento> {
    return this.http.put<Atendimento>(`${this.atendimentoUrl}/${id}`, body, {
      headers: this.jsonHeaders,
      withCredentials: true
    });
  }

  iniciar(id: number): Observable<Atendimento> {
    return this.http.patch<Atendimento>(`${this.atendimentoUrl}/${id}/iniciar`, {}, {
      withCredentials: true
    });
  }

  aprovar(id: number): Observable<Atendimento> {
    return this.http.patch<Atendimento>(`${this.atendimentoUrl}/${id}/aprovar`, {}, {
      withCredentials: true
    });
  }

  aguardarTerceiro(id: number): Observable<Atendimento> {
    return this.http.patch<Atendimento>(`${this.atendimentoUrl}/${id}/aguardar-terceiro`, {}, {
      withCredentials: true
    });
  }

  concluir(id: number): Observable<Atendimento> {
    return this.http.patch<Atendimento>(`${this.atendimentoUrl}/${id}/concluir`, {}, {
      withCredentials: true
    });
  }

  entregar(id: number): Observable<Atendimento> {
    return this.http.patch<Atendimento>(`${this.atendimentoUrl}/${id}/entregar`, {}, {
      withCredentials: true
    });
  }

  cancelar(id: number, body: AtendimentoCancelamentoRequest): Observable<Atendimento> {
    return this.http.patch<Atendimento>(`${this.atendimentoUrl}/${id}/cancelar`, body, {
      headers: this.jsonHeaders,
      withCredentials: true
    });
  }

  reenviarOrdemServicoEmail(id: number): Observable<Atendimento> {
    return this.http.post<Atendimento>(`${this.atendimentoUrl}/${id}/reenviar-os-email`, {}, {
      withCredentials: true
    });
  }

  listarAgendamentos(): Observable<AgendamentoResumo[]> {
    return this.http.get<AgendamentoResumo[]>(this.agendamentoUrl, {
      withCredentials: true
    });
  }

  listarUsuarios(): Observable<UsuarioResumo[]> {
    return this.http.get<UsuarioResumo[]>(this.usuarioUrl, {
      withCredentials: true
    });
  }

  listarFornecedores(): Observable<FornecedorResumo[]> {
    return this.http.get<FornecedorResumo[]>(this.fornecedorUrl, {
      withCredentials: true
    });
  }

  listarPecasCatalogo(): Observable<PecaResumo[]> {
    return this.http.get<PecaResumo[]>(this.pecaUrl, {
      withCredentials: true
    });
  }

  listarServicosCatalogo(): Observable<ServicoResumo[]> {
    return this.http.get<ServicoResumo[]>(this.servicoUrl, {
      withCredentials: true
    });
  }

  listarPecasAtendimento(atendimentoId: number): Observable<AtendimentoPeca[]> {
    return this.http.get<AtendimentoPeca[]>(
      `${this.atendimentoUrl}/${atendimentoId}/pecas`,
      { withCredentials: true }
    );
  }

  adicionarPecaAtendimento(
    atendimentoId: number,
    body: AtendimentoPecaRequest
  ): Observable<AtendimentoPeca> {
    return this.http.post<AtendimentoPeca>(
      `${this.atendimentoUrl}/${atendimentoId}/pecas`,
      body,
      {
        headers: this.jsonHeaders,
        withCredentials: true
      }
    );
  }

  atualizarPecaAtendimento(
    atendimentoId: number,
    itemId: number,
    body: AtendimentoPecaRequest
  ): Observable<AtendimentoPeca> {
    return this.http.put<AtendimentoPeca>(
      `${this.atendimentoUrl}/${atendimentoId}/pecas/${itemId}`,
      body,
      {
        headers: this.jsonHeaders,
        withCredentials: true
      }
    );
  }

  removerPecaAtendimento(
    atendimentoId: number,
    itemId: number
  ): Observable<void> {
    return this.http.delete<void>(
      `${this.atendimentoUrl}/${atendimentoId}/pecas/${itemId}`,
      { withCredentials: true }
    );
  }

  listarServicosAtendimento(
    atendimentoId: number
  ): Observable<AtendimentoServicoExecutado[]> {
    return this.http.get<AtendimentoServicoExecutado[]>(
      `${this.atendimentoUrl}/${atendimentoId}/servicos`,
      { withCredentials: true }
    );
  }

  adicionarServicoAtendimento(
    atendimentoId: number,
    body: AtendimentoServicoExecutadoRequest
  ): Observable<AtendimentoServicoExecutado> {
    return this.http.post<AtendimentoServicoExecutado>(
      `${this.atendimentoUrl}/${atendimentoId}/servicos`,
      body,
      {
        headers: this.jsonHeaders,
        withCredentials: true
      }
    );
  }

  atualizarServicoAtendimento(
    atendimentoId: number,
    itemId: number,
    body: AtendimentoServicoExecutadoRequest
  ): Observable<AtendimentoServicoExecutado> {
    return this.http.put<AtendimentoServicoExecutado>(
      `${this.atendimentoUrl}/${atendimentoId}/servicos/${itemId}`,
      body,
      {
        headers: this.jsonHeaders,
        withCredentials: true
      }
    );
  }

  removerServicoAtendimento(
    atendimentoId: number,
    itemId: number
  ): Observable<void> {
    return this.http.delete<void>(
      `${this.atendimentoUrl}/${atendimentoId}/servicos/${itemId}`,
      { withCredentials: true }
    );
  }

  listarFornecimentosPecas(): Observable<FornecimentoPecaResumo[]> {
    return this.http.get<FornecimentoPecaResumo[]>(this.fornecimentoPecasUrl, {
      withCredentials: true
    });
  }
}
