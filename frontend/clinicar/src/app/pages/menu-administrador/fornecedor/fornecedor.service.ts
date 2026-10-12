import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

const API_BASE = '';

export interface Fornecedor {
  id?: number;
  ativo?: boolean;
  cnpj: string;
  razaoSocial: string;
  nomeFantasia: string;
  itemFornecido: string;
  telefone: string;
  email: string;
  fundacao: string | Date;
  cep: string;
  logradouro: string;
  bairro: string;
  cidade: string;
  estado: string;
  complementoEndereco?: string;
  numeroEndereco: string;
}

@Injectable({
  providedIn: 'root'
})
export class FornecedorService {

  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${API_BASE}/api/fornecedor`;

  private get jsonHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Content-Type': 'application/json'
    });
  }

  listarTodos(): Observable<Fornecedor[]> {
    return this.http.get<Fornecedor[]>(
      this.baseUrl,
      {
        withCredentials: true
      }
    );
  }

  verificarCnpjCadastrado(cnpj: string, idIgnorado?: number): Observable<{ cadastrado: boolean }> {
    const params: Record<string, string> = { cnpj };
    if (idIgnorado != null) params['idIgnorado'] = String(idIgnorado);
    return this.http.get<{ cadastrado: boolean }>(`${this.baseUrl}/verificar-cnpj`, {
      params, withCredentials: true
    });
  }

  verificarEmailCadastrado(email: string, idIgnorado?: number): Observable<{ cadastrado: boolean }> {
    const params: Record<string, string> = { email };
    if (idIgnorado != null) params['idIgnorado'] = String(idIgnorado);
    return this.http.get<{ cadastrado: boolean }>(`${this.baseUrl}/verificar-email`, {
      params, withCredentials: true
    });
  }

  /*
   * Mantido apenas como compatibilidade, caso algum componente antigo
   * ainda chame listarTodosFornecedores().
   */
  listarTodosFornecedores(): Observable<Fornecedor[]> {
    return this.listarTodos();
  }

  cadastrarFornecedor(fornecedor: Partial<Fornecedor>): Observable<Fornecedor> {
    return this.http.post<Fornecedor>(
      this.baseUrl,
      fornecedor,
      {
        headers: this.jsonHeaders,
        withCredentials: true
      }
    );
  }

  atualizarFornecedor(id: number, fornecedor: Partial<Fornecedor>): Observable<Fornecedor> {
    return this.http.put<Fornecedor>(
      `${this.baseUrl}/${id}`,
      fornecedor,
      {
        headers: this.jsonHeaders,
        withCredentials: true
      }
    );
  }

  removerFornecedor(id: number): Observable<void> {
    return this.http.delete<void>(
      `${this.baseUrl}/${id}`,
      {
        withCredentials: true
      }
    );
  }
}
