import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, catchError, map, throwError } from 'rxjs';

const API_BASE = 'http://localhost:8080';

export interface FornecedorResumo {
  id: number;
  razaoSocial: string;
  cnpj?: string;
}

export interface PecaResumo {
  id?: number;
  nome: string;
  fabricante: string;
  modelo?: string;
}

export interface FornecimentoPeca {
  id?: number;
  fornecedor: FornecedorResumo;
  peca: PecaResumo;
  valorCusto: string | number;
  prazoEntregaDias: string | number;
  quantidadeMinima: string | number;
  ativo: boolean;
  dataCadastro: string;
}

export interface FornecimentoPecaRequest {
  idFornecedor?: number;
  idPeca?: number;
  valorCusto?: string | number;
  prazoEntregaDias?: string | number;
  quantidadeMinima?: string | number;
  ativo?: boolean;
  dataCadastro?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ExibeFornecimentoPecasService {

  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${API_BASE}/api/fornecimento-pecas`;

  private get jsonHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Content-Type': 'application/json'
    });
  }

  listarTodosFornecimentos(): Observable<FornecimentoPeca[]> {
    return this.http.get<any[]>(
      this.baseUrl,
      {
        withCredentials: true
      }
    ).pipe(
      map(lista => (lista || []).map(item => this.fromApi(item))),
      catchError(err => {
        console.error('Falha ao listar fornecimentos de peças:', err);
        return throwError(() => err);
      })
    );
  }

  cadastrar(body: FornecimentoPecaRequest): Observable<FornecimentoPeca> {
    const apiBody = this.toApi(body);

    return this.http.post<any>(
      this.baseUrl,
      apiBody,
      {
        headers: this.jsonHeaders,
        withCredentials: true
      }
    ).pipe(
      map(item => this.fromApi(item)),
      catchError(err => {
        console.error('Falha ao cadastrar fornecimento de peça:', {
          body,
          apiBody,
          err
        });

        return throwError(() => err);
      })
    );
  }

  atualizarFornecimentoPeca(
    id: number,
    body: FornecimentoPecaRequest
  ): Observable<FornecimentoPeca> {
    const apiBody = this.toApi(body);

    return this.http.put<any>(
      `${this.baseUrl}/${id}`,
      apiBody,
      {
        headers: this.jsonHeaders,
        withCredentials: true
      }
    ).pipe(
      map(item => this.fromApi(item)),
      catchError(err => {
        console.error('Falha ao atualizar fornecimento de peça:', {
          id,
          body,
          apiBody,
          err
        });

        return throwError(() => err);
      })
    );
  }

  removerFornecimentoPeca(id: number): Observable<void> {
    return this.http.delete<void>(
      `${this.baseUrl}/${id}`,
      {
        withCredentials: true
      }
    );
  }

  private fromApi(d: any): FornecimentoPeca {
    if (!d) {
      return d;
    }

    const fornecedorApi = d.fornecedor ?? {};
    const pecaApi = d.peca ?? {};

    return {
      id: d.id,

      fornecedor: {
        id: fornecedorApi.id ?? d.idFornecedor ?? d.id_fornecedor ?? 0,
        razaoSocial:
          fornecedorApi.razaoSocial ??
          d.razaoSocialFornecedor ??
          d.fornecedorRazaoSocial ??
          '',
        cnpj:
          fornecedorApi.cnpj ??
          d.cnpjFornecedor ??
          ''
      },

      peca: {
        id: pecaApi.id ?? d.idPeca ?? d.id_peca ?? 0,
        nome:
          pecaApi.nome ??
          d.nomePeca ??
          d.pecaNome ??
          '',
        fabricante:
          pecaApi.fabricante ??
          d.fabricantePeca ??
          '',
        modelo:
          pecaApi.modelo ??
          d.modeloPeca ??
          ''
      },

      valorCusto: d.valorCusto ?? d.valor_custo ?? '',
      prazoEntregaDias: d.prazoEntregaDias ?? d.prazo_entrega_dias ?? '',
      quantidadeMinima: d.quantidadeMinima ?? d.quantidade_minima ?? '',
      ativo: this.normalizarAtivo(d.ativo),
      dataCadastro: d.dataCadastro ?? d.data_cadastro ?? ''
    };
  }

  private toApi(d: FornecimentoPecaRequest): Record<string, unknown> {
    const out: Record<string, unknown> = {};

    if (d.idFornecedor != null) {
      out['idFornecedor'] = d.idFornecedor;
    }

    if (d.idPeca != null) {
      out['idPeca'] = d.idPeca;
    }

    if (d.valorCusto != null) {
      out['valorCusto'] = d.valorCusto;
    }

    if (d.prazoEntregaDias != null) {
      out['prazoEntregaDias'] = d.prazoEntregaDias;
    }

    if (d.quantidadeMinima != null) {
      out['quantidadeMinima'] = d.quantidadeMinima;
    }

    if (d.ativo != null) {
      out['ativo'] = d.ativo;
    }

    if (d.dataCadastro != null) {
      out['dataCadastro'] = d.dataCadastro;
    }

    Object.keys(out).forEach(key => {
      if (out[key] === undefined) {
        delete out[key];
      }
    });

    return out;
  }

  private normalizarAtivo(valor: any): boolean {
    if (typeof valor === 'boolean') {
      return valor;
    }

    if (typeof valor === 'number') {
      return valor === 1;
    }

    const texto = String(valor ?? '').trim().toLowerCase();

    return texto === 'true' ||
      texto === 'ativo' ||
      texto === '1' ||
      texto === 'sim' ||
      texto === 's';
  }
}
