import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

const API_BASE = 'http://localhost:8080'; // ajuste se tiver environment

// DTO de criação/atualização (snake_case para casar com o backend)
export interface VeiculoCreateDTO {
  placa: string;
  fabricante: string;
  cor: string;
  modelo: string;
  anoModeloCombustivel: string;
  idProprietario: number; // FK: usuario.id
}

// Se o backend também responde em snake_case, use este:
export interface VeiculoResponseSnake {
  id: number;
  placa: string;
  fabricante: string;
  cor: string;
  modelo: string;
  anoModeloCombustivel: string;
  idProprietario: string; // se o backend retornar proprietario aninhado, ajuste abaixo
}

// ALTERNATIVA se o backend responder em camelCase ou com objeto proprietario:
/*
export interface VeiculoResponse {
  id: number;
  placa: string;
  fabricante: string;
  cor: string;
  modelo: string;
  anoModeloCombustivel: string;
  proprietario: { id: number; /* ... *-/ } | null;
}
*/

@Injectable({ providedIn: 'root' })
export class VeiculoService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${API_BASE}/api/veiculo`; // mantenha igual ao seu Controller

  /** POST /api/veiculo */
  criar(body: VeiculoCreateDTO): Observable<VeiculoResponseSnake> {
    const payload: VeiculoCreateDTO = {
      ...body,
      placa: (body.placa || '').toUpperCase().replace(/\s+/g, ''),
      fabricante: body.fabricante || '',
      cor: body.cor || '',
      modelo: body.modelo || '',
      anoModeloCombustivel: body.anoModeloCombustivel || '',
      idProprietario: Number(body.idProprietario)
    };
    return this.http.post<VeiculoResponseSnake>(this.baseUrl, payload);
  }

  /** GET /api/veiculo */
  listarTodos(): Observable<VeiculoResponseSnake[]> {
    return this.http.get<VeiculoResponseSnake[]>(this.baseUrl);
  }

  /** GET /api/veiculo/placa/{placa} */
  buscarPorPlaca(placa: string): Observable<VeiculoResponseSnake> {
    return this.http.get<VeiculoResponseSnake>(
      `${this.baseUrl}/placa/${encodeURIComponent(placa.toUpperCase())}`
    );
  }

  /** PUT /api/veiculo/{id} */
  atualizar(id: number, body: Partial<VeiculoCreateDTO>): Observable<VeiculoResponseSnake> {
    const payload = {
      ...body,
      ...(body.placa ? { placa: body.placa.toUpperCase().replace(/\s+/g, '') } : {}),
      ...(body.idProprietario != null ? { idProprietario: Number(body.idProprietario) } : {})
    };
    return this.http.put<VeiculoResponseSnake>(`${this.baseUrl}/${id}`, payload);
  }

  /** DELETE /api/veiculo/{id} */
  remover(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
