import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

export interface ItemTrabalhoColaborador {
  id: number;
  codigo: string;
  cliente: string;
  placa: string;
  servico: string;
  inicio: string;
  fim?: string;
  status: string;
  prioridade?: string;
}

export interface PaginaTrabalhoColaborador {
  content: ItemTrabalhoColaborador[];
  totalElements: number;
  totalPages: number;
  number: number;
}
export interface AlertaTrabalhoColaborador {
  id: number;
  peca: string;
  local: string;
  quantidadeAtual: number;
  estoqueMinimo: number;
  criadoEm: string;
  status: string;
}
export interface PaginaAlertasColaborador {
  content: AlertaTrabalhoColaborador[];
  totalElements: number;
  totalPages: number;
  number: number;
}

@Injectable({ providedIn: 'root' })
export class TrabalhoColaboradorService {
  private readonly http = inject(HttpClient);

  consultar(tipo: 'agendamentos' | 'atendimentos', pagina: number, tamanho: number, busca: string, pendentes = false): Observable<PaginaTrabalhoColaborador> {
    const params = new HttpParams().set('pagina', pagina).set('tamanho', tamanho).set('busca', busca.trim()).set('pendentes', pendentes);
    return this.http.get<PaginaTrabalhoColaborador>(`/api/colaborador/meu-trabalho/${tipo}`, { params, withCredentials: true });
  }

  pendencias(): Observable<{agendamentos:number;atendimentos:number;alertasEstoque:number}> {
    return this.http.get<{agendamentos:number;atendimentos:number;alertasEstoque:number}>('/api/colaborador/meu-trabalho/pendencias', {withCredentials:true});
  }

  alertasEstoque(pagina: number, tamanho: number, busca: string): Observable<PaginaAlertasColaborador> {
    const params = new HttpParams().set('pagina', pagina).set('tamanho', tamanho).set('busca', busca.trim());
    return this.http.get<PaginaAlertasColaborador>('/api/colaborador/meu-trabalho/alertas-estoque', {params, withCredentials:true});
  }
}
