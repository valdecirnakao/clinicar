import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface WhatsAppRequest {
  telefone: string;
}

export interface WhatsAppCadastroUsuarioRequest {
  telefone: string;
  nome: string;
}

@Injectable({
  providedIn: 'root'
})

export class WhatsappCloudService {

  private readonly apiUrl = 'http://localhost:8080/api/whatsapp';

  constructor(
    private readonly http: HttpClient
  ) {}

  enviarMensagem(request: WhatsAppRequest): Observable<string> {
    return this.http.post(
      `${this.apiUrl}/enviar`,
      request,
      { responseType: 'text' }
    );
  }

  enviarMensagemCadastroUsuario(
    request: WhatsAppCadastroUsuarioRequest
  ): Observable<string> {
    return this.http.post(
      `${this.apiUrl}/cadastro-usuario`,
      request,
      { responseType: 'text' }
    );
  }
}
