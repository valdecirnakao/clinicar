import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

/**
 * Envio simples/manual de mensagem.
 * Use apenas se o backend possuir o endpoint /api/whatsapp/enviar.
 */
export interface WhatsAppRequest {
  telefone: string;
}

/**
 * Template de cadastro de usuário.
 */
export interface WhatsAppCadastroUsuarioRequest {
  telefone: string;
  nome: string;
}

/**
 * Template de cadastro de veículo.
 *
 * telefone: número do proprietário no formato esperado pelo backend.
 * template: nome exato do template aprovado na Meta.
 * languageCode: idioma aprovado do template. Exemplo: pt_BR.
 * parametrosBody: valores que irão substituir as variáveis {{1}}, {{2}}, etc.
 */
export interface WhatsAppCadastroVeiculoRequest {
  telefone: string;
  template: string;
  languageCode: string;
  parametrosBody: string[];
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

  enviarMensagemCadastroVeiculo(
    request: WhatsAppCadastroVeiculoRequest
  ): Observable<string> {
    return this.http.post(
      `${this.apiUrl}/cadastro-veiculo`,
      request,
      { responseType: 'text' }
    );
  }
}
