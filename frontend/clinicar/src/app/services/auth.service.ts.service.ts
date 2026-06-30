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

  private readonly apiUrl = 'http://localhost:8080/api/auth';

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
}
