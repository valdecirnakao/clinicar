import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

const API_BASE = 'http://localhost:8080'; // ajuste se tiver environment

// DTO de criação/atualização (snake_case para casar com o backend)
export interface FornecimentoPecasCreateDTO {
  idFornecedor: number;
  idPeca: number;
  valorCusto: string;
  prazoEntregaDias: string;
  quantidadeMinima: string;
  dataCadastro: Date;
}

// Se o backend também responde em snake_case, use este:
export interface FornecimentoPecasResponseSnake {
  id: number;
  idFornecedor: number;
  idPeca: number;
  valorCusto: string;
  prazoEntregaDias: string;
  quantidadeMinima: string;
  dataCadastro: Date;
}

@Injectable({ providedIn: 'root' })
export class FornecimentoPecasService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${API_BASE}/api/fornecimento-pecas`; // mantenha igual ao seu Controller
  idFornecedor: number | undefined;
  idPeca: number | undefined;

  /** POST /api/fornecimento-pecas */
  criar(body: FornecimentoPecasCreateDTO): Observable<FornecimentoPecasResponseSnake> {
    const payload: FornecimentoPecasCreateDTO = {
      ...body,
      idFornecedor: body.idFornecedor || 0,
      idPeca: body.idPeca || 0,
      valorCusto: body.valorCusto?.replace('R$ ', '') || '',
      prazoEntregaDias: body.prazoEntregaDias || '',
      quantidadeMinima: body.quantidadeMinima || '',
      dataCadastro: body.dataCadastro || new Date()
    };
    return this.http.post<FornecimentoPecasResponseSnake>(this.baseUrl, payload);
  }

  /** GET /api/fornecimento-pecas */
  listarTodos(): Observable<FornecimentoPecasResponseSnake[]> {
    return this.http.get<FornecimentoPecasResponseSnake[]>(this.baseUrl);
  }

  /** GET /api/fornecimento-pecas/{id} */
  buscarPorId(id: number): Observable<FornecimentoPecasResponseSnake> {
    return this.http.get<FornecimentoPecasResponseSnake>(`${this.baseUrl}/${id}`);
  }

  /** PUT /api/fornecimento-pecas/{id} */
  atualizar(id: number, body: Partial<FornecimentoPecasCreateDTO>): Observable<FornecimentoPecasResponseSnake> {
    const payload = {
      ...body,
      ...(body.idFornecedor == null ? {} : { idFornecedor: Number(body.idFornecedor) }),
      ...(body.idPeca == null ? {} : { idPeca: Number(body.idPeca) })
    };
    return this.http.put<FornecimentoPecasResponseSnake>(`${this.baseUrl}/${id}`, payload);
  }

  /** DELETE /api/fornecimento-pecas/{id} */
  remover(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
