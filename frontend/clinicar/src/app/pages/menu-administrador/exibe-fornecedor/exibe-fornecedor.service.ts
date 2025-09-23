// exibeFornecedor.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

// Ajuste se tiver environment:
// import { environment } from '../../environments/environment';
// const API_BASE = environment.apiUrl;
const API_BASE = 'http://localhost:8080'; // <— ajuste para o seu backend

export interface Fornecedor {
  id?: number;                // não exibido na UI, mas usado p/ update/delete
  cnpj: string;
  razaoSocial: string;
  nomeFantasia: string;
  itemFornecido: string;
  telefone: string;
  email: string;
  fundacao: string | Date;    // 'yyyy-MM-dd' (recomendado) ou Date
  cep: string;
  logradouro: string;
  numeroEndereco: string;
  complementoEndereco?: string;
  bairro: string;
  cidade: string;
  estado: string;             // UF
}

@Injectable({ providedIn: 'root' })
export class FornecedorService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${API_BASE}/api/fornecedores`;

  private get jsonHeaders(): HttpHeaders {
    return new HttpHeaders({ 'Content-Type': 'application/json' });
  }

  /** GET /api/fornecedores */
  listarTodos(): Observable<Fornecedor[]> {
    return this.http.get<Fornecedor[]>(this.baseUrl);
  }

  /** GET /api/fornecedores/cnpj/{cnpj} */
  buscarPorCnpj(cnpj: string): Observable<Fornecedor> {
    // se você salva sem máscara, pode limpar aqui: cnpj = cnpj.replace(/\D/g, '')
    return this.http.get<Fornecedor>(`${this.baseUrl}/cnpj/${encodeURIComponent(cnpj)}`);
  }

  /** PUT /api/fornecedores/{id} */
  atualizarFornecedor(id: number, body: Partial<Fornecedor>): Observable<Fornecedor> {
    return this.http.put<Fornecedor>(`${this.baseUrl}/${id}`, body, {
      headers: this.jsonHeaders,
    });
  }

  /** DELETE /api/fornecedores/{id} */
  removerFornecedor(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
