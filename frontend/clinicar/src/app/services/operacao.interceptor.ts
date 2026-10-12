import { HttpErrorResponse, HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { from, switchMap, tap } from 'rxjs';

/** A chave acompanha a mesma requisição, inclusive na renovação do token CSRF. */
export const operacaoInterceptor: HttpInterceptorFn = (request, next) => {
  if (!request.url.startsWith('/api/') || ['GET', 'HEAD', 'OPTIONS'].includes(request.method)
      || request.headers.has('Idempotency-Key')) return next(request);
  if(!/^\/api\/estoque-pecas\/\d+\/(entrada|saida|ajuste)$/.test(request.url))
    return next(request.clone({ setHeaders: { 'Idempotency-Key': crypto.randomUUID() } }));
  // Não persiste o conteúdo da movimentação: somente hash e chave da tentativa sem confirmação.
  const impressao=new TextEncoder().encode(request.method+request.url+JSON.stringify(request.body));
  return from(crypto.subtle.digest('SHA-256',impressao)).pipe(switchMap(digest=>{
    const fingerprint='clinicar.operacao.'+Array.from(new Uint8Array(digest)).map(b=>b.toString(16).padStart(2,'0')).join('');
    let key:string|null=null;
    try {key=sessionStorage.getItem(fingerprint);} catch {}
    key=key||crypto.randomUUID();
    try {sessionStorage.setItem(fingerprint,key);} catch {}
    const limpar=()=>{try{sessionStorage.removeItem(fingerprint);}catch{}};
    return next(request.clone({setHeaders:{'Idempotency-Key':key}})).pipe(tap({
      next:event=>{if(event instanceof HttpResponse && event.ok)limpar();},
      error:erro=>{if(erro instanceof HttpErrorResponse && erro.status>=400 && erro.status<500 && erro.status!==409)limpar();}
    }));
  }));
};
