import { provideZoneChangeDetection } from '@angular/core';
import { Component } from '@angular/core';
import { TestBed, fakeAsync, tick, flushMicrotasks } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ValidarDuplicidadeDirective, EstadoDuplicidade } from './validar-duplicidade.directive';

@Component({
    imports: [ValidarDuplicidadeDirective], template: `<div class="modal" [appValidarDuplicidade]="{ tipo: 'peca', model: model, id: id, campos: campos }" (duplicidadeChange)="estado = $event.estado"><input id="nome"><input id="fabricante"><input id="unidade"><input id="tipo"><input id="modelo"><input id="origemOleo"><input id="viscosidadeSae"><input id="classificacaoApi"></div>`
})
class HostPeca {
  model = { nome: 'Óleo', fabricante: 'Marca', unidade: 'Litro', tipo: 'Óleo de motor', modelo: 'Linha', origemOleo: 'SINTETICO', viscosidadeSae: '5W30', classificacaoApi: 'SP' };
  id = 7;
  campos = Object.fromEntries(['nome','fabricante','unidade','tipo','modelo','origemOleo','viscosidadeSae','classificacaoApi'].map(campo => [campo, '#' + campo]));
  estado: EstadoDuplicidade = { duplicado: false, consultando: false, mensagem: '' };
}

@Component({
    imports: [ValidarDuplicidadeDirective], template: `<div class="modal" [appValidarDuplicidade]="{ tipo: 'servico', model: model, id: id, campos: { nome: '#nome', categoria: '#categoria' } }" (duplicidadeChange)="estado = $event.estado"><input id="nome"><select id="categoria"></select><button [disabled]="!!estado.mensagem">Salvar</button></div>`
})
class Host {
  model = { nome: 'Servico de teste', categoria: 'Motor' }; id: number | null = null;
  estado: EstadoDuplicidade = { duplicado: false, consultando: false, mensagem: '' };
}
describe('Validação de duplicidade no ciclo real de abertura de modais', () => {
  let http: HttpTestingController;
  beforeEach(() => { TestBed.configureTestingModule({ imports: [Host, HostPeca], providers: [provideZoneChangeDetection(), provideHttpClient(), provideHttpClientTesting()] }); http = TestBed.inject(HttpTestingController); });
  afterEach(() => http.verify());
  it('consulta e destaca os sete atributos da peça sem usar API como identidade', fakeAsync(() => {
    const f = TestBed.createComponent(HostPeca); f.detectChanges();
    f.nativeElement.querySelector('.modal').dispatchEvent(new Event('show.bs.modal'));
    f.detectChanges(); flushMicrotasks(); tick(350);
    const req = http.expectOne(r => r.url === '/api/cadastros/duplicidade/peca');
    expect(req.request.params.keys().sort()).toEqual(['nome','fabricante','unidade','tipo','modelo','origemOleo','viscosidadeSae','idIgnorado'].sort());
    expect(req.request.params.get('idIgnorado')).toBe('7');
    req.flush({ duplicado: true, id: 9, mensagem: 'Já existe uma peça com esta identificação.' });
    flushMicrotasks(); f.detectChanges();
    for (const campo of ['nome','fabricante','unidade','tipo','modelo','origemOleo','viscosidadeSae'])
      expect(f.nativeElement.querySelector('#' + campo).classList.contains('is-invalid')).withContext(campo).toBeTrue();
    expect(f.nativeElement.querySelector('#classificacaoApi').classList.contains('is-invalid')).toBeFalse();
    f.componentInstance.model.classificacaoApi = 'SN'; f.detectChanges(); tick(350);
    http.expectNone(r => r.url === '/api/cadastros/duplicidade/peca');
    expect(f.componentInstance.estado.duplicado).toBeTrue();
    f.componentInstance.model.viscosidadeSae = '10W40'; f.detectChanges(); flushMicrotasks(); tick(350);
    http.expectOne(r => r.params.get('viscosidadeSae') === '10W40').flush({ duplicado: false, mensagem: '' });
    flushMicrotasks(); f.detectChanges(); expect(f.componentInstance.estado.duplicado).toBeFalse(); f.destroy();
  }));
  it('consulta o servidor, destaca os campos e libera após corrigir a categoria', fakeAsync(() => {
    const fixture = TestBed.createComponent(Host); fixture.detectChanges();
    fixture.nativeElement.querySelector('.modal').dispatchEvent(new Event('show.bs.modal'));
    fixture.detectChanges(); flushMicrotasks(); tick(350);
    const req = http.expectOne(r => r.url === '/api/cadastros/duplicidade/servico');
    expect(req.request.params.get('nome')).toBe('Servico de teste');
    req.flush({ duplicado: true, id: 7, mensagem: 'Já existe um serviço nesta categoria.' });
    flushMicrotasks(); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('#nome').classList.contains('is-invalid')).toBeTrue();
    expect(fixture.nativeElement.querySelector('#categoria').getAttribute('aria-invalid')).toBe('true');
    expect(fixture.nativeElement.querySelector('button').disabled).toBeTrue();
    fixture.componentInstance.model.categoria = 'Freios'; fixture.detectChanges(); flushMicrotasks(); tick(350);
    http.expectOne(r => r.params.get('categoria') === 'Freios').flush({ duplicado: false, id: null, mensagem: '' });
    flushMicrotasks(); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('#nome').classList.contains('is-invalid')).toBeFalse();
    expect(fixture.nativeElement.querySelector('button').disabled).toBeFalse();
    expect(fixture.nativeElement.textContent).not.toContain('Verificando');
    fixture.destroy();
  }));
  it('ignora o próprio id, bloqueia em falha e cancela respostas de um modal fechado', fakeAsync(() => {
    const fixture = TestBed.createComponent(Host); fixture.componentInstance.id = 7; fixture.detectChanges();
    const modal = fixture.nativeElement.querySelector('.modal'); modal.dispatchEvent(new Event('show.bs.modal'));
    fixture.detectChanges(); flushMicrotasks(); tick(350);
    http.expectOne(r => r.params.get('idIgnorado') === '7').flush({}, { status: 503, statusText: 'Indisponível' });
    flushMicrotasks(); fixture.detectChanges(); expect(fixture.nativeElement.querySelector('button').disabled).toBeTrue();
    fixture.componentInstance.model.nome = 'Outro'; fixture.detectChanges(); flushMicrotasks(); tick(350);
    const req = http.expectOne(r => r.params.get('nome') === 'Outro');
    modal.dispatchEvent(new Event('hidden.bs.modal')); flushMicrotasks(); fixture.detectChanges();
    expect(req.cancelled).toBeTrue(); expect(fixture.componentInstance.estado.mensagem).toBe(''); fixture.destroy();
  }));
  it('destaca a identificação quando o servidor rejeita uma duplicidade surgida após a consulta', async () => {
    const fixture = TestBed.createComponent(Host); fixture.detectChanges();
    const modal = fixture.nativeElement.querySelector('.modal'); modal.dispatchEvent(new Event('show.bs.modal')); fixture.detectChanges();
    await new Promise(resolve => setTimeout(resolve, 400));
    http.expectOne(r => r.url === '/api/cadastros/duplicidade/servico').flush({ duplicado: false, mensagem: '', id: null });
    fixture.detectChanges();
    const alerta = document.createElement('div'); alerta.className = 'alert-danger'; alerta.textContent = 'Já existe um serviço cadastrado com este nome nesta categoria.'; modal.appendChild(alerta);
    await new Promise(resolve => setTimeout(resolve, 0)); fixture.detectChanges();
    expect(fixture.componentInstance.estado.duplicado).toBeTrue();
    expect(fixture.nativeElement.querySelector('#nome').classList.contains('is-invalid')).toBeTrue();
    expect(fixture.nativeElement.querySelector('button').disabled).toBeTrue(); fixture.destroy();
  });

});
