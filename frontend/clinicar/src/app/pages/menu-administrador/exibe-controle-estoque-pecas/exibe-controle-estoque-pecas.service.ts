import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

const API_BASE = 'http://localhost:8080';

export interface PecaResumo {
  id?: number;
  nome: string;
  tipo?: string;
  especificacao?: string;
  fabricante: string;
  modelo?: string;
  norma?: string;
  unidade: string;
}

export interface LocalEstoque {
  id?: number;
  nome: string;
  descricao?: string;
  ativo?: boolean;
  criadoEm?: string;
  atualizadoEm?: string;
}

export interface LocalEstoqueRequest {
  nome?: string;
  descricao?: string;
  ativo?: boolean;
}

export interface EstoquePeca {
  id?: number;

  idPeca?: number;
  nomePeca?: string;
  fabricantePeca?: string;
  modeloPeca?: string;
  unidadePeca?: string;

  idLocalEstoque?: number;
  nomeLocalEstoque?: string;

  quantidadeAtual?: string | number;
  quantidadeReservada?: string | number;

  estoqueMinimo?: string | number;
  estoqueCritico?: string | number;
  estoqueMaximo?: string | number | null;

  pontoReposicao?: string | number | null;
  quantidadeReposicaoSugerida?: string | number | null;

  custoMedio?: string | number | null;
  localizacaoFisica?: string;

  statusEstoque?: string;
  ativo?: boolean;

  criadoEm?: string;
  atualizadoEm?: string;
}

export interface EstoquePecaRequest {
  idPeca?: number | null;
  idLocalEstoque?: number | null;

  quantidadeAtual?: string;
  quantidadeReservada?: string;

  estoqueMinimo?: string;
  estoqueCritico?: string;
  estoqueMaximo?: string;

  pontoReposicao?: string;
  quantidadeReposicaoSugerida?: string;

  custoMedio?: string;
  localizacaoFisica?: string;

  ativo?: boolean;
}

export interface MovimentacaoEstoquePeca {
  id?: number;

  idEstoquePeca?: number;
  idPeca?: number;
  nomePeca?: string;

  tipoMovimento?: string;

  quantidade?: string | number;

  saldoAnterior?: string | number;
  saldoPosterior?: string | number;

  valorUnitario?: string | number | null;
  valorTotal?: string | number | null;

  origem?: string;
  documentoReferencia?: string;
  motivo?: string;
  observacoes?: string;

  idUsuario?: number | null;

  criadoEm?: string;
}

export interface MovimentacaoEstoquePecaRequest {
  tipoMovimento?: string;
  quantidade?: string;
  valorUnitario?: string;
  origem?: string;
  documentoReferencia?: string;
  motivo?: string;
  observacoes?: string;
  idUsuario?: number | null;
}

export interface AlertaEstoquePeca {
  id?: number;

  idEstoquePeca?: number;
  idPeca?: number;
  nomePeca?: string;
  nomeLocalEstoque?: string;

  nivelAlerta?: string;
  statusAlerta?: string;

  quantidadeAtual?: string | number;
  estoqueMinimo?: string | number;
  estoqueCritico?: string | number;

  mensagem?: string;

  whatsappEnviado?: boolean;
  whatsappEnviadoEm?: string;
  whatsappDestinatario?: string;
  whatsappMessageId?: string;

  tentativasEnvio?: number;
  ultimoErro?: string;

  criadoEm?: string;
  atualizadoEm?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ExibeControleEstoquePecasService {

  private readonly http = inject(HttpClient);

  private readonly estoqueUrl = `${API_BASE}/api/estoque-pecas`;
  private readonly localUrl = `${API_BASE}/api/local-estoque`;
  private readonly alertaUrl = `${API_BASE}/api/alertas-estoque`;
  private readonly pecaUrl = `${API_BASE}/api/peca`;

  private get jsonHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Content-Type': 'application/json'
    });
  }

  listarEstoques(): Observable<EstoquePeca[]> {
    return this.http.get<EstoquePeca[]>(
      this.estoqueUrl,
      {
        withCredentials: true
      }
    );
  }

  listarEstoquesAtivos(): Observable<EstoquePeca[]> {
    return this.http.get<EstoquePeca[]>(
      `${this.estoqueUrl}/ativos`,
      {
        withCredentials: true
      }
    );
  }

  listarEstoquesCriticos(): Observable<EstoquePeca[]> {
    return this.http.get<EstoquePeca[]>(
      `${this.estoqueUrl}/criticos`,
      {
        withCredentials: true
      }
    );
  }

  cadastrarEstoque(body: EstoquePecaRequest): Observable<EstoquePeca> {
    return this.http.post<EstoquePeca>(
      this.estoqueUrl,
      body,
      {
        headers: this.jsonHeaders,
        withCredentials: true
      }
    );
  }

  atualizarEstoque(id: number, body: EstoquePecaRequest): Observable<EstoquePeca> {
    return this.http.put<EstoquePeca>(
      `${this.estoqueUrl}/${id}`,
      body,
      {
        headers: this.jsonHeaders,
        withCredentials: true
      }
    );
  }

  registrarEntrada(
    idEstoque: number,
    body: MovimentacaoEstoquePecaRequest
  ): Observable<EstoquePeca> {
    return this.http.post<EstoquePeca>(
      `${this.estoqueUrl}/${idEstoque}/entrada`,
      body,
      {
        headers: this.jsonHeaders,
        withCredentials: true
      }
    );
  }

  registrarSaida(
    idEstoque: number,
    body: MovimentacaoEstoquePecaRequest
  ): Observable<EstoquePeca> {
    return this.http.post<EstoquePeca>(
      `${this.estoqueUrl}/${idEstoque}/saida`,
      body,
      {
        headers: this.jsonHeaders,
        withCredentials: true
      }
    );
  }

  registrarAjuste(
    idEstoque: number,
    body: MovimentacaoEstoquePecaRequest
  ): Observable<EstoquePeca> {
    return this.http.post<EstoquePeca>(
      `${this.estoqueUrl}/${idEstoque}/ajuste`,
      body,
      {
        headers: this.jsonHeaders,
        withCredentials: true
      }
    );
  }

  listarMovimentacoes(idEstoque: number): Observable<MovimentacaoEstoquePeca[]> {
    return this.http.get<MovimentacaoEstoquePeca[]>(
      `${this.estoqueUrl}/${idEstoque}/movimentacoes`,
      {
        withCredentials: true
      }
    );
  }

  listarPecas(): Observable<PecaResumo[]> {
    return this.http.get<PecaResumo[]>(
      this.pecaUrl,
      {
        withCredentials: true
      }
    );
  }

  listarLocais(): Observable<LocalEstoque[]> {
    return this.http.get<LocalEstoque[]>(
      this.localUrl,
      {
        withCredentials: true
      }
    );
  }

  listarLocaisAtivos(): Observable<LocalEstoque[]> {
    return this.http.get<LocalEstoque[]>(
      `${this.localUrl}/ativos`,
      {
        withCredentials: true
      }
    );
  }

  cadastrarLocal(body: LocalEstoqueRequest): Observable<LocalEstoque> {
    return this.http.post<LocalEstoque>(
      this.localUrl,
      body,
      {
        headers: this.jsonHeaders,
        withCredentials: true
      }
    );
  }

  listarAlertas(): Observable<AlertaEstoquePeca[]> {
    return this.http.get<AlertaEstoquePeca[]>(
      this.alertaUrl,
      {
        withCredentials: true
      }
    );
  }

  listarAlertasAbertos(): Observable<AlertaEstoquePeca[]> {
    return this.http.get<AlertaEstoquePeca[]>(
      `${this.alertaUrl}/abertos`,
      {
        withCredentials: true
      }
    );
  }

  resolverAlerta(idAlerta: number): Observable<AlertaEstoquePeca> {
    return this.http.patch<AlertaEstoquePeca>(
      `${this.alertaUrl}/${idAlerta}/resolver`,
      {},
      {
        withCredentials: true
      }
    );
  }

  reenviarWhatsapp(idAlerta: number): Observable<AlertaEstoquePeca> {
    return this.http.post<AlertaEstoquePeca>(
      `${this.alertaUrl}/${idAlerta}/reenviar-whatsapp`,
      {},
      {
        withCredentials: true
      }
    );
  }
}
