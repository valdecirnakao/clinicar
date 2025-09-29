import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, map, catchError, throwError } from 'rxjs';

const API_BASE = 'http://localhost:8080';

// ===== Ajuste conforme SEU backend =====
type OwnerApiKey = 'idProprietario' | 'id_proprietario';
const OWNER_KEY: OwnerApiKey = 'idProprietario';

type AmcApiKey = 'anoModeloCombustivel' | 'ano_modelo_combustivel';
const AMC_KEY: AmcApiKey = 'anoModeloCombustivel';

// ===== Modelo da UI =====
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
  // ajuste para plural se o seu controller expõe /api/veiculos
  private readonly baseUrl = `${API_BASE}/api/veiculo`;

  private get jsonHeaders(): HttpHeaders {
    return new HttpHeaders({ 'Content-Type': 'application/json' });
  }

  // ---------- MAPEAMENTO API ⇄ UI ----------
  /** Normaliza objeto vindo da API (camelCase ou snake_case) para o modelo da UI. */
  private fromApi(d: any): VeiculoUI {
    if (!d) return d;
    return {
      id: d.id,
      placa: d.placa ?? '',
      fabricante: d.fabricante ?? '',
      cor: d.cor ?? '',
      modelo: d.modelo ?? '',
      anoModeloCombustivel: d.anoModeloCombustivel ?? d.ano_modelo_combustivel ?? '',
      // aceita proprietarioId (camel) ou id_proprietario (snake)
      idProprietario:
        d.proprietarioId ??
        d.id_proprietario ??
        d.idProprietario ?? // fallback caso backend envie assim por engano
        undefined,
    };
  }

  /** Converte do modelo da UI para o que o backend espera e remove undefined. */
  private toApi(d: Partial<VeiculoUI>): Record<string, unknown> {
    const out: Record<string, unknown> = {};

    if (d['placa'] != null)        out['placa'] = d['placa'].toUpperCase().replace(/\s+/g, '');
    if (d['fabricante'] != null)   out['fabricante'] = d['fabricante'];
    if (d.cor != null)          out['cor'] = (d.cor ?? '').toString().trim();
    if (d.modelo != null)       out['modelo'] = d['modelo'];

    if (d.anoModeloCombustivel != null) out[AMC_KEY] = d.anoModeloCombustivel;
    if (d.idProprietario != null)       out[OWNER_KEY] = Number(d.idProprietario);

    // limpa undefined
    Object.keys(out).forEach(k => out[k] === undefined && delete out[k]);
    return out;
  }

  // ---------- CRUD ----------
  /** GET /api/veiculo */
  listarTodos(): Observable<VeiculoUI[]> {
    return this.http.get<any[]>(this.baseUrl).pipe(
      map(arr => (arr ?? []).map(v => this.fromApi(v)))
    );
  }

  /** POST /api/veiculo */
  cadastrar(body: Omit<VeiculoUI, 'id'>): Observable<VeiculoUI> {
    const apiBody = this.toApi(body);
    return this.http.post<any>(this.baseUrl, apiBody, { headers: this.jsonHeaders }).pipe(
      map(v => this.fromApi(v)),
      catchError(err => {
        console.error('Falha em cadastrar', { bodyUI: body, apiBody, err });
        return throwError(() => err);
      })
    );
  }

  /** PUT /api/veiculo/{id} */
  atualizarVeiculo(id: number, body: Partial<VeiculoUI>): Observable<VeiculoUI> {
    const apiBody = this.toApi(body);
    return this.http.put<any>(`${this.baseUrl}/${id}`, apiBody, { headers: this.jsonHeaders }).pipe(
      map(v => this.fromApi(v)),
      catchError(err => {
        console.error('Falha em atualizarVeiculo', { id, bodyUI: body, apiBody, err });
        return throwError(() => err);
      })
    );
  }

  /** DELETE /api/veiculo/{id} */
  removerVeiculo(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  // (Opcional) Exemplo de busca por proprietário, se existir no backend:
  // buscarPorProprietario(idProprietario: number): Observable<VeiculoUI[]> {
  //   return this.http.get<any[]>(`${this.baseUrl}/proprietario/${idProprietario}`)
  //     .pipe(map(arr => (arr ?? []).map(v => this.fromApi(v))));
  // }
}
