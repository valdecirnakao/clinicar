import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, of, map, throwError } from 'rxjs';
import { Servico } from '../../pages/menu-administrador/servico/servico.service';

@Injectable({ providedIn: 'root' })
export class FluxoServicoService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  continuar(servicoId: number): Promise<boolean> {
    return this.router.navigate(['/menuAdministrador', 'fornecimentoServico'], { queryParams: { continuarServico: '1', servicoId } });
  }
  possuiContexto(rota: ActivatedRoute): boolean { return rota.snapshot.queryParamMap.get('continuarServico') === '1'; }
  carregar(rota: ActivatedRoute): Observable<Servico | null> {
    if (!this.possuiContexto(rota)) return of(null);
    const valor = rota.snapshot.queryParamMap.get('servicoId') || '', id = Number(valor);
    if (!/^\d+$/.test(valor) || !Number.isSafeInteger(id) || id <= 0) return throwError(() => new Error('Serviço inválido para continuar o cadastro.'));
    return this.http.get<Servico>(`/api/servico/${id}`, { withCredentials: true }).pipe(map(servico => {
      if (servico.id !== id || servico.ativo === false) throw new Error('Serviço não disponível como ativo para continuar o fornecimento.');
      return servico;
    }));
  }
  consumir(rota: ActivatedRoute): void {
    if (!this.possuiContexto(rota)) return;
    void this.router.navigate([], { relativeTo: rota, replaceUrl: true, queryParamsHandling: 'merge', queryParams: { continuarServico: null, servicoId: null } });
  }
}
