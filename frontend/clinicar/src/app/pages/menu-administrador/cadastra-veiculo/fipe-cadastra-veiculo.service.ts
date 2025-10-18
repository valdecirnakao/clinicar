// fipe.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';

export interface FipeItem { code: string; name: string; }

@Injectable({ providedIn: 'root' })
export class FipeService {
  private readonly http = inject(HttpClient);
  private readonly base = 'https://parallelum.com.br/fipe/api/v1/carros';

  getMarcas(): Observable<FipeItem[]> {
    return this.http.get<any[]>(`${this.base}/marcas`).pipe(
      map(arr => (arr ?? []).map(m => ({ code: m.codigo, name: m.nome })))
    );
  }

  getModelos(codMarca: string): Observable<FipeItem[]> {
    return this.http.get<any>(`${this.base}/marcas/${codMarca}/modelos`).pipe(
      map(res => ((res?.modelos ?? []) as any[]).map(m => ({ code: m.codigo, name: m.nome })))
    );
  }

  getAnos(codMarca: string, codModelo: string): Observable<FipeItem[]> {
    return this.http.get<any[]>(`${this.base}/marcas/${codMarca}/modelos/${codModelo}/anos`).pipe(
      map(arr => (arr ?? []).map(a => ({ code: a.codigo, name: a.nome })))
    );
  }
}
