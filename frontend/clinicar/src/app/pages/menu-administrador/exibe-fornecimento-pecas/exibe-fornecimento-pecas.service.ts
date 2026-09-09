import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, catchError, map, throwError } from 'rxjs';

const API_BASE = '';

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
    return this.http.get<any>(
      this.baseUrl,
      {
        withCredentials: true
      }
    ).pipe(
      map(resposta => this.extrairLista(resposta).map(item => this.fromApi(item))),
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
        id: fornecedorApi.id ?? d.idFornecedor ?? d.id_fornecedor ?? d.fornecedorId ?? d.fornecedor_id ?? 0,
        razaoSocial:
          fornecedorApi.razaoSocial ??
          fornecedorApi.razao_social ??
          d.razaoSocialFornecedor ??
          d.razao_social_fornecedor ??
          d.fornecedorRazaoSocial ??
          '',
        cnpj:
          fornecedorApi.cnpj ??
          d.cnpjFornecedor ??
          d.cnpj_fornecedor ??
          ''
      },

      peca: {
        id: pecaApi.id ?? d.idPeca ?? d.id_peca ?? d.pecaId ?? d.peca_id ?? 0,
        nome:
          pecaApi.nome ??
          d.nomePeca ??
          d.nome_peca ??
          d.pecaNome ??
          '',
        fabricante:
          pecaApi.fabricante ??
          d.fabricantePeca ??
          d.fabricante_peca ??
          '',
        modelo:
          pecaApi.modelo ??
          d.modeloPeca ??
          d.modelo_peca ??
          ''
      },

      valorCusto:
        d.valorCusto ??
        d.valor_custo ??
        d.valorUnitario ??
        d.valor_unitario ??
        d.custoUnitario ??
        d.custo_unitario ??
        d.precoUnitario ??
        d.preco_unitario ??
        '',

      prazoEntregaDias:
        d.prazoEntregaDias ??
        d.prazo_entrega_dias ??
        d.prazoDias ??
        d.prazo_dias ??
        '',

      quantidadeMinima:
        d.quantidadeMinima ??
        d.quantidade_minima ??
        d.qtdMinima ??
        d.qtd_minima ??
        '',

      ativo: this.normalizarAtivo(d.ativo),

      dataCadastro:
        d.dataCadastro ??
        d.data_cadastro ??
        d.criadoEm ??
        d.criado_em ??
        ''
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
      if (out[key] === undefined || out[key] === null || out[key] === '') {
        delete out[key];
      }
    });

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

    if (Array.isArray(resposta?.data)) {
      return resposta.data;
    }

    return [];
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
