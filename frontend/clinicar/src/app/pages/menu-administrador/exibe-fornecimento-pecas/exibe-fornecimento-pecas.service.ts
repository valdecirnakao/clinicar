import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, map, catchError, throwError } from 'rxjs';
import { FornecimentoPeca } from './exibe-fornecimento-pecas.component';

const API_BASE = 'http://localhost:8080';
// ===== Ajuste conforme SEU backend =====
type SupplierApiKey = 'idFornecedor' | 'id_fornecedor';
const SUPPLIER_KEY: SupplierApiKey = 'idFornecedor';
type PartApiKey = 'idPeca' | 'id_peca';
const PART_KEY: PartApiKey = 'idPeca';
// ===== Modelo da UI =====
export interface FornecimentoPecaUI {
  id?: number;
  idFornecedor: number;
  idPeca: number;
  valorCusto: string;
  prazoEntregaDias: string;
  quantidadeMinima: string;
  ativo: string;
  dataCadastro: string;
}
@Injectable({ providedIn: 'root' })
export class ExibeFornecimentoPecasService  {
  private readonly http = inject(HttpClient);
  // ajuste para plural se o seu controller expõe /api/veiculos
  private readonly baseUrl = `${API_BASE}/api/fornecimento-pecas`;
  private get jsonHeaders(): HttpHeaders {
    return new HttpHeaders({ 'Content-Type': 'application/json' });
  }
  // ---------- MAPEAMENTO API ⇄ UI ----------
  /** Normaliza objeto vindo da API (camelCase ou snake_case) para o modelo da UI. */
  private fromApi(d: any): FornecimentoPecaUI {
    if (!d) return d;
    return {
      id: d.id,
      idFornecedor: d.idFornecedor ?? 0,
      idPeca: d.idPeca ?? 0,
      valorCusto: d.valorCusto ?? '',
      prazoEntregaDias: d.prazoEntregaDias ?? '',
      quantidadeMinima: d.quantidadeMinima ?? '',
      ativo: d.ativo ?? '',
      dataCadastro: d.dataCadastro ?? '',
    };
  }

  /** Converte do modelo da UI para o que o backend espera e remove undefined. */
  private toApi(d: Partial<FornecimentoPecaUI>): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    if (d['idFornecedor'] != null) out['idFornecedor'] = d['idFornecedor'];
    if (d['idPeca'] != null) out['idPeca'] = d['idPeca'];
    if (d.valorCusto != null) out['valorCusto'] = d['valorCusto'];
    if (d.prazoEntregaDias != null) out['prazoEntregaDias'] = d['prazoEntregaDias'];
    if (d.quantidadeMinima != null) out['quantidadeMinima'] = d['quantidadeMinima'];
    if (d.ativo != null) out['ativo'] = d['ativo'];
    if (d.dataCadastro != null) out['dataCadastro'] = d['dataCadastro'];
    // limpa undefined
    for (const k of Object.keys(out)) {
      if (out[k] === undefined) delete out[k];
    }
    return out;
  }
  // ---------- CRUD ----------
  /** GET /api/fornecimento-pecas */
  listarTodosFornecimentos(): Observable<FornecimentoPeca[]> {
    return this.http.get<FornecimentoPeca[]>(this.baseUrl);
  }
  /** POST /api/fornecimento-pecas */
  cadastrar(body: Omit<FornecimentoPecaUI, 'id'>): Observable<FornecimentoPecaUI> {
    const apiBody = this.toApi(body);
    return this.http.post<any>(this.baseUrl, apiBody, { headers: this.jsonHeaders }).pipe(
      map(v => this.fromApi(v)), catchError(err => {
        console.error('Falha em cadastrar', { bodyUI: body, apiBody, err });
        return throwError(() => err);
      })
    );
  }
  /** PUT /api/fornecimento-pecas/{id} */
  atualizarFornecimentoPeca(id: number, body: Partial<FornecimentoPecaUI>): Observable<FornecimentoPecaUI> {
    const apiBody = this.toApi(body);
    return this.http.put<any>(`${this.baseUrl}/${id}`, apiBody, { headers: this.jsonHeaders }).pipe(
      map(v => this.fromApi(v)), catchError(err => {
        console.error('Falha em atualizarFornecimentoPeca', { id, bodyUI: body, apiBody, err });
        return throwError(() => err);
      })
    );
  }
  /** DELETE /api/fornecimento-pecas/{id} */
  removerFornecimentoPeca(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
