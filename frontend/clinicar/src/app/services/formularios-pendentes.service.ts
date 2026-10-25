import { DestroyRef, Injectable, inject } from '@angular/core';
import { CanDeactivateFn } from '@angular/router';
import { HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { tap } from 'rxjs';

/** Guarda somente o estado em memória, sem persistir senhas ou dados pessoais do formulário. */
@Injectable({providedIn:'root'})
export class FormulariosPendentesService {
  private iniciais=new Map<Element,string>(); private tocados=new WeakSet<Element>(); private instalado=false;
  private descartados=new WeakSet<Element>();
  private destroy=inject(DestroyRef);
  private vistos=new WeakMap<Element,Map<string,string>>();
  private originais=new WeakMap<Element,Map<string,string>>();
  private edicoes=new WeakMap<Element,number>();
  instalar():void {
    if(this.instalado) return; this.instalado=true;
    const registrar=(tipo:string,callback:EventListener,captura=false)=>{document.addEventListener(tipo,callback,captura);this.destroy.onDestroy(()=>document.removeEventListener(tipo,callback,captura));};
    registrar('shown.bs.modal',event=>{const modal=event.target as HTMLElement;modal.removeAttribute('data-preservar-rascunho');this.descartados.delete(modal);if(!this.alterado(modal))this.redefinir(modal,this.estado(modal));});
    registrar('hidden.bs.modal',event=>{const modal=event.target as HTMLElement;if(!modal.hasAttribute('data-preservar-rascunho'))this.limpar(modal);});
    const tocar=(event:Event)=>{const campo=event.target as Element;if(campo.matches('input:not([type=search]),select,textarea')){const modal=campo.closest('.modal');if(modal){this.tocados.add(modal);this.edicoes.set(modal,(this.edicoes.get(modal)??0)+1);}}};
    registrar('input',tocar);registrar('change',tocar);
    registrar('focusin',event=>{const modal=(event.target as Element).closest('.modal');if(modal)this.estado(modal);});
    registrar('click',event => {
      const alvo=event.target as Element;
      if(alvo.classList.contains('modal')&&alvo.classList.contains('show')&&alvo.getAttribute('data-bs-backdrop')!=='static'&&this.alterado(alvo)&&!this.confirmar(alvo)){event.preventDefault();event.stopImmediatePropagation();return;}
      const botao=(event.target as Element)?.closest('button,[data-bs-dismiss="modal"]');
      const modal=botao?.closest('.modal.show');
      if(!modal || !botao || !(botao.getAttribute('data-bs-dismiss')==='modal' || botao.classList.contains('btn-close') || /^cancelar$/i.test(botao.textContent?.trim()||''))) return;
      if(this.alterado(modal)&&!this.confirmar(modal)){event.preventDefault();event.stopImmediatePropagation();}
    },true);
    registrar('keydown',event=>{
      if((event as KeyboardEvent).key!=='Escape')return;
      const modal=Array.from(document.querySelectorAll('.modal.show')).at(-1);
      if(modal&&modal.getAttribute('data-bs-keyboard')!=='false'&&this.alterado(modal)&&!this.confirmar(modal)){event.preventDefault();event.stopImmediatePropagation();}
    },true);
    const antesDeSair=(event:BeforeUnloadEvent)=>{if(this.pendentes().length){event.preventDefault();event.returnValue='';}};
    window.addEventListener('beforeunload',antesDeSair);this.destroy.onDestroy(()=>window.removeEventListener('beforeunload',antesDeSair));
  }
  private serializar(campos:Map<string,string>):string{return JSON.stringify([...campos].sort(([a],[b])=>a.localeCompare(b)));}
  private limpar(modal:Element):void{this.iniciais.delete(modal);this.tocados.delete(modal);this.vistos.delete(modal);this.originais.delete(modal);this.edicoes.delete(modal);this.descartados.delete(modal);}
  private redefinir(modal:Element,estado:string):void{this.iniciais.set(modal,estado);this.originais.set(modal,new Map(JSON.parse(estado)));}
  private estado(modal:Element):string {
    const vistos=this.vistos.get(modal)??new Map<string,string>(),originais=this.originais.get(modal);
    const campos=modal.querySelectorAll<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>('input:not([type=search]):not([readonly]):not([disabled]),select:not([disabled]),textarea:not([readonly]):not([disabled])');
    Array.from(campos).forEach((field,index)=>{
      const chave=field.id||field.name||field.getAttribute('aria-label')||field.getAttribute('placeholder')||field.tagName+':'+index;
      const valor=JSON.stringify([field.value,field instanceof HTMLInputElement?field.checked:false]);
      if(!vistos.has(chave)&&originais&&!originais.has(chave))originais.set(chave,valor);
      vistos.set(chave,valor);
    });
    this.vistos.set(modal,vistos);if(originais)this.iniciais.set(modal,this.serializar(originais));
    return this.serializar(vistos);
  }
  alterado(modal:Element):boolean {if(this.descartados.has(modal))return false;const atual=this.estado(modal),original=this.iniciais.get(modal);return this.tocados.has(modal)&&original!==undefined&&original!==atual; }
  private pendentes():Element[]{return [...this.iniciais.keys()].filter(modal=>{if(!modal.isConnected||(!modal.classList.contains('show')&&!modal.hasAttribute('data-preservar-rascunho'))){this.limpar(modal);return false;}return this.alterado(modal);});}
  private confirmar(modal:Element):boolean {if(!window.confirm('Há dados não salvos neste cadastro. Deseja sair e descartar essas alterações?'))return false;this.descartados.add(modal);return true;}
  podeSair():boolean{return this.pendentes().every(modal=>this.confirmar(modal));}
  capturar():[Element,number][]{const modal=Array.from(document.querySelectorAll('.modal.show')).at(-1);return modal?[[modal,this.edicoes.get(modal)??0]]:[];}
  salvo(estados:[Element,number][]):void{for(const [modal,edicoes] of estados)if((this.edicoes.get(modal)??0)===edicoes)this.redefinir(modal,this.estado(modal));}
}
export const formularioPendenteGuard:CanDeactivateFn<unknown>=()=>inject(FormulariosPendentesService).podeSair();
export const formularioSalvoInterceptor:HttpInterceptorFn=(request,next)=>{
  if(!/^\/api\/(?:(?:usuario|fornecedor|peca|servico|veiculo|fornecimento-pecas|fornecimento-servicos|agendamento|atendimento|regra-manutencao-preventiva|configuracao-alerta-manutencao|configuracao-alerta-estoque)(?:\/\d+)?|estoque-pecas(?:\/\d+(?:\/(?:entrada|saida|ajuste))?)?)$/.test(request.url) || !['POST','PUT','PATCH'].includes(request.method))return next(request);
  const service=inject(FormulariosPendentesService), estados=service.capturar();
  return next(request).pipe(tap(event=>{if(event instanceof HttpResponse && event.ok) service.salvo(estados);}));
};
