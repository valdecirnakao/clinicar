import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})

export class CadastraFornecedorService {
  private readonly base = '/api/fornecedor'; // relativo


  private apiUrl = 'http://localhost:8080/api/fornecedor'; // URL do backend

  constructor(private http: HttpClient) { }

  login(email: string, senha: string) {
    return this.http.post(`${this.apiUrl}/login`, { email, senha });
  }
  cadastrar(fornecedor: any) {
    return this.http.post('http://localhost:8080/api/fornecedor', fornecedor);
  }

  recuperarSenha(email: string) {
    return this.http.get<any>(`http://localhost:8080/api/fornecedor/email/${email}`);
  }

  buscarFornecedores(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl);
  }

  buscarFornecedorPorCnpj(cnpj: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/cnpj/${cnpj}`);
  }

    listar(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl);
  }

    atualizar(id: number, usuario: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${id}`, usuario);
  }

    remover(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`);
  }

  atualizarFornecedor(id: number, fornecedor: any): Observable<any> {
  return this.http.put<any>(`http://localhost:8080/api/fornecedor/${id}`, fornecedor);
  }
}
