import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

const API_BASE = 'http://localhost:8080';

export interface Atendimento {
  id?: number;
  codigoAtendimento?: string;

  idAgendamento?: number;
  codigoAgendamento?: string;

  idCliente?: number;
  nomeCliente?: string;
  cpfCliente?: string;
  telefoneCliente?: string;
  emailCliente?: string;

  idVeiculo?: number;
  placaVeiculo?: string;
  fabricanteVeiculo?: string;
  modeloVeiculo?: string;

  idServico?: number;
  nomeServico?: string;
  categoriaServico?: string;

  idFornecedor?: number;
  razaoSocialFornecedor?: string;

  idResponsavel?: number;
  nomeResponsavel?: string;
  tipoAcessoResponsavel?: string;

  tipoExecucao?: string;
  statusAtendimento?: string;

  dataEntrada?: string | null;
  inicioReal?: string | null;
  fimReal?: string | null;
  prazoEstimadoEntrega?: string | null;
  dataEntrega?: string | null;

  quilometragemEntrada?: number | null;
  quilometragemSaida?: number | null;

  relatoCliente?: string;
  diagnosticoTecnico?: string;
  servicoExecutado?: string;
  observacoesInternas?: string;
  recomendacoesCliente?: string;

  necessitaRetorno?: boolean;
  dataRetornoSugerida?: string | null;
  garantiaDias?: number | null;

  valorMaoObra?: string | number;
  valorPecas?: string | number;
  valorTerceiros?: string | number;
  desconto?: string | number;
  valorTotal?: string | number;

  aprovado?: boolean;
  aprovadoEm?: string | null;

  finalizadoEm?: string | null;

  canceladoEm?: string | null;
  motivoCancelamento?: string | null;

  criadoEm?: string;
  atualizadoEm?: string;
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
  garantiaDias?: number;

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
  telefoneCliente?: string;
  emailCliente?: string;

  idVeiculo?: number;
  placaVeiculo?: string;
  fabricanteVeiculo?: string;
  modeloVeiculo?: string;

  idServico?: number;
  nomeServico?: string;
  categoriaServico?: string;

  idFornecedor?: number;
  razaoSocialFornecedor?: string;

  idResponsavel?: number;
  nomeResponsavel?: string;

  dataHoraInicio?: string;
  dataHoraFim?: string;
  statusAgendamento?: string;

  quilometragemAtual?: number | null;
  queixaCliente?: string;
  diagnosticoPrevio?: string;
  observacoes?: string;
  valorEstimado?: string | number | null;
}

export interface UsuarioResumo {
  id?: number;
  nome?: string;
  nome_social?: string;
  email?: string;
  cpf?: string;
  telefone?: string;
  tipo_do_acesso?: string;
}

export interface FornecedorResumo {
  id?: number;
  cnpj?: string;
  razaoSocial?: string;
  nomeFantasia?: string;
  telefone?: string;
  email?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ExibeAtendimentosService {

  private readonly http = inject(HttpClient);

  private readonly atendimentoUrl = `${API_BASE}/api/atendimento`;
  private readonly agendamentoUrl = `${API_BASE}/api/agendamento`;
  private readonly usuarioUrl = `${API_BASE}/api/usuario`;
  private readonly fornecedorUrl = `${API_BASE}/api/fornecedor`;

  private get jsonHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Content-Type': 'application/json'
    });
  }

  listarTodos(): Observable<Atendimento[]> {
    return this.http.get<Atendimento[]>(
      this.atendimentoUrl,
      { withCredentials: true }
    );
  }

  listarPorStatus(status: string): Observable<Atendimento[]> {
    return this.http.get<Atendimento[]>(
      `${this.atendimentoUrl}/status/${status}`,
      { withCredentials: true }
    );
  }

  listarPorTipoExecucao(tipoExecucao: string): Observable<Atendimento[]> {
    return this.http.get<Atendimento[]>(
      `${this.atendimentoUrl}/tipo-execucao/${tipoExecucao}`,
      { withCredentials: true }
    );
  }

  listarPorPeriodo(inicio: string, fim: string): Observable<Atendimento[]> {
    const params = new HttpParams()
      .set('inicio', inicio)
      .set('fim', fim);

    return this.http.get<Atendimento[]>(
      `${this.atendimentoUrl}/periodo`,
      {
        params,
        withCredentials: true
      }
    );
  }

  criar(body: AtendimentoRequest): Observable<Atendimento> {
    return this.http.post<Atendimento>(
      this.atendimentoUrl,
      body,
      {
        headers: this.jsonHeaders,
        withCredentials: true
      }
    );
  }

  atualizar(id: number, body: AtendimentoRequest): Observable<Atendimento> {
    return this.http.put<Atendimento>(
      `${this.atendimentoUrl}/${id}`,
      body,
      {
        headers: this.jsonHeaders,
        withCredentials: true
      }
    );
  }

  iniciar(id: number): Observable<Atendimento> {
    return this.http.patch<Atendimento>(
      `${this.atendimentoUrl}/${id}/iniciar`,
      {},
      { withCredentials: true }
    );
  }

  aprovar(id: number): Observable<Atendimento> {
    return this.http.patch<Atendimento>(
      `${this.atendimentoUrl}/${id}/aprovar`,
      {},
      { withCredentials: true }
    );
  }

  aguardarTerceiro(id: number): Observable<Atendimento> {
    return this.http.patch<Atendimento>(
      `${this.atendimentoUrl}/${id}/aguardar-terceiro`,
      {},
      { withCredentials: true }
    );
  }

  concluir(id: number): Observable<Atendimento> {
    return this.http.patch<Atendimento>(
      `${this.atendimentoUrl}/${id}/concluir`,
      {},
      { withCredentials: true }
    );
  }

  entregar(id: number): Observable<Atendimento> {
    return this.http.patch<Atendimento>(
      `${this.atendimentoUrl}/${id}/entregar`,
      {},
      { withCredentials: true }
    );
  }

  cancelar(id: number, body: AtendimentoCancelamentoRequest): Observable<Atendimento> {
    return this.http.patch<Atendimento>(
      `${this.atendimentoUrl}/${id}/cancelar`,
      body,
      {
        headers: this.jsonHeaders,
        withCredentials: true
      }
    );
  }

  listarAgendamentos(): Observable<AgendamentoResumo[]> {
    return this.http.get<AgendamentoResumo[]>(
      this.agendamentoUrl,
      { withCredentials: true }
    );
  }

  listarUsuarios(): Observable<UsuarioResumo[]> {
    return this.http.get<UsuarioResumo[]>(
      this.usuarioUrl,
      { withCredentials: true }
    );
  }

  listarFornecedores(): Observable<FornecedorResumo[]> {
    return this.http.get<FornecedorResumo[]>(
      this.fornecedorUrl,
      { withCredentials: true }
    );
  }
}
