import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})

export class CadastraPecaService {
  private base = '/api/peca'; // relativo


  private apiUrl = 'http://localhost:8080/api/peca'; // URL do backend

  constructor(private http: HttpClient) { }

  cadastrar(peca: any) {
    return this.http.post('http://localhost:8080/api/peca', peca);
  }

  buscarPecas(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl);
  }

  buscarPecaPorId(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}`);
  }

    listar(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl);
  }

    atualizar(id: number, peca: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${id}`, peca);
  }

    remover(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`);
  }

  atualizarPeca(id: number, peca: any): Observable<any> {
  return this.http.put<any>(`http://localhost:8080/api/peca/${id}`, peca);
  }
}
