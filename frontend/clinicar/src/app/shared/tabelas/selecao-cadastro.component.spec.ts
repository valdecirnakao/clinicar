import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideZoneChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { SelecaoCadastroComponent } from './selecao-cadastro.component';

describe('Seleção paginada de cadastros',()=>{
  it('consulta somente ao abrir, limita a página e reinicia a paginação ao buscar',fakeAsync(()=>{
    TestBed.configureTestingModule({imports:[SelecaoCadastroComponent],providers:[provideZoneChangeDetection(),provideHttpClient(),provideHttpClientTesting()]});
    const backend=TestBed.inject(HttpTestingController),fixture=TestBed.createComponent(SelecaoCadastroComponent);
    const modal=document.createElement('div');modal.className='modal';document.body.appendChild(modal);modal.appendChild(fixture.nativeElement);
    fixture.componentRef.setInput('recurso','fornecedor');fixture.componentRef.setInput('filtros',{ativo:true});fixture.detectChanges();
    backend.expectNone(req=>req.url==='/api/fornecedor/pagina');
    modal.dispatchEvent(new Event('shown.bs.modal'));
    const inicial=backend.expectOne(req=>req.url==='/api/fornecedor/pagina');
    expect(inicial.request.params.get('tamanho')).toBe('5');expect(inicial.request.params.get('ativo')).toBe('true');
    inicial.flush({content:[{id:1,razaoSocial:'Fornecedor'}],totalElements:25,totalPages:5,number:0});
    fixture.componentInstance.pagina=3;fixture.componentInstance.carregar();
    backend.expectOne(req=>req.params.get('pagina')==='3').flush({content:[],totalElements:25,totalPages:5,number:3});
    fixture.componentInstance.busca='óleo';fixture.componentInstance.alterarBusca();tick(250);
    const busca=backend.expectOne(req=>req.params.get('busca')==='óleo');expect(busca.request.params.get('pagina')).toBe('0');
    busca.flush({content:[],totalElements:0,totalPages:0,number:0});
    backend.verify();fixture.destroy();modal.remove();
  }));
});
