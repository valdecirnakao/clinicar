import { Injectable, inject } from '@angular/core';
import { Observable, map, of, switchMap } from 'rxjs';
import { ConsultaPaginadaService } from './consulta-paginada.service';

/** Consulta vínculos de um único produto; nunca descarrega o catálogo de fornecimentos. */
@Injectable({providedIn:'root'})
export class CatalogosFormularioService {
  private readonly api=inject(ConsultaPaginadaService);
  fornecimentoPreferido(pecaId:number):Observable<any|null>{
    const filtros={'peca.id':pecaId,selecao:true,pagina:0,tamanho:1,ordenar:'valorCusto'};
    return this.api.consultar<any>('fornecimento-pecas',{...filtros,ativo:true}).pipe(
      switchMap(p=>p.content.length?of(p.content[0]):this.api.consultar<any>('fornecimento-pecas',{...filtros,ativo:false}).pipe(map(r=>r.content[0]??null)))
    );
  }
}
