import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})

export class CadastraClienteService {
  private base = '/api/usuario'; // relativo


  private apiUrl = 'http://localhost:8080/api/usuario'; // URL do backend

  constructor(private http: HttpClient) { }

  cadastrar(usuario: any) {
    return this.http.post('http://localhost:8080/api/usuario', usuario);
  }

  buscarClientes(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl);
  }
}
