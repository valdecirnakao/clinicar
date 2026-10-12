import { TestBed } from '@angular/core/testing';
import { provideZoneChangeDetection } from '@angular/core';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { VersoesCadastroService, versaoCadastroInterceptor } from './versao-cadastro.interceptor';

describe('Revisão do cadastro em edição',()=>{
  let http:HttpClient,backend:HttpTestingController,modal:HTMLDivElement;
  beforeEach(()=>{
    TestBed.configureTestingModule({providers:[provideZoneChangeDetection(),provideHttpClient(withInterceptors([versaoCadastroInterceptor])),provideHttpClientTesting()]});
    http=TestBed.inject(HttpClient);backend=TestBed.inject(HttpTestingController);TestBed.inject(VersoesCadastroService).instalar();
    modal=document.createElement('div');document.body.appendChild(modal);
  });
  afterEach(()=>{backend.verify();modal.remove();});
  it('preserva a revisão do formulário mesmo quando a lista é atualizada em segundo plano',()=>{
    http.get('/api/peca/pagina').subscribe();backend.expectOne('/api/peca/pagina').flush({content:[{id:1,controleVersao:0}]});
    modal.dispatchEvent(new Event('shown.bs.modal',{bubbles:true}));
    http.get('/api/peca/1').subscribe();backend.expectOne('/api/peca/1').flush({id:1,controleVersao:1});
    http.put('/api/peca/1',{nome:'Edição antiga'}).subscribe({error:()=>{}});const req=backend.expectOne('/api/peca/1');expect(req.request.headers.get('If-Match')).toBe('"0"');req.flush({mensagem:'Registro alterado'},{status:409,statusText:'Conflict'});
    modal.dispatchEvent(new Event('hidden.bs.modal',{bubbles:true}));
    http.put('/api/peca/1',{nome:'Nova edição'}).subscribe();const atual=backend.expectOne('/api/peca/1');expect(atual.request.headers.get('If-Match')).toBe('"1"');atual.flush({id:1,controleVersao:2});
  });
});
