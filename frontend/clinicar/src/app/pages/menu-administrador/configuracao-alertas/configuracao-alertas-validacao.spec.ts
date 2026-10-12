import { provideZoneChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ConfiguracaoAlertasComponent } from './configuracao-alertas.component';

describe('Progresso e campos obrigatórios dos alertas', () => {
  let fixture: ComponentFixture<ConfiguracaoAlertasComponent>, component: ConfiguracaoAlertasComponent, http: HttpTestingController;
  const config = { id: 77, versao: 0, ativo: false, antecedenciaDias: 15, intervaloDias: 7, maximoEnvios: 3,
    diasAposVencimento: 30, horaInicio: 9, horaFim: 18, fusoHorario: 'America/Sao_Paulo' };
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [ConfiguracaoAlertasComponent], providers: [provideZoneChangeDetection(), provideHttpClient(), provideHttpClientTesting()] }).compileComponents();
    fixture = TestBed.createComponent(ConfiguracaoAlertasComponent); component = fixture.componentInstance;
    component.usuarioSelecionado = 77; http = TestBed.inject(HttpTestingController); fixture.detectChanges();
    http.expectOne(r => r.url === '/api/configuracao-alerta-manutencao').flush({ ...config });
    http.expectOne(r => r.url.endsWith('/historico')).flush([]); fixture.detectChanges();
    await fixture.whenStable(); fixture.detectChanges();
  });
  afterEach(() => { fixture.destroy(); http.verify(); });
  it('exibe progresso completo com valores válidos e destaca imediatamente os campos vazios', async () => {
    expect(fixture.nativeElement.querySelector('[role="progressbar"]').getAttribute('aria-valuenow')).toBe('100');
    for (const campo of component.camposObrigatorios) (component.config as any)[campo] = campo === 'fusoHorario' ? '' : null;
    fixture.detectChanges(); await fixture.whenStable(); fixture.detectChanges();
    expect(component.progresso).toBe(0);
    expect(fixture.nativeElement.querySelectorAll('.is-invalid').length).toBe(7);
    expect(fixture.nativeElement.querySelector('#erro-antecedencia').textContent).toContain('obrigatório');
    expect(fixture.nativeElement.querySelector('button[type="submit"]').disabled).toBeTrue();
    component.salvar(); http.expectNone(r => r.method === 'PUT');
  });
  it('atualiza o progresso ao limpar e corrigir um campo pela interface', async () => {
    const input: HTMLInputElement = fixture.nativeElement.querySelector('#intervalo');
    input.value = ''; input.dispatchEvent(new Event('input')); fixture.detectChanges(); await fixture.whenStable(); fixture.detectChanges();
    expect(component.camposPreenchidos).toBe(6); expect(input.classList.contains('is-invalid')).toBeTrue();
    input.value = '7'; input.dispatchEvent(new Event('input')); fixture.detectChanges(); await fixture.whenStable(); fixture.detectChanges();
    expect(component.progresso).toBe(100); expect(input.classList.contains('is-invalid')).toBeFalse();
    expect(fixture.nativeElement.querySelector('button[type="submit"]').disabled).toBeFalse();
  });
  it('aceita zero nos campos permitidos e bloqueia valores fracionários ou fora dos limites', () => {
    Object.assign(component.config!, { antecedenciaDias: 0, diasAposVencimento: 0, horaInicio: 0, horaFim: 24 });
    expect(component.configuracaoValida).toBeTrue();
    for (const valor of [0, 1.5, 366]) {
      component.config!.intervaloDias = valor; expect(component.campoInvalido('intervaloDias')).toBeTrue();
      component.salvar(); http.expectNone(r => r.method === 'PUT');
    }
  });
  it('explica horários incompatíveis e recupera o progresso após corrigir', () => {
    component.config!.horaFim = 9; fixture.detectChanges();
    expect(component.progresso).toBe(86); expect(fixture.nativeElement.querySelector('#fim').classList.contains('is-invalid')).toBeTrue();
    expect(fixture.nativeElement.querySelector('#erro-fim').textContent).toContain('posterior');
    component.salvar(); http.expectNone(r => r.method === 'PUT');
    component.config!.horaFim = 18; expect(component.configuracaoValida).toBeTrue();
  });
  it('não envia configuração com fuso inexistente e preserva o modo de visualização', () => {
    component.config!.fusoHorario = 'Fuso/Inexistente'; expect(component.campoInvalido('fusoHorario')).toBeTrue();
    component.salvar(); http.expectNone(r => r.method === 'PUT');
    component.modoLeitura = true; fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="progressbar"]')).toBeNull();
    expect(fixture.nativeElement.querySelectorAll('.is-invalid').length).toBe(0);
  });
});
