import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

const API_BASE = 'http://localhost:8080'; // ajuste se tiver environment

// DTO de criação/atualização (snake_case para casar com o backend)
export interface ServicoCreateDTO {
  descricao: string;
  tipoDoPrestador: string;
  duracao: number;
  unidade: string;
  idFornecedor: number; // FK: fornecedor.id
}

// Se o backend também responde em snake_case, use este:
export interface ServicoResponseSnake {
  descricao: string;
  tipoDoPrestador: string;
  duracao: number | null;
  unidade: string;
  idFornecedor: number | null; // FK: fornecedor.id
}

@Injectable({ providedIn: 'root' })
export class ServicoService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${API_BASE}/api/servico`; // mantenha igual ao seu Controller

  /** POST /api/servico */
  cadastrar(body: ServicoCreateDTO): Observable<ServicoCreateDTO> {
    const payload: ServicoCreateDTO = {
      ...body
    };
    return this.http.post<ServicoCreateDTO>(this.baseUrl, payload);
  }

  /** GET /api/servico */
  listarTodos(): Observable<ServicoResponseSnake[]> {
    return this.http.get<ServicoResponseSnake[]>(this.baseUrl);
  }

  /** GET /api/servico/descricao/{descricao} */
  buscarPorDescricao(descricao: string): Observable<ServicoResponseSnake> {
    return this.http.get<ServicoResponseSnake>(
      `${this.baseUrl}/descricao/${encodeURIComponent(descricao.toUpperCase())}`
    );
  }

  /** PUT /api/servico/{id} */
  atualizar(id: number, body: Partial<ServicoCreateDTO>): Observable<ServicoResponseSnake> {
    const payload = {
      ...body,
      ...(body.descricao ? { descricao: body.descricao.toUpperCase().replaceAll(/\s+/g, '') } : {}),
      ...(body.idFornecedor == null ? {} : { idFornecedor: Number(body.idFornecedor) })
    };
    return this.http.put<ServicoResponseSnake>(`${this.baseUrl}/${id}`, payload);
  }

  /** DELETE /api/servico/{id} */
  remover(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
