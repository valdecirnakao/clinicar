import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

// Se tiver environment, troque aqui:
const API_BASE = 'http://localhost:8080';

export interface Usuario {
  id?: number;
  cpf: string;
  nome: string;
  nome_social: string;
  senha: string;
  whatsappapikey: string;
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
    return (v ?? '').toString().replace(/\D/g, '');
  }

  /** GET /api/usuario */
  listarTodos(): Observable<Usuario[]> {
    return this.http.get<Usuario[]>(this.baseUrl);
  }

  /** GET /api/usuario/cpf/{cpf} */
  buscarPorCpf(cpf: string): Observable<Usuario> {
    const clean = this.onlyDigits(cpf);
    return this.http.get<Usuario>(`${this.baseUrl}/cpf/${encodeURIComponent(clean)}`);
  }

  /** POST /api/usuario */
  cadastrar(body: Omit<Usuario, 'id'>): Observable<Usuario> {
    return this.http.post<Usuario>(this.baseUrl, body, { headers: this.jsonHeaders });
  }

  /** PUT /api/usuario/{id} */
  atualizarUsuario(id: number, body: Partial<Usuario>): Observable<Usuario> {
    return this.http.put<Usuario>(`${this.baseUrl}/${id}`, body, { headers: this.jsonHeaders });
  }

  /** DELETE /api/usuario/{id} */
  removerUsuario(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
