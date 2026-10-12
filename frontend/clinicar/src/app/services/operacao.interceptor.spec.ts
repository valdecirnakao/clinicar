import { TestBed } from '@angular/core/testing';
import { provideZoneChangeDetection } from '@angular/core';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { operacaoInterceptor } from './operacao.interceptor';

describe('Movimentação sem confirmação',()=>{
  let http:HttpClient,backend:HttpTestingController;
  beforeEach(()=>{
    sessionStorage.clear();
    spyOn(crypto.subtle,'digest').and.returnValue(Promise.resolve(new ArrayBuffer(32)));
    TestBed.configureTestingModule({providers:[provideZoneChangeDetection(),provideHttpClient(withInterceptors([operacaoInterceptor])),provideHttpClientTesting()]});
    http=TestBed.inject(HttpClient);backend=TestBed.inject(HttpTestingController);
  });
  afterEach(()=>{backend.verify();sessionStorage.clear();});
  it('reutiliza a chave após perda de conexão e libera uma nova operação após confirmação',async()=>{
    const enviar=()=>http.post('/api/estoque-pecas/1/entrada',{quantidade:5}).subscribe({error:()=>{}});
    enviar();await Promise.resolve();const primeira=backend.expectOne('/api/estoque-pecas/1/entrada');const chave=primeira.request.headers.get('Idempotency-Key');
    primeira.error(new ProgressEvent('error'));
    enviar();await Promise.resolve();const repetida=backend.expectOne('/api/estoque-pecas/1/entrada');expect(repetida.request.headers.get('Idempotency-Key')).toBe(chave);repetida.flush({id:1});
    enviar();await Promise.resolve();const nova=backend.expectOne('/api/estoque-pecas/1/entrada');expect(nova.request.headers.get('Idempotency-Key')).not.toBe(chave);nova.flush({id:1});
  });
});
