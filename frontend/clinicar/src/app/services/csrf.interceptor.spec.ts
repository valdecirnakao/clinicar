import { provideZoneChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { HttpClient, HttpHeaders, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { csrfInterceptor } from './csrf.interceptor';
import { operacaoInterceptor } from './operacao.interceptor';

describe('Proteção das operações', () => {
  let http: HttpClient; let backend: HttpTestingController;
  beforeEach(() => { TestBed.configureTestingModule({ providers: [provideZoneChangeDetection(), provideHttpClient(withInterceptors([operacaoInterceptor, csrfInterceptor])), provideHttpClientTesting()] }); http=TestBed.inject(HttpClient); backend=TestBed.inject(HttpTestingController); });
  afterEach(() => backend.verify());
  it('obtém CSRF antes da gravação e preserva a chave ao renovar o token', async () => {
    spyOn(crypto.subtle,'digest').and.returnValue(Promise.resolve(new ArrayBuffer(32)));
    http.post('/api/estoque-pecas/1/entrada', { quantidade: 2 }).subscribe();
    await Promise.resolve();
    backend.expectOne('/api/auth/csrf').flush({token:'primeiro'});
    const first=backend.expectOne('/api/estoque-pecas/1/entrada');
    const key=first.request.headers.get('Idempotency-Key'); expect(key).toBeTruthy();
    expect(first.request.headers.get('X-XSRF-TOKEN')).toBe('primeiro');
    first.flush({}, {status:403,statusText:'Forbidden',headers:new HttpHeaders({'X-CliniCar-CSRF':'invalid'})});
    backend.expectOne('/api/auth/csrf').flush({token:'segundo'});
    const retry=backend.expectOne('/api/estoque-pecas/1/entrada');
    expect(retry.request.headers.get('Idempotency-Key')).toBe(key);
    expect(retry.request.headers.get('X-XSRF-TOKEN')).toBe('segundo'); retry.flush({});
  });
  it('não expõe o token a outros destinos nem repete recusas de autorização', () => {
    http.post('https://example.com/api/', {}).subscribe();
    const external=backend.expectOne('https://example.com/api/'); expect(external.request.headers.has('X-XSRF-TOKEN')).toBeFalse(); external.flush({});
    http.delete('/api/peca/2').subscribe({error:() => {}}); backend.expectOne('/api/auth/csrf').flush({token:'teste'});
    backend.expectOne('/api/peca/2').flush({}, {status:403,statusText:'Forbidden'}); backend.expectNone('/api/auth/csrf');
  });
});
