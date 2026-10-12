import { FormulariosPendentesService } from './formularios-pendentes.service';
import { HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { DestroyRef, Injectable, inject } from '@angular/core';
import { tap } from 'rxjs';
@Injectable({providedIn:'root'})
export class VersoesCadastroService {
  private versoes=new Map<string,number>();
  private abertas=new Map<Element,Map<string,number>>();
  private readonly destroy=inject(DestroyRef);
  private instalado=false;
  private formularios=inject(FormulariosPendentesService);
  instalar():void {
    if(this.instalado)return;this.instalado=true;
    const abrir=(event:Event)=>{const modal=event.target as Element;if(!this.formularios.alterado(modal)||!this.abertas.has(modal))this.abertas.set(modal,new Map(this.versoes));};
    const fechar=(event:Event)=>{const modal=event.target as Element;if(!this.formularios.alterado(modal))this.abertas.delete(modal);};
    document.addEventListener('shown.bs.modal',abrir);
    document.addEventListener('hidden.bs.modal',fechar);
    this.destroy.onDestroy(()=>{document.removeEventListener('shown.bs.modal',abrir);document.removeEventListener('hidden.bs.modal',fechar);});
  }
  obter(chave:string):number|undefined {
    const snapshot=[...this.abertas.values()].at(-1);
    return snapshot?.get(chave)??this.versoes.get(chave);
  }
  guardar(recurso:string,body:any):void {
    const rows=Array.isArray(body)?body:Array.isArray(body?.content)?body.content:[body];
    for(const item of rows)if(Number.isSafeInteger(item?.id)&&Number.isSafeInteger(item?.controleVersao))this.versoes.set(recurso+'/'+item.id,item.controleVersao);
  }
}
/** A revisão carregada no formulário acompanha a gravação e impede sobrescrita silenciosa. */
export const versaoCadastroInterceptor:HttpInterceptorFn=(request,next)=>{
  const match=request.url.match(/^\/api\/([^/?]+)(?:\/(\d+))?(?:[/?]|$)/);
  if(!match)return next(request);
  const service=inject(VersoesCadastroService), recurso='/api/'+match[1];
  let envio=request;
  if(match[2]&&['PUT','PATCH','DELETE'].includes(request.method)){
    const revision=service.obter(recurso+'/'+match[2]);
    if(revision!==undefined)envio=request.clone({setHeaders:{'If-Match':'"'+revision+'"'}});
  }
  return next(envio).pipe(tap(event=>{if(event instanceof HttpResponse && event.ok)service.guardar(recurso,event.body);}));
};
