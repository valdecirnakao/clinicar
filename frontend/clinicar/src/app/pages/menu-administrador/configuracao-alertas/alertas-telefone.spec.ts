import { provideZoneChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { AlertasClientesComponent } from './alertas-clientes.component';
import { AlertasColaboradoresComponent } from './alertas-colaboradores.component';

describe('Telefone e badge nas tabelas de alertas', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [AlertasClientesComponent, AlertasColaboradoresComponent],
      providers: [provideZoneChangeDetection(), provideHttpClient(), provideHttpClientTesting(), provideRouter([])] }).compileComponents();
  });
  afterEach(() => TestBed.inject(HttpTestingController).verify());
  it('clientes exibem celular formatado, badge verde e aviso para contatos ausentes ou incompletos', () => {
    const fixture = TestBed.createComponent(AlertasClientesComponent); fixture.detectChanges();
    TestBed.inject(HttpTestingController).expectOne(r => r.url.endsWith('/clientes')).flush({
      content: ['5511987654321', '+55 (11) 98765-4321', '', '123'].map((telefone, i) => ({
        usuarioId: i + 1, nome: 'Cliente', email: 'cliente@example.test', telefone,
        statusUsuario: 'ATIVO', configurada: false, configuracao: { ativo: false, horaInicio: 9, horaFim: 18 }
      })), totalElements: 4, totalPages: 1, number: 0
    }); fixture.detectChanges();
    const contatos: NodeListOf<HTMLElement> = fixture.nativeElement.querySelectorAll('tbody app-telefone-whatsapp');
    for (const indice of [0, 1]) {
      expect(contatos[indice].querySelector('.telefone')!.textContent).toContain('+55 (11) 98765-4321');
      expect(contatos[indice].querySelector('.badge')!.classList.contains('text-success')).toBeTrue();
      expect(contatos[indice].querySelector('.bi-whatsapp')).not.toBeNull();
    }
    expect(contatos[2].textContent).toContain('Não informado');
    for (const indice of [2, 3]) {
      expect(contatos[indice].querySelector('.badge')!.textContent).toContain('Verificar telefone');
      expect(contatos[indice].querySelector('.badge')!.classList.contains('text-warning')).toBeTrue();
    }
    expect(fixture.nativeElement.querySelector('thead').textContent).toContain('Telefone | WhatsApp');
    fixture.destroy();
  });
  it('colaboradores usam a mesma apresentação e atualizam o aviso ao trocar o telefone do responsável', () => {
    const fixture = TestBed.createComponent(AlertasColaboradoresComponent); fixture.detectChanges();
    TestBed.inject(HttpTestingController).expectOne('/api/configuracao-alerta-estoque').flush({
      whatsappHabilitado: true, configuracao: { ativo: true, idResponsavel: 3, nomeResponsavel: 'Responsável',
        telefoneAdministrador: '1134567890', reenviarAlertaAposHoras: 24 }
    }); fixture.detectChanges();
    const contato: HTMLElement = fixture.nativeElement.querySelector('tbody app-telefone-whatsapp');
    expect(contato.querySelector('.telefone')!.textContent).toContain('+55 (11) 3456-7890');
    expect(contato.querySelector('.badge')!.textContent).toContain('WhatsApp');
    expect(contato.querySelector('.badge')!.classList.contains('text-success')).toBeTrue();
    fixture.componentInstance.consulta!.configuracao.telefoneAdministrador = '';
    fixture.detectChanges();
    expect(contato.textContent).toContain('Não informado');
    expect(contato.querySelector('.badge')!.classList.contains('text-warning')).toBeTrue();
    fixture.destroy();
  });
});
