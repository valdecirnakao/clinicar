import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export interface SolicitacaoAcesso {
  id: number; usuarioId: number; usuarioNome: string; usuarioEmail: string; usuarioPerfil: string;
  tipo: 'INATIVACAO' | 'ENCERRAMENTO' | 'TEMPORARIA'; inicioPeriodo?: string; fimPeriodo?: string; situacaoPeriodo?: string; inativadoEm?: string; reativadoEm?: string; interrompidoEm?: string; justificativa: string; status: 'PENDENTE' | 'APROVADA' | 'RECUSADA';
  solicitadoEm: string; administradorNome?: string; motivoDecisao?: string; decididoEm?: string;
}
export interface PaginaSolicitacoes {
  itens: SolicitacaoAcesso[]; total: number; pagina: number; tamanho: number; totalPaginas: number; pendentes: number;
}
@Injectable({ providedIn: 'root' })
export class SolicitacoesAcessoService {
  private readonly http = inject(HttpClient);
  private readonly url = '/api/usuario/solicitacoes-acesso';
  minhas(pagina = 0, tamanho = 10) {
    return this.http.get<PaginaSolicitacoes>(`${this.url}/minhas`, { params: { pagina, tamanho }, withCredentials: true });
  }
  criar(tipo: string, justificativa: string, inicioPeriodo?: string, fimPeriodo?: string) {
    return this.http.post<SolicitacaoAcesso>(`${this.url}/minhas`, { tipo, justificativa, ...(tipo === 'TEMPORARIA' ? { inicioPeriodo, fimPeriodo } : {}) }, { withCredentials: true });
  }
  listar(status: string, pagina = 0, tamanho = 10) {
    return this.http.get<PaginaSolicitacoes>(this.url, { params: { status, pagina, tamanho }, withCredentials: true });
  }
  decidir(id: number, decisao: string, justificativa: string) {
    return this.http.put<SolicitacaoAcesso>(`${this.url}/${id}/decisao`, { decisao, justificativa }, { withCredentials: true });
  }
}
export function mensagemSolicitacao(erro: any, padrao: string): string {
  return typeof erro?.error?.mensagem === 'string' ? erro.error.mensagem : padrao;
}
