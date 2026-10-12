import { provideZoneChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { ConfiguracaoAlertasComponent } from './configuracao-alertas.component';

describe('Alertas de manutenção por usuário', () => {
  let component: ConfiguracaoAlertasComponent;
  let http: HttpTestingController;
  const configuracao = (id: number) => ({id, versao: 0, ativo: false, antecedenciaDias: 15,
    intervaloDias: 7, maximoEnvios: 3, diasAposVencimento: 30, horaInicio: 9, horaFim: 18, fusoHorario: 'America/Sao_Paulo'});
  beforeEach(() => {
    TestBed.configureTestingModule({providers: [provideZoneChangeDetection(), provideHttpClient(), provideHttpClientTesting()]});
    component = new ConfiguracaoAlertasComponent(TestBed.inject(HttpClient));
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  it('exige seleção antes de carregar ou salvar', () => {
    component.ngOnInit(); http.expectOne('/api/usuario').flush([]);
    component.carregar(); component.salvar();
    http.expectNone(r => r.url.includes('configuracao-alerta-manutencao'));
  });
  it('salva e consulta histórico somente do usuário escolhido', () => {
    component.usuarioId = 2; component.carregar();
    http.expectOne('/api/configuracao-alerta-manutencao?usuarioId=2').flush(configuracao(2));
    http.expectOne('/api/configuracao-alerta-manutencao/historico?usuarioId=2').flush([]);
    component.salvar();
    const salvar = http.expectOne('/api/configuracao-alerta-manutencao?usuarioId=2');
    expect(salvar.request.method).toBe('PUT'); salvar.flush(configuracao(2));
    expect(component.sucesso).toContain('salva');
  });
  it('ignora resposta atrasada de outro usuário', () => {
    component.usuarioId = 2; component.carregar();
    const antiga = http.expectOne('/api/configuracao-alerta-manutencao?usuarioId=2');
    component.usuarioId = 3; component.carregar();
    http.expectOne('/api/configuracao-alerta-manutencao?usuarioId=3').flush(configuracao(3));
    http.expectOne('/api/configuracao-alerta-manutencao/historico?usuarioId=3').flush([]);
    antiga.flush(configuracao(2));
    expect(component.config!.id).toBe(3);
    http.expectNone('/api/configuracao-alerta-manutencao/historico?usuarioId=2');
  });
});
