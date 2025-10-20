import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

// Se tiver environment, troque aqui:
const API_BASE = 'http://localhost:8080';

export interface Peca {
  id?: number;
  nome: string;
  tipo?: string;
  especificacao?: string;
  fabricante: string;
  modelo?: string;
  norma?: string;
  unidade: string;
}

@Injectable({ providedIn: 'root' })
export class PecaService {
  private readonly http = inject(HttpClient);
  // Ajuste para plural se seu controller expõe /api/pecas
  private readonly baseUrl = `${API_BASE}/api/peca`;

  private get jsonHeaders(): HttpHeaders {
    return new HttpHeaders({ 'Content-Type': 'application/json' });
  }

  /** GET /api/pecas */
  listarTodos(): Observable<Peca[]> {
    return this.http.get<Peca[]>(this.baseUrl);
  }

  /** POST /api/pecas */
  cadastrar(body: Omit<Peca, 'id'>): Observable<Peca> {
    return this.http.post<Peca>(this.baseUrl, body, { headers: this.jsonHeaders });
  }

  /** PUT /api/pecas/{id} */
  atualizarPeca(id: number, body: Partial<Peca>): Observable<Peca> {
    return this.http.put<Peca>(`${this.baseUrl}/${id}`, body, { headers: this.jsonHeaders });
  }

  /** DELETE /api/pecas/{id} */
  removerPeca(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
