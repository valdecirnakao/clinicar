import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, of, map, throwError } from 'rxjs';
import { Fornecedor } from '../../pages/menu-administrador/fornecedor/fornecedor.service';

export type TipoItemFornecedor = 'peca' | 'servico';
export interface ContextoFornecedor {
  fornecedor: Fornecedor;
  itemId: number | null;
}

@Injectable({ providedIn: 'root' })
export class FluxoFornecedorService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  possuiContexto(rota: ActivatedRoute): boolean {
    return rota.snapshot.queryParamMap.get('continuarCadastro') === '1';
  }

  carregarContexto(rota: ActivatedRoute, tipo: TipoItemFornecedor): Observable<ContextoFornecedor | null> {
    if (!this.possuiContexto(rota)) return of(null);
    const params = rota.snapshot.queryParamMap;
    const fornecedorId = this.idValido(params.get('fornecedorId'));
    const itemInformado = params.get(tipo === 'peca' ? 'pecaId' : 'servicoId');
    const itemId = this.idValido(itemInformado);
    if (!fornecedorId || (itemInformado !== null && !itemId)) {
      return throwError(() => new Error('Não foi possível identificar o fornecedor ou o item para continuar o cadastro.'));
    }
    return this.http.get<Fornecedor>(`/api/fornecedor/${fornecedorId}`, { withCredentials: true }).pipe(
      map(fornecedor => {
        if (fornecedor.ativo === false) throw new Error('Fornecedor inativo. Selecione um fornecedor ativo.');
        if (fornecedor.id !== fornecedorId) throw new Error('Fornecedor não encontrado para continuar o cadastro.');
        return { fornecedor, itemId };
      })
    );
  }

  iniciar(tipo: TipoItemFornecedor, novoItem: boolean, fornecedorId: number): Promise<boolean> {
    const pagina = novoItem ? (tipo === 'peca' ? 'peca' : 'servico')
      : (tipo === 'peca' ? 'fornecimentoPecas' : 'fornecimentoServico');
    return this.router.navigate(['/menuAdministrador', pagina], {
      queryParams: { continuarCadastro: '1', fornecedorId }
    });
  }

  continuarComItem(tipo: TipoItemFornecedor, fornecedorId: number, itemId: number): Promise<boolean> {
    return this.router.navigate(['/menuAdministrador', tipo === 'peca' ? 'fornecimentoPecas' : 'fornecimentoServico'], {
      queryParams: { continuarCadastro: '1', fornecedorId, [tipo === 'peca' ? 'pecaId' : 'servicoId']: itemId }
    });
  }

  consumirContexto(rota: ActivatedRoute): void {
    if (!this.possuiContexto(rota)) return;
    void this.router.navigate([], {
      relativeTo: rota, replaceUrl: true, queryParamsHandling: 'merge',
      queryParams: { continuarCadastro: null, fornecedorId: null, pecaId: null, servicoId: null }
    });
  }

  private idValido(valor: string | null): number | null {
    if (!valor || !/^\d+$/.test(valor)) return null;
    const id = Number(valor);
    return Number.isSafeInteger(id) && id > 0 ? id : null;
  }
}
