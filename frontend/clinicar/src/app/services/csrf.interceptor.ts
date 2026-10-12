import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { Observable, catchError, finalize, of, shareReplay, switchMap, tap, throwError } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class CsrfService {
  private readonly http = inject(HttpClient);
  private token = '';
  private pendente?: Observable<{ token: string }>;

  obter(atualizar = false): Observable<{ token: string }> {
    if (atualizar) this.token = '';
    if (this.token) return of({ token: this.token });
    return this.pendente ??= this.http.get<{ token: string }>('/api/auth/csrf', { withCredentials: true }).pipe(
      tap(resposta => this.token = resposta.token),
      finalize(() => this.pendente = undefined),
      shareReplay({ bufferSize: 1, refCount: false })
    );
  }
}

/** O token é solicitado antes da primeira gravação; nunca é enviado a serviços externos. */
export const csrfInterceptor: HttpInterceptorFn = (request, next) => {
  if (!request.url.startsWith('/api/') || ['GET', 'HEAD', 'OPTIONS'].includes(request.method)) return next(request);
  const csrf = inject(CsrfService);
  const enviar = (token: string) => next(token
    ? request.clone({ withCredentials: true, setHeaders: { 'X-XSRF-TOKEN': token } }) : request);
  return csrf.obter().pipe(switchMap(resposta => enviar(resposta.token)), catchError((erro: unknown) => {
    // Só repetimos quando o filtro rejeitou a requisição antes de executar a operação.
    if (erro instanceof HttpErrorResponse && erro.status === 403 && erro.headers.get('X-CliniCar-CSRF') === 'invalid')
      return csrf.obter(true).pipe(switchMap(resposta => enviar(resposta.token)));
    return throwError(() => erro);
  }));
};
