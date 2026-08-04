import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, catchError, map, throwError } from 'rxjs';

const API_BASE = 'http://localhost:8080';

type OwnerApiKey = 'idProprietario' | 'id_proprietario';
const OWNER_KEY: OwnerApiKey = 'idProprietario';

type AmcApiKey = 'anoModeloCombustivel' | 'ano_modelo_combustivel';
const AMC_KEY: AmcApiKey = 'anoModeloCombustivel';

export interface VeiculoUI {
  id?: number;
  placa: string;
  fabricante: string;
  cor: string;
  modelo: string;
  anoModeloCombustivel: string;
  idProprietario?: number;
}

@Injectable({ providedIn: 'root' })
export class VeiculoService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${API_BASE}/api/veiculo`;

  private get jsonHeaders(): HttpHeaders {
    return new HttpHeaders({ 'Content-Type': 'application/json' });
  }

  listarTodos(): Observable<VeiculoUI[]> {
    return this.http.get<any>(this.baseUrl, { withCredentials: true }).pipe(
      map(resposta => this.extrairLista(resposta).map(v => this.fromApi(v))),
      catchError(err => {
        console.error('Falha em listarTodos veículos', err);
        return throwError(() => err);
      })
    );
  }

  cadastrar(body: Omit<VeiculoUI, 'id'>): Observable<VeiculoUI> {
    const apiBody = this.toApi(body);

    return this.http.post<any>(this.baseUrl, apiBody, {
      headers: this.jsonHeaders,
      withCredentials: true
    }).pipe(
      map(v => this.fromApi(v)),
      catchError(err => {
        console.error('Falha em cadastrar veículo', { bodyUI: body, apiBody, err });
        return throwError(() => err);
      })
    );
  }

  atualizarVeiculo(id: number, body: Partial<VeiculoUI>): Observable<VeiculoUI> {
    const apiBody = this.toApi(body);

    return this.http.put<any>(`${this.baseUrl}/${id}`, apiBody, {
      headers: this.jsonHeaders,
      withCredentials: true
    }).pipe(
      map(v => this.fromApi(v)),
      catchError(err => {
        console.error('Falha em atualizarVeiculo', { id, bodyUI: body, apiBody, err });
        return throwError(() => err);
      })
    );
  }

  removerVeiculo(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`, { withCredentials: true });
  }

  private fromApi(d: any): VeiculoUI {
    if (!d) {
      return d;
    }

    return {
      id: d.id,
      placa: d.placa ?? '',
      fabricante: d.fabricante ?? '',
      cor: d.cor ?? '',
      modelo: d.modelo ?? '',
      anoModeloCombustivel: d.anoModeloCombustivel ?? d.ano_modelo_combustivel ?? '',
      idProprietario:
        d.idProprietario ??
        d.proprietarioId ??
        d.id_proprietario ??
        d.idUsuario ??
        d.id_usuario ??
        d.proprietario?.id ??
        d.usuario?.id ??
        undefined
    };
  }

  private toApi(d: Partial<VeiculoUI>): Record<string, unknown> {
    const out: Record<string, unknown> = {};

    if (d.placa != null) {
      out['placa'] = d.placa.toUpperCase().replace(/[^A-Z0-9]/g, '');
    }

    if (d.fabricante != null) {
      out['fabricante'] = d.fabricante;
    }

    if (d.cor != null) {
      out['cor'] = (d.cor ?? '').toString().trim();
    }

    if (d.modelo != null) {
      out['modelo'] = d.modelo;
    }

    if (d.anoModeloCombustivel != null) {
      out[AMC_KEY] = d.anoModeloCombustivel;
    }

    if (d.idProprietario != null) {
      out[OWNER_KEY] = Number(d.idProprietario);
    }

    for (const k of Object.keys(out)) {
      if (out[k] === undefined) {
        delete out[k];
      }
    }

    return out;
  }

  private extrairLista(resposta: any): any[] {
    if (Array.isArray(resposta)) {
      return resposta;
    }

    if (Array.isArray(resposta?.content)) {
      return resposta.content;
    }

    if (Array.isArray(resposta?.dados)) {
      return resposta.dados;
    }

    if (Array.isArray(resposta?.items)) {
      return resposta.items;
    }

    return [];
  }
}
