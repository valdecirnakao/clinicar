import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

const API_BASE = 'http://localhost:8080';

export interface Agendamento {
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

  dataHoraInicio?: string;
  dataHoraFim?: string;
  duracaoEstimadaMinutos?: number;

  statusAgendamento?: string;
  canalOrigem?: string;
  prioridade?: string;
  tipoAtendimento?: string;

  quilometragemAtual?: number | null;
  queixaCliente?: string | null;
  diagnosticoPrevio?: string | null;
  observacoes?: string | null;

  valorEstimado?: number | string | null;
  valorFinal?: number | string | null;

  requerConfirmacao?: boolean;
  confirmado?: boolean;
  confirmadoEm?: string | null;

  canceladoEm?: string | null;
  motivoCancelamento?: string | null;

  criadoEm?: string;
  atualizadoEm?: string;

  cliente?: any;
  veiculo?: any;
  servico?: any;
  fornecedor?: any;
  responsavel?: any;
}

export interface AgendamentoRequest {
  idCliente?: number | null;
  idVeiculo?: number | null;
  idServico?: number | null;
  idFornecedor?: number | null;
  idResponsavel?: number | null;

  dataHoraInicio?: string;
  dataHoraFim?: string;
  duracaoEstimadaMinutos?: number | null;

  statusAgendamento?: string;
  canalOrigem?: string;
  prioridade?: string;
  tipoAtendimento?: string;

  quilometragemAtual?: number | null;
  queixaCliente?: string;
  diagnosticoPrevio?: string;
  observacoes?: string;

  valorEstimado?: string;
  valorFinal?: string;

  requerConfirmacao?: boolean;
  confirmado?: boolean;
}

export interface AgendamentoCancelamentoRequest {
  motivoCancelamento?: string;
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
}

export interface VeiculoResumo {
  id?: number;

  placa?: string;
  placaVeiculo?: string;
  placa_veiculo?: string;

  fabricante?: string;
  marca?: string;
  montadora?: string;

  modelo?: string;
  nomeModelo?: string;
  nome_modelo?: string;

  cor?: string;

  anoModeloCombustivel?: string;
  ano_modelo_combustivel?: string;

  idCliente?: number;
  id_cliente?: number;
  clienteId?: number;
  cliente_id?: number;

  idUsuario?: number;
  id_usuario?: number;
  usuarioId?: number;
  usuario_id?: number;

  idProprietario?: number;
  id_proprietario?: number;

  cliente?: any;
  usuario?: any;
  proprietario?: any;
}

export interface ServicoResumo {
  id?: number;
  nome?: string;
  descricao?: string;
  categoria?: string;

  duracao?: string | number;
  duracaoEstimada?: string | number;
  duracao_estimada?: string | number;

  unidadeDuracao?: string;
  unidade_duracao?: string;

  valorBase?: string | number;
  valor_base?: string | number;
  valor?: string | number;
  preco?: string | number;

  unidadeCobranca?: string;
  unidade_cobranca?: string;

  idFornecedor?: number;
  id_fornecedor?: number;
  razaoSocialFornecedor?: string;
  razao_social_fornecedor?: string;

  fornecedor?: any;
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
  nome?: string;
  descricao?: string;
  tipo?: string;
  especificacao?: string;
  fabricante?: string;
  modelo?: string;

  unidade?: string;
  unidadeMedida?: string;
  unidade_medida?: string;

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

  ativo?: boolean | string | number;

  peca?: any;
  fornecedor?: any;

  razaoSocialFornecedor?: string;
  razao_social_fornecedor?: string;
}

export interface AgendamentoPecaSelecionada {
  id?: number;
  idPeca?: number;
  nomePeca?: string;
  descricaoPeca?: string;
  fabricantePeca?: string;
  modeloPeca?: string;

  idFornecedor?: number | null;
  razaoSocialFornecedor?: string | null;

  quantidade?: number | string;
  unidadeMedida?: string;
  valorUnitario?: number | string;
  valorTotal?: number | string;

  observacoes?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ExibeAgendamentosService {

  private readonly agendamentoUrl = `${API_BASE}/api/agendamento`;
  private readonly usuarioUrl = `${API_BASE}/api/usuario`;
  private readonly veiculoUrl = `${API_BASE}/api/veiculo`;
  private readonly servicoUrl = `${API_BASE}/api/servico`;
  private readonly fornecedorUrl = `${API_BASE}/api/fornecedor`;
  private readonly pecaUrl = `${API_BASE}/api/peca`;
  private readonly fornecimentoPecasUrl = `${API_BASE}/api/fornecimento-pecas`;

  private readonly jsonHeaders = new HttpHeaders({
    'Content-Type': 'application/json'
  });

  constructor(private http: HttpClient) {}

  listar(): Observable<Agendamento[]> {
    return this.http.get<Agendamento[]>(this.agendamentoUrl, {
      withCredentials: true
    });
  }

  buscarPorId(id: number): Observable<Agendamento> {
    return this.http.get<Agendamento>(`${this.agendamentoUrl}/${id}`, {
      withCredentials: true
    });
  }

  criar(body: AgendamentoRequest): Observable<Agendamento> {
    return this.http.post<Agendamento>(this.agendamentoUrl, body, {
      headers: this.jsonHeaders,
      withCredentials: true
    });
  }

  atualizar(id: number, body: AgendamentoRequest): Observable<Agendamento> {
    return this.http.put<Agendamento>(`${this.agendamentoUrl}/${id}`, body, {
      headers: this.jsonHeaders,
      withCredentials: true
    });
  }

  confirmar(id: number): Observable<Agendamento> {
    return this.http.patch<Agendamento>(`${this.agendamentoUrl}/${id}/confirmar`, {}, {
      withCredentials: true
    });
  }

  iniciar(id: number): Observable<Agendamento> {
    return this.http.patch<Agendamento>(`${this.agendamentoUrl}/${id}/iniciar`, {}, {
      withCredentials: true
    });
  }

  concluir(id: number): Observable<Agendamento> {
    return this.http.patch<Agendamento>(`${this.agendamentoUrl}/${id}/concluir`, {}, {
      withCredentials: true
    });
  }

  cancelar(id: number, body: AgendamentoCancelamentoRequest): Observable<Agendamento> {
    return this.http.patch<Agendamento>(`${this.agendamentoUrl}/${id}/cancelar`, body, {
      headers: this.jsonHeaders,
      withCredentials: true
    });
  }

  naoCompareceu(id: number): Observable<Agendamento> {
    return this.http.patch<Agendamento>(`${this.agendamentoUrl}/${id}/nao-compareceu`, {}, {
      withCredentials: true
    });
  }

  excluir(id: number): Observable<void> {
    return this.http.delete<void>(`${this.agendamentoUrl}/${id}`, {
      withCredentials: true
    });
  }

  listarUsuarios(): Observable<UsuarioResumo[]> {
    return this.http.get<UsuarioResumo[]>(this.usuarioUrl, {
      withCredentials: true
    });
  }

  listarVeiculos(): Observable<VeiculoResumo[]> {
    return this.http.get<VeiculoResumo[]>(this.veiculoUrl, {
      withCredentials: true
    });
  }

  listarServicos(): Observable<ServicoResumo[]> {
    return this.http.get<ServicoResumo[]>(this.servicoUrl, {
      withCredentials: true
    });
  }

  listarFornecedores(): Observable<FornecedorResumo[]> {
    return this.http.get<FornecedorResumo[]>(this.fornecedorUrl, {
      withCredentials: true
    });
  }

  listarPecas(): Observable<PecaResumo[]> {
    return this.http.get<PecaResumo[]>(this.pecaUrl, {
      withCredentials: true
    });
  }

  listarFornecimentosPecas(): Observable<FornecimentoPecaResumo[]> {
    return this.http.get<FornecimentoPecaResumo[]>(this.fornecimentoPecasUrl, {
      withCredentials: true
    });
  }
}
