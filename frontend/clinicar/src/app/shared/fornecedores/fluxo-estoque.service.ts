import { Injectable, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

@Injectable({ providedIn: 'root' })
export class FluxoEstoqueService {
  private readonly router = inject(Router);

  continuar(pecaId: number): Promise<boolean> {
    return this.router.navigate(['/menuAdministrador/controleEstoquePecas'], {
      queryParams: { continuarEstoque: '1', pecaId }
    });
  }

  possuiContexto(rota: ActivatedRoute): boolean {
    return rota.snapshot.queryParamMap.get('continuarEstoque') === '1';
  }

  obterPecaId(rota: ActivatedRoute): number {
    const valor = rota.snapshot.queryParamMap.get('pecaId') || '';
    const id = Number(valor);
    if (!/^\d+$/.test(valor) || !Number.isSafeInteger(id) || id <= 0) {
      throw new Error('Não foi possível identificar a peça para continuar o cadastro do estoque.');
    }
    return id;
  }

  consumirContexto(rota: ActivatedRoute): void {
    void this.router.navigate([], {
      relativeTo: rota, replaceUrl: true, queryParamsHandling: 'merge',
      queryParams: { continuarEstoque: null, pecaId: null }
    });
  }
}
