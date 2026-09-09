import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface UsuarioLogado {
  id?: number;
  nome?: string;
  email?: string;
  tipo_do_acesso?: string;
  status?: string;
  mfaAtivo?: boolean;
  mfaTipo?: string;
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

  private readonly usuarioApiUrl = '/api/usuario';
  private readonly authApiUrl = '/api/auth';

  constructor(private readonly http: HttpClient) {}

  login(email: string, senha: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(
      `${this.usuarioApiUrl}/login`,
      { email, senha },
      {
        withCredentials: true
      }
    );
  }

  validarMfa(request: MfaValidarRequest): Observable<UsuarioLogado> {
    return this.http.post<UsuarioLogado>(
      `${this.authApiUrl}/mfa/validar`,
      request,
      {
        withCredentials: true
      }
    );
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
    return this.http.get<any[]>(this.usuarioApiUrl,
    {
      withCredentials: true
    });
  }

  buscarUsuarioPorEmail(email: string): Observable<any> {
    return this.http.get<any>(`${this.usuarioApiUrl}/email/${email}`,
    {
      withCredentials: true
    });
  }

  listar(): Observable<any[]> {
    return this.http.get<any[]>(this.usuarioApiUrl,
    {
      withCredentials: true
    });
  }

  atualizar(id: number, usuario: any): Observable<any> {
    return this.http.put<any>(`${this.usuarioApiUrl}/${id}`, usuario,
    {
      withCredentials: true
    });
  }

  remover(id: number): Observable<any> {
    return this.http.delete<any>(`${this.usuarioApiUrl}/${id}`, {
      withCredentials: true
    });
  }

  atualizarUsuario(id: number, usuario: any): Observable<any> {
    return this.http.put<any>(`${this.usuarioApiUrl}/${id}`, usuario, {
      withCredentials: true
    });
  }

  obterUsuarioLogado(): Observable<UsuarioLogado> {
    return this.http.get<UsuarioLogado>(
      `${this.authApiUrl}/me`,
      {
        withCredentials: true
      }
    );
  }

  logout(): Observable<string> {
    return this.http.post(
      `${this.authApiUrl}/logout`,
      {},
      {
        responseType: 'text',
        withCredentials: true
      }
    );
  }
}
