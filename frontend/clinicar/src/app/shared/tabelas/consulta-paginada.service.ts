import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
export interface PaginaCadastro<T> {content:T[];totalElements:number;totalPages:number;number:number;resumo:Record<string,number>;opcoes:Record<string,any[]>;}
@Injectable({providedIn:'root'})
export class ConsultaPaginadaService {
  private http=inject(HttpClient);
  registro<T>(recurso:string,id:number):Observable<T> {
    return this.http.get<T>('/api/'+recurso+'/'+id,{withCredentials:true});
  }
  responsaveisOcupados(inicio:string,fim:string,ignorar=0):Observable<number[]> {
    return this.http.get<number[]>('/api/agendamento/disponibilidade',{params:{inicio,fim,ignorar},withCredentials:true});
  }
  consultar<T>(recurso:string,parametros:Record<string,string|number|boolean>):Observable<PaginaCadastro<T>> {
    return this.http.get<PaginaCadastro<T>>('/api/'+recurso+'/pagina',{params:parametros,withCredentials:true});
  }
}
