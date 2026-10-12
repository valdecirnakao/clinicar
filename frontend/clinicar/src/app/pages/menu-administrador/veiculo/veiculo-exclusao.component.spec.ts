import { provideZoneChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { VeiculoComponent } from './veiculo.component';
import { NotificacaoService } from '../../../shared/feedback/notificacao.service';

describe('Exclusão de veículo com notificação', () => {
  let fixture: ComponentFixture<VeiculoComponent>, component: VeiculoComponent, http: HttpTestingController;
  const veiculo = { id:42, placa:'ABC1234', fabricante:'Toyota', modelo:'Corolla', cor:'Preto', anoModeloCombustivel:'2026 Flex', idProprietario:1 };
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports:[VeiculoComponent], providers:[provideZoneChangeDetection(), provideHttpClient(),provideHttpClientTesting(),provideRouter([])] }).compileComponents();
    fixture=TestBed.createComponent(VeiculoComponent); component=fixture.componentInstance; http=TestBed.inject(HttpTestingController);
    fixture.detectChanges(); http.expectOne(req=>req.url==='/api/veiculo/pagina').flush({content:[veiculo],totalElements:1,totalPages:1,number:0,resumo:{},opcoes:{}});
    http.expectOne('https://fipe.parallelum.com.br/api/v2/cars/brands').flush([]);
    component.veiculoAcao = veiculo;
  });
  afterEach(() => { fixture.destroy(); http.verify(); });
  it('remove o veículo e confirma sucesso quando a Meta aceita a notificação, sem envio duplo', () => {
    component.confirmarExclusao(); const req=http.expectOne('/api/veiculo/42');
    expect(req.request.method).toBe('DELETE'); expect(req.request.withCredentials).toBeTrue();
    component.confirmarExclusao(); http.expectNone('/api/veiculo/42');
    req.flush({ mensagem:'Veículo excluído com sucesso.', notificacaoWhatsapp:'ENVIADA', mensagemNotificacao:'Encaminhada.' });
    expect(component.veiculos.length).toBe(0); expect(component.mensagemSucesso).toContain('excluído com sucesso');
    expect(component.executandoAcao).toBeFalse();
  });
  it('remove o veículo mas mantém aviso de falha parcial sem confirmação enganosa de envio', () => {
    component.confirmarExclusao(); http.expectOne('/api/veiculo/42').flush({ mensagem:'Veículo excluído com sucesso.', notificacaoWhatsapp:'NAO_ENVIADA', mensagemNotificacao:'Não foi possível enviar a notificação por WhatsApp.' });
    expect(component.veiculos.length).toBe(0); expect(component.mensagemSucesso).toBe('');
    const aviso=TestBed.inject(NotificacaoService).mensagens()[0];
    expect(aviso.tipo).toBe('aviso'); expect(aviso.mensagem).toContain('excluído com sucesso'); expect(aviso.mensagem).toContain('Não foi possível enviar');
  });
  it('preserva o registro quando a exclusão é recusada por vínculo', () => {
    component.confirmarExclusao(); http.expectOne('/api/veiculo/42').flush({ mensagem:'O veículo possui vínculos.' }, { status:409, statusText:'Conflict' });
    expect(component.veiculos.length).toBe(1); expect(component.mensagemSucesso).toBe('');
    expect(TestBed.inject(NotificacaoService).mensagens()[0].tipo).toBe('erro'); expect(component.executandoAcao).toBeFalse();
  });
});
