import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

// Se tiver environment, troque aqui:
const API_BASE = 'http://localhost:8080';

export interface Veiculo {
  id?: number;
  placa: string;
  fabricante: string;
  cor: string;
  modelo: string;
  anoModeloCombustivel: string;
  id_proprietario?: number;
}

@Injectable({ providedIn: 'root' })
export class VeiculoService {
  private readonly http = inject(HttpClient);
  // Ajuste para plural se seu controller expõe /api/veiculos
  private readonly baseUrl = `${API_BASE}/api/veiculo`;

  private get jsonHeaders(): HttpHeaders {
    return new HttpHeaders({ 'Content-Type': 'application/json' });
  }

  private onlyDigits(v: any): string {
    return (v ?? '').toString().replace(/\D/g, '');
  }

  /** GET /api/usuario */
  listarTodos(): Observable<Veiculo[]> {
    return this.http.get<Veiculo[]>(this.baseUrl);
  }

  /** GET /api/usuario/cpf/{cpf} */
  buscarPorIdProprietario(id: string): Observable<Veiculo> {
    const clean = this.onlyDigits(id);
    return this.http.get<Veiculo>(`${this.baseUrl}/cpf/${encodeURIComponent(clean)}`);
  }

  /** POST /api/usuario */
  cadastrar(body: Omit<Veiculo, 'id'>): Observable<Veiculo> {
    return this.http.post<Veiculo>(this.baseUrl, body, { headers: this.jsonHeaders });
  }

  /** PUT /api/usuario/{id} */
  atualizarVeiculo(id: number, body: Partial<Veiculo>): Observable<Veiculo> {
    return this.http.put<Veiculo>(`${this.baseUrl}/${id}`, body, { headers: this.jsonHeaders });
  }

  /** DELETE /api/usuario/{id} */
  removerVeiculo(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
