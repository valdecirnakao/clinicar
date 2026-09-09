import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface SetupStatusResponse { setupDisponivel: boolean; estado: string; mensagem: string; }
export interface MensagemResponse { mensagem: string; }
export interface ValidarTokenResponse { valido: boolean; mensagem: string; emailMascarado?: string | null; }
export interface AdministradorInicialRequest {
  cpf: string; nome: string; nomeSocial: string; email: string; nascimento: string;
  telefone: string; cep: string; logradouro: string; numeroEndereco: string;
  complementoEndereco: string; bairro: string; cidade: string; estado: string;
}
export interface DefinirSenhaInicialRequest { token: string; senha: string; confirmarSenha: string; }

// Nunca apresentar HttpErrorResponse.message: ele pode incluir a URL com token.
export function mensagemSetupErro(erro: unknown, padrao: string): string {
  if (erro instanceof HttpErrorResponse && erro.status >= 400 && erro.status < 500) {
    const corpo: unknown = erro.error;
    if (typeof corpo === 'object' && corpo !== null && 'mensagem' in corpo && typeof corpo.mensagem === 'string') {
      return corpo.mensagem;
    }
  }
  return padrao;
}

@Injectable({ providedIn: 'root' })
export class SetupService {
  // Segue a configuração local atual; centralização fica para Docker/Nginx.
  private readonly apiUrl = '/api/setup';
  constructor(private readonly http: HttpClient) {}
  consultarStatus(): Observable<SetupStatusResponse> { return this.http.get<SetupStatusResponse>(`${this.apiUrl}/status`); }
  cadastrarAdministrador(dados: AdministradorInicialRequest): Observable<MensagemResponse> {
    return this.http.post<MensagemResponse>(`${this.apiUrl}/administrador`, dados);
  }
  validarToken(token: string): Observable<ValidarTokenResponse> {
    return this.http.get<ValidarTokenResponse>(`${this.apiUrl}/ativacao/validar`, { params: new HttpParams().set('token', token) });
  }
  definirSenha(dados: DefinirSenhaInicialRequest): Observable<MensagemResponse> {
    return this.http.post<MensagemResponse>(`${this.apiUrl}/ativacao/definir-senha`, dados);
  }
  reenviarAtivacao(): Observable<MensagemResponse> {
    return this.http.post<MensagemResponse>(`${this.apiUrl}/ativacao/reenviar`, {});
  }
}
