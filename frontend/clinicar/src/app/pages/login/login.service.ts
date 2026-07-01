import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface UsuarioLogado {
  id?: number;
  nome?: string;
  email?: string;
  tipo_do_acesso?: string;
  status?: string;
}

export interface LoginResponse {
  autenticado?: boolean;
  mfaRequerido?: boolean;
  mfaSetupNecessario?: boolean;
  mfaToken?: string;
  qrCodeDataUrl?: string;
  chaveManual?: string;
  mensagem?: string;
  usuario?: UsuarioLogado;
}

export interface MfaValidarRequest {
  mfaToken: string;
  codigo: string;
}

@Injectable({
  providedIn: 'root'
})
export class LoginService {

  private readonly usuarioApiUrl = 'http://localhost:8080/api/usuario';
  private readonly authApiUrl = 'http://localhost:8080/api/auth';

  constructor(private readonly http: HttpClient) {}

  login(email: string, senha: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.usuarioApiUrl}/login`, {
      email,
      senha
    });
  }

  validarMfa(request: MfaValidarRequest): Observable<UsuarioLogado> {
    return this.http.post<UsuarioLogado>(`${this.authApiUrl}/mfa/validar`, request);
  }

  solicitarRecuperacaoSenha(email: string): Observable<string> {
    return this.http.post(`${this.authApiUrl}/esqueci-senha`, { email }, {
      responseType: 'text'
    });
  }

  redefinirSenha(request: {
    token: string;
    novaSenha: string;
    confirmarSenha: string;
  }): Observable<string> {
    return this.http.post(`${this.authApiUrl}/redefinir-senha`, request, {
      responseType: 'text'
    });
  }

  cadastrar(usuario: any): Observable<any> {
    return this.http.post(this.usuarioApiUrl, usuario);
  }

  buscarUsuarios(): Observable<any[]> {
    return this.http.get<any[]>(this.usuarioApiUrl);
  }

  buscarUsuarioPorEmail(email: string): Observable<any> {
    return this.http.get<any>(`${this.usuarioApiUrl}/email/${email}`);
  }

  listar(): Observable<any[]> {
    return this.http.get<any[]>(this.usuarioApiUrl);
  }

  atualizar(id: number, usuario: any): Observable<any> {
    return this.http.put<any>(`${this.usuarioApiUrl}/${id}`, usuario);
  }

  remover(id: number): Observable<any> {
    return this.http.delete<any>(`${this.usuarioApiUrl}/${id}`);
  }

  atualizarUsuario(id: number, usuario: any): Observable<any> {
    return this.http.put<any>(`${this.usuarioApiUrl}/${id}`, usuario);
  }
}
