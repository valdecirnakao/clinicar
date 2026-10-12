import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { NavigationEnd, Router } from '@angular/router';
import { filter, tap } from 'rxjs';
@Injectable({providedIn:'root'})
export class ContinuidadeService {
  private http=inject(HttpClient); private router=inject(Router); private ativo:number|null=null; private rota='';
  private instalado=false;
  registrar(rota:string,parametros:Record<string,string>):void {
    if(!this.instalado)return;
    const anterior=this.ativo;
    this.http.post<{id:number}>('/api/continuidade',{rota,parametros}).subscribe({next:r=>{
      this.ativo=r.id;this.rota=rota;
      if(anterior && anterior!==r.id)this.http.post('/api/continuidade/'+anterior+'/concluir',{}).subscribe({error:()=>{}});
    },error:()=>{}});
  }
  concluir():void {
    if(!this.ativo)return;
    const id=this.ativo;
    this.http.post('/api/continuidade/'+id+'/concluir',{}).subscribe({next:()=>{if(this.ativo===id)this.ativo=null;},error:()=>{}});
  }
  instalar():void{if(this.instalado)return;this.instalado=true;this.router.events.pipe(filter(event=>event instanceof NavigationEnd)).subscribe(()=>{
    const url=this.router.parseUrl(this.router.url), segmentos=url.root.children['primary']?.segments||[];
    if(segmentos[0]?.path!=='menuAdministrador')return;
    const rota=segmentos[1]?.path, params=url.queryParams;
    if(!rota || !Object.keys(params).some(key=>key.startsWith('continuar')&&params[key]==='1'))return;
    if(params['retomarCadastro']){this.ativo=Number(params['retomarCadastro']);this.rota=rota;return;}
    this.registrar(rota,params);
  });}
  registrarConclusao(url:string):void {
    const destinos:Record<string,string>={controleEstoquePecas:'/api/estoque-pecas',fornecimentoServico:'/api/fornecimento-servicos',alertasClientes:'/api/configuracao-alerta-manutencao',alertasColaboradores:'/api/configuracao-alerta-estoque'};
    const destino=destinos[this.rota];
    if(this.ativo && destino && (url===destino || new RegExp('^'+destino+'/[0-9]+$').test(url))){
      const id=this.ativo;this.http.post('/api/continuidade/'+id+'/concluir',{}).subscribe({next:()=>{if(this.ativo===id)this.ativo=null;},error:()=>{}});
    }
  }
}
export const continuidadeInterceptor:HttpInterceptorFn=(request,next)=>{
  if(!request.url.startsWith('/api/') || !['POST','PUT'].includes(request.method) || request.url.startsWith('/api/continuidade'))return next(request);
  const service=inject(ContinuidadeService);
  return next(request).pipe(tap(event=>{if(event instanceof HttpResponse && event.ok)service.registrarConclusao(request.url);}));
};
