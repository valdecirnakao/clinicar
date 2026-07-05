import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
const API_BASE = 'http://localhost:8080';
export interface Usuario {
  id?: number;
  cpf: string;
  nome: string;
  nome_social: string;
  senha: string;
  status: string;
  email: string;
  nascimento: string | Date;     // 'yyyy-MM-dd' ou Date
  cep: string;
  logradouro: string;
  numero_endereco: string;       // <— padronizado snake_case
  complemento_endereco?: string; // <— padronizado snake_case
  bairro: string;
  cidade: string;
  estado: string;                // UF
  tipo_do_acesso: string;        // confirmado por você
  telefone: string;
  mfaAtivo?: boolean;
  mfaTipo?: string;
}
@Injectable({ providedIn: 'root' })
export class UsuarioService {
  private readonly http = inject(HttpClient);
  // Ajuste para plural se seu controller expõe /api/usuarios
  private readonly baseUrl = `${API_BASE}/api/usuario`;
  private get jsonHeaders(): HttpHeaders {
    return new HttpHeaders({ 'Content-Type': 'application/json' });
  }
  private onlyDigits(v: any): string {
    return (v ?? '').toString().replaceAll(/\D/g, '');
  }
  /** GET /api/usuario */
  listarTodos(): Observable<Usuario[]> {
    return this.http.get<Usuario[]>(this.baseUrl, {
      withCredentials: true
    });
  }
  /** GET /api/usuario/cpf/{cpf} */
  buscarPorCpf(cpf: string): Observable<Usuario> {
    const clean = this.onlyDigits(cpf);
    return this.http.get<Usuario>(`${this.baseUrl}/cpf/${encodeURIComponent(clean)}`, {
      withCredentials: true
    });
  }
  /** POST /api/usuario */
  cadastrar(body: Omit<Usuario, 'id'>): Observable<Usuario> {
    return this.http.post<Usuario>(this.baseUrl, body, { headers: this.jsonHeaders, withCredentials: true });
  }
  /** PUT /api/usuario/{id} */
  atualizarUsuario(id: number, body: Partial<Usuario>): Observable<Usuario> {
    return this.http.put<Usuario>(`${this.baseUrl}/${id}`, body, { headers: this.jsonHeaders, withCredentials: true });
  }
  /** DELETE /api/usuario/{id} */
  removerUsuario(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`,
    {
      withCredentials: true
    });
  }

  criarUsuario(usuario: Partial<Usuario>): Observable<Usuario> {
    return this.http.post<Usuario>(
      'http://localhost:8080/api/usuario',
      usuario,
      {
        withCredentials: true
      }
    );
  }

  resetarMfa(id: number): Observable<{ mensagem: string }> {
    return this.http.put<{ mensagem: string }>(`${this.baseUrl}/${id}/resetar-mfa`,{}, {
      withCredentials: true
    });
  }
}
