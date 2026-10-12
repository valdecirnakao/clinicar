import { provideZoneChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { AuditoriaComponent, EventoAuditoria } from './auditoria.component';

describe('AuditoriaComponent',()=>{
  let c:AuditoriaComponent;let http:HttpTestingController;
  const evento:EventoAuditoria={origem:'ESTOQUE',id:4,dataHora:'2026-10-11T16:00:00',componente:'ESTOQUE',operacao:'ENTRADA',
    responsavelId:7,responsavelNome:'Administrador',registroId:3,registroNome:'Óleo de motor',resultado:'SUCESSO',justificativa:'Compra',detalhes:{saldo_anterior:'10',saldo_posterior:'15'}};
  beforeEach(()=>{TestBed.configureTestingModule({imports:[AuditoriaComponent],providers:[provideZoneChangeDetection(), provideHttpClient(),provideHttpClientTesting(),provideRouter([])]});
    c=TestBed.createComponent(AuditoriaComponent).componentInstance;http=TestBed.inject(HttpTestingController);});
  afterEach(()=>{http.verify();c.ngOnDestroy();});
  it('envia filtros ao servidor e recebe paginação',()=>{
    c.componente='ESTOQUE';c.responsavelId=7;c.registroId=3;c.carregar();
    const r=http.expectOne(req=>req.url==='/api/auditoria');expect(r.request.withCredentials).toBeTrue();expect(r.request.params.get('responsavelId')).toBe('7');
    r.flush({content:[evento],totalElements:23,totalPages:3,number:0});expect(c.eventos.length).toBe(1);expect(c.paginas).toEqual([0,1,2]);expect(c.ultimo).toBe(10);
  });
  it('não consulta com período invertido',()=>{c.inicio='2026-10-12';c.fim='2026-10-11';c.carregar();http.expectNone(req=>req.url==='/api/auditoria');expect(c.erro).toContain('período');});
  it('consulta detalhes pelo identificador da fonte',()=>{c.abrir(evento);const r=http.expectOne('/api/auditoria/ESTOQUE/4');expect(r.request.method).toBe('GET');r.flush(evento);expect(c.selecionado?.detalhes['saldo_posterior']).toBe('15');});
  it('apresenta erro de permissão sem manter registros anteriores',()=>{c.eventos=[evento];c.carregar();http.expectOne(req=>req.url==='/api/auditoria').flush({mensagem:'Acesso exclusivo do administrador.'},{status:403,statusText:'Forbidden'});expect(c.eventos).toEqual([]);expect(c.erro).toContain('administrador');});
  it('redefine a página ao aplicar filtros',()=>{c.pagina=2;c.filtrar();const r=http.expectOne(req=>req.url==='/api/auditoria');expect(r.request.params.get('pagina')).toBe('0');r.flush({content:[],totalElements:0,totalPages:0,number:0});expect(c.primeiro).toBe(0);});
  it('renderiza a tabela e os controles de consulta sem ações de alteração',()=>{
    const fixture=TestBed.createComponent(AuditoriaComponent);fixture.detectChanges();
    http.expectOne(req=>req.url==='/api/auditoria').flush({content:[evento],totalElements:1,totalPages:1,number:0});fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Óleo de motor');expect(fixture.nativeElement.querySelectorAll('tbody button').length).toBe(1);
    expect(fixture.nativeElement.querySelector('tbody button').getAttribute('title')).toBe('Visualizar detalhes');fixture.destroy();
  });
});
