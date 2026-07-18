import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

const API_BASE = 'http://localhost:8080';

export interface UsuarioResumo {
  id?: number;
  nome?: string;
  nome_social?: string;
  email?: string;
  cpf?: string;
  telefone?: string;
  tipo_do_acesso?: string;
}

export interface VeiculoResumo {
  id?: number;
  placa?: string;
  fabricante?: string;
  modelo?: string;
  cor?: string;
  anoModeloCombustivel?: string;
  idProprietario?: number;
}

export interface ServicoResumo {
  id?: number;
  nome?: string;
  descricao?: string;
  categoria?: string;
  tipoDoPrestador?: string;
  duracaoEstimada?: string | number;
  unidadeDuracao?: string;
  valorBase?: string | number;
  unidadeCobranca?: string;
  garantiaDias?: number;
  necessitaPecas?: boolean;
  ativo?: boolean;
  idFornecedor?: number;
  razaoSocialFornecedor?: string;
}

export interface Agendamento {
  id?: number;
  codigoAgendamento?: string;

  idCliente?: number;
  nomeCliente?: string;
  cpfCliente?: string;
  telefoneCliente?: string;
  emailCliente?: string;
  tipoAcessoCliente?: string;

  idVeiculo?: number;
  placaVeiculo?: string;
  fabricanteVeiculo?: string;
  modeloVeiculo?: string;

  idServico?: number;
  nomeServico?: string;
  categoriaServico?: string;

  idFornecedor?: number;
  razaoSocialFornecedor?: string;

  idResponsavel?: number;
  nomeResponsavel?: string;
  tipoAcessoResponsavel?: string;

  dataHoraInicio?: string;
  dataHoraFim?: string;
  duracaoEstimadaMinutos?: number;

  statusAgendamento?: string;
  canalOrigem?: string;
  prioridade?: string;
  tipoAtendimento?: string;

  quilometragemAtual?: number | null;

  queixaCliente?: string;
  diagnosticoPrevio?: string;
  observacoes?: string;

  valorEstimado?: string | number | null;
  valorFinal?: string | number | null;

  requerConfirmacao?: boolean;
  confirmado?: boolean;
  confirmadoEm?: string | null;

  lembreteEnviado?: boolean;
  lembreteEnviadoEm?: string | null;

  canceladoEm?: string | null;
  motivoCancelamento?: string | null;

  criadoEm?: string;
  atualizadoEm?: string;
}

export interface AgendamentoRequest {
  idCliente?: number | null;
  idVeiculo?: number | null;
  idServico?: number | null;
  idFornecedor?: number | null;
  idResponsavel?: number | null;

  dataHoraInicio?: string;
  dataHoraFim?: string;

  statusAgendamento?: string;
  canalOrigem?: string;
  prioridade?: string;
  tipoAtendimento?: string;

  quilometragemAtual?: number | null;

  queixaCliente?: string;
  diagnosticoPrevio?: string;
  observacoes?: string;

  valorEstimado?: string;
  valorFinal?: string;

  requerConfirmacao?: boolean;
  confirmado?: boolean;
}

export interface AgendamentoCancelamentoRequest {
  motivoCancelamento?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ExibeAgendamentosService {

  private readonly http = inject(HttpClient);

  private readonly agendamentoUrl = `${API_BASE}/api/agendamento`;
  private readonly usuarioUrl = `${API_BASE}/api/usuario`;
  private readonly veiculoUrl = `${API_BASE}/api/veiculo`;
  private readonly servicoUrl = `${API_BASE}/api/servico`;

  private get jsonHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Content-Type': 'application/json'
    });
  }

  listarTodos(): Observable<Agendamento[]> {
    return this.http.get<Agendamento[]>(
      this.agendamentoUrl,
      {
        withCredentials: true
      }
    );
  }

  listarPorStatus(status: string): Observable<Agendamento[]> {
    return this.http.get<Agendamento[]>(
      `${this.agendamentoUrl}/status/${status}`,
      {
        withCredentials: true
      }
    );
  }

  listarPorPeriodo(inicio: string, fim: string): Observable<Agendamento[]> {
    const params = new HttpParams()
      .set('inicio', inicio)
      .set('fim', fim);

    return this.http.get<Agendamento[]>(
      `${this.agendamentoUrl}/periodo`,
      {
        params,
        withCredentials: true
      }
    );
  }

  criar(body: AgendamentoRequest): Observable<Agendamento> {
    return this.http.post<Agendamento>(
      this.agendamentoUrl,
      body,
      {
        headers: this.jsonHeaders,
        withCredentials: true
      }
    );
  }

  atualizar(id: number, body: AgendamentoRequest): Observable<Agendamento> {
    return this.http.put<Agendamento>(
      `${this.agendamentoUrl}/${id}`,
      body,
      {
        headers: this.jsonHeaders,
        withCredentials: true
      }
    );
  }

  confirmar(id: number): Observable<Agendamento> {
    return this.http.patch<Agendamento>(
      `${this.agendamentoUrl}/${id}/confirmar`,
      {},
      {
        withCredentials: true
      }
    );
  }

  iniciar(id: number): Observable<Agendamento> {
    return this.http.patch<Agendamento>(
      `${this.agendamentoUrl}/${id}/iniciar`,
      {},
      {
        withCredentials: true
      }
    );
  }

  concluir(id: number): Observable<Agendamento> {
    return this.http.patch<Agendamento>(
      `${this.agendamentoUrl}/${id}/concluir`,
      {},
      {
        withCredentials: true
      }
    );
  }

  cancelar(id: number, body: AgendamentoCancelamentoRequest): Observable<Agendamento> {
    return this.http.patch<Agendamento>(
      `${this.agendamentoUrl}/${id}/cancelar`,
      body,
      {
        headers: this.jsonHeaders,
        withCredentials: true
      }
    );
  }

  naoCompareceu(id: number): Observable<Agendamento> {
    return this.http.patch<Agendamento>(
      `${this.agendamentoUrl}/${id}/nao-compareceu`,
      {},
      {
        withCredentials: true
      }
    );
  }

  listarUsuarios(): Observable<UsuarioResumo[]> {
    return this.http.get<UsuarioResumo[]>(
      this.usuarioUrl,
      {
        withCredentials: true
      }
    );
  }

  listarVeiculos(): Observable<VeiculoResumo[]> {
    return this.http.get<VeiculoResumo[]>(
      this.veiculoUrl,
      {
        withCredentials: true
      }
    );
  }

  listarServicos(): Observable<ServicoResumo[]> {
    return this.http.get<ServicoResumo[]>(
      this.servicoUrl,
      {
        withCredentials: true
      }
    );
  }
}
