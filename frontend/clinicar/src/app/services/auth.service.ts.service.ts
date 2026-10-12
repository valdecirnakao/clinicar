import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface EsqueciSenhaRequest {
  email: string;
}

export interface RedefinirSenhaRequest {
  token: string;
  novaSenha: string;
  confirmarSenha: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private readonly apiUrl = '/api/auth';

  constructor(private readonly http: HttpClient) {}

  esqueciSenha(request: EsqueciSenhaRequest): Observable<string> {
    return this.http.post(`${this.apiUrl}/esqueci-senha`, request, {
      responseType: 'text'
    });
  }

  redefinirSenha(request: RedefinirSenhaRequest): Observable<string> {
    return this.http.post(`${this.apiUrl}/redefinir-senha`, request, {
      responseType: 'text'
    });
  }

  validarLinkRedefinicao(token: string): Observable<string> {
    return this.http.get(`${this.apiUrl}/redefinir-senha/validar`, { params: { token }, responseType: 'text' });
  }
}
