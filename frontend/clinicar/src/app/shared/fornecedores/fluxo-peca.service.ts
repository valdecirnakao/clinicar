import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, of, throwError, map } from 'rxjs';
import { Peca } from '../../pages/menu-administrador/peca/peca.service';

@Injectable({ providedIn: 'root' })
export class FluxoPecaService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  continuar(pecaId: number): Promise<boolean> {
    return this.router.navigate(['/menuAdministrador/fornecedor'], {
      queryParams: { continuarPeca: '1', pecaId }
    });
  }

  carregar(rota: ActivatedRoute): Observable<Peca | null> {
    if (rota.snapshot.queryParamMap.get('continuarPeca') !== '1') return of(null);
    const valor = rota.snapshot.queryParamMap.get('pecaId') || '';
    const id = Number(valor);
    if (!/^\d+$/.test(valor) || !Number.isSafeInteger(id) || id <= 0)
      return throwError(() => new Error('Peça inválida para continuar o cadastro.'));
    return this.http.get<Peca>(`/api/peca/${id}`, { withCredentials: true }).pipe(map(peca => {
      if (peca.id !== id) throw new Error('Peça não encontrada.');
      return peca;
    }));
  }

  consumir(rota: ActivatedRoute): void {
    if (rota.snapshot.queryParamMap.get('continuarPeca') !== '1') return;
    void this.router.navigate([], { relativeTo: rota, replaceUrl: true, queryParamsHandling: 'merge',
      queryParams: { continuarPeca: null, pecaId: null } });
  }
}
