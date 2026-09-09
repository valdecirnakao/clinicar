import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

const API_BASE = '';

export interface FornecimentoServico {
  id?: number;

  idFornecedor: number;
  razaoSocialFornecedor: string;
  cnpjFornecedor?: string;

  idServico: number;
  nomeServico: string;
  categoriaServico?: string;

  valorCusto: string | number;
  unidadeCobranca: string;

  prazoExecucao: string | number;
  unidadePrazo: string;

  quantidadeMinima: number;

  disponibilidade: string;

  contratoReferencia?: string;

  dataInicioVigencia?: string | null;
  dataFimVigencia?: string | null;

  ativo: boolean;

  observacoes?: string;

  criadoEm?: string;
  atualizadoEm?: string;
}

export interface FornecimentoServicoRequest {
  idFornecedor?: number;
  idServico?: number;

  valorCusto?: string;
  unidadeCobranca?: string;

  prazoExecucao?: string;
  unidadePrazo?: string;

  quantidadeMinima?: number;

  disponibilidade?: string;

  contratoReferencia?: string;

  dataInicioVigencia?: string | null;
  dataFimVigencia?: string | null;

  ativo?: boolean;

  observacoes?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ExibeFornecimentoServicosService {

  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${API_BASE}/api/fornecimento-servicos`;

  private get jsonHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Content-Type': 'application/json'
    });
  }

  listarTodos(): Observable<FornecimentoServico[]> {
    return this.http.get<FornecimentoServico[]>(
      this.baseUrl,
      {
        withCredentials: true
      }
    );
  }

  listarAtivos(): Observable<FornecimentoServico[]> {
    return this.http.get<FornecimentoServico[]>(
      `${this.baseUrl}/ativos`,
      {
        withCredentials: true
      }
    );
  }

  cadastrarFornecimentoServico(
    body: FornecimentoServicoRequest
  ): Observable<FornecimentoServico> {
    return this.http.post<FornecimentoServico>(
      this.baseUrl,
      body,
      {
        headers: this.jsonHeaders,
        withCredentials: true
      }
    );
  }

  atualizarFornecimentoServico(
    id: number,
    body: FornecimentoServicoRequest
  ): Observable<FornecimentoServico> {
    return this.http.put<FornecimentoServico>(
      `${this.baseUrl}/${id}`,
      body,
      {
        headers: this.jsonHeaders,
        withCredentials: true
      }
    );
  }

  ativarFornecimentoServico(id: number): Observable<FornecimentoServico> {
    return this.http.patch<FornecimentoServico>(
      `${this.baseUrl}/${id}/ativar`,
      {},
      {
        withCredentials: true
      }
    );
  }

  inativarFornecimentoServico(id: number): Observable<FornecimentoServico> {
    return this.http.patch<FornecimentoServico>(
      `${this.baseUrl}/${id}/inativar`,
      {},
      {
        withCredentials: true
      }
    );
  }

  removerFornecimentoServico(id: number): Observable<void> {
    return this.http.delete<void>(
      `${this.baseUrl}/${id}`,
      {
        withCredentials: true
      }
    );
  }
}
