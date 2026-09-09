import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

const API_BASE = '';

export interface Servico {
  id?: number;

  nome: string;
  descricao?: string;
  categoria: string;

  tipoDoPrestador: string;

  duracaoEstimada: string | number;
  unidadeDuracao: string;

  valorBase: string | number;
  unidadeCobranca: string;

  garantiaDias: number;
  necessitaPecas: boolean;

  ativo: boolean;

  observacoes?: string;

  idFornecedor?: number | null;
  razaoSocialFornecedor?: string | null;

  criadoEm?: string;
  atualizadoEm?: string;
}

export interface ServicoRequest {
  nome?: string;
  descricao?: string;
  categoria?: string;

  tipoDoPrestador?: string;

  duracaoEstimada?: string;
  unidadeDuracao?: string;

  valorBase?: string;
  unidadeCobranca?: string;

  garantiaDias?: number;
  necessitaPecas?: boolean;

  ativo?: boolean;

  observacoes?: string;

  idFornecedor?: number | null;
}

@Injectable({
  providedIn: 'root'
})
export class ExibeServicoService {

  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${API_BASE}/api/servico`;

  private get jsonHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Content-Type': 'application/json'
    });
  }

  listarTodos(): Observable<Servico[]> {
    return this.http.get<Servico[]>(
      this.baseUrl,
      {
        withCredentials: true
      }
    );
  }

  listarAtivos(): Observable<Servico[]> {
    return this.http.get<Servico[]>(
      `${this.baseUrl}/ativos`,
      {
        withCredentials: true
      }
    );
  }

  cadastrarServico(servico: ServicoRequest): Observable<Servico> {
    return this.http.post<Servico>(
      this.baseUrl,
      servico,
      {
        headers: this.jsonHeaders,
        withCredentials: true
      }
    );
  }

  atualizarServico(id: number, servico: ServicoRequest): Observable<Servico> {
    return this.http.put<Servico>(
      `${this.baseUrl}/${id}`,
      servico,
      {
        headers: this.jsonHeaders,
        withCredentials: true
      }
    );
  }

  ativarServico(id: number): Observable<Servico> {
    return this.http.patch<Servico>(
      `${this.baseUrl}/${id}/ativar`,
      {},
      {
        withCredentials: true
      }
    );
  }

  inativarServico(id: number): Observable<Servico> {
    return this.http.patch<Servico>(
      `${this.baseUrl}/${id}/inativar`,
      {},
      {
        withCredentials: true
      }
    );
  }

  removerServico(id: number): Observable<void> {
    return this.http.delete<void>(
      `${this.baseUrl}/${id}`,
      {
        withCredentials: true
      }
    );
  }
}
