import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';

export interface FiltrosHistorico { veiculoId: number; inicio: string; fim: string; situacao: string; }
export interface RegistroHistorico {
  tipo: string; id: number; codigo: string; data: string; status: string;
  placa: string; fabricante: string; modelo: string; cor: string; anoModeloCombustivel: string;
  veiculoPreservado: boolean; kmEntrada: number | null; kmSaida: number | null;
  queixa: string | null; diagnostico: string | null; execucao: string | null; recomendacoes: string | null;
  valor: number | null; finalizado: boolean;
  itens: { tipo: string; descricao: string; quantidade: number; unidade: string; valorTotal: number }[];
}
export interface HistoricoVeicular {
  veiculo: { id: number; placa: string; fabricante: string; modelo: string; cor: string; anoModeloCombustivel: string };
  inicio: string | null; fim: string | null; situacao: string; geradoEm: string;
  resumo: { agendamentos: number; atendimentos: number; finalizados: number; valorFinalizados: number; ultimaQuilometragem: number | null };
  registros: RegistroHistorico[];
}
@Injectable({ providedIn: 'root' })
export class HistoricoVeicularService {
  constructor(private http: HttpClient) {}
  consultar(filtros: FiltrosHistorico) {
    return this.http.get<HistoricoVeicular>(`/api/veiculo/${filtros.veiculoId}/historico`, { params: this.params(filtros), withCredentials: true });
  }
  exportar(filtros: FiltrosHistorico) {
    return this.http.get(`/api/veiculo/${filtros.veiculoId}/historico/pdf`, { params: this.params(filtros), withCredentials: true, responseType: 'blob' });
  }
  private params(f: FiltrosHistorico): HttpParams {
    let params = new HttpParams().set('situacao', f.situacao);
    if (f.inicio) params = params.set('inicio', f.inicio);
    if (f.fim) params = params.set('fim', f.fim);
    return params;
  }
}
