import { provideZoneChangeDetection } from '@angular/core';
import { Component } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { FeedbackDirective, TipoFeedback } from './feedback.directive';
import { NotificacaoService } from './notificacao.service';
import { NotificacoesComponent } from './notificacoes.component';

@Component({
    imports: [FeedbackDirective], template: `
  <div [appFeedback]="mensagem" [tipoFeedback]="tipo" (feedbackFechado)="fechamentos = fechamentos + 1">{{ mensagem }}</div>`
})
class PaginaTeste { mensagem = 'Operação concluída.'; tipo: TipoFeedback = 'sucesso'; fechamentos = 0; }

describe('Feedback de operações', () => {
  let fixture: ComponentFixture<PaginaTeste>;
  let el: HTMLElement;
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [PaginaTeste, NotificacoesComponent], providers: [provideZoneChangeDetection(), provideRouter([])] });
    fixture = TestBed.createComponent(PaginaTeste); fixture.detectChanges();
    el = fixture.nativeElement.querySelector('div');
  });
  afterEach(() => fixture.destroy());

  it('fecha sucesso aos cinco segundos, sem encerrar antes, e anuncia sem roubar o foco', fakeAsync(() => {
    fixture.destroy(); fixture = TestBed.createComponent(PaginaTeste); fixture.detectChanges(); el = fixture.nativeElement.querySelector('div');
    expect(el.getAttribute('role')).toBe('status'); expect(el.getAttribute('aria-live')).toBe('polite');
    tick(4999); expect(el.style.display).not.toBe('none');
    tick(1); expect(el.style.display).toBe('none'); expect(fixture.componentInstance.fechamentos).toBe(1);
  }));
  it('fecha manualmente e cancela o timer sem emitir um segundo fechamento', fakeAsync(() => {
    fixture.destroy(); fixture = TestBed.createComponent(PaginaTeste); fixture.detectChanges(); el = fixture.nativeElement.querySelector('div');
    const botao = el.querySelector('button')!;
    expect(botao.getAttribute('aria-label')).toBe('Fechar mensagem'); expect(botao.type).toBe('button');
    botao.click(); tick(6000); expect(fixture.componentInstance.fechamentos).toBe(1);
  }));
  it('reinicia o prazo para uma mensagem nova e não fecha com o timer anterior', fakeAsync(() => {
    fixture.destroy(); fixture = TestBed.createComponent(PaginaTeste); fixture.detectChanges(); el = fixture.nativeElement.querySelector('div');
    tick(4000); fixture.componentInstance.mensagem = 'Outra operação concluída.'; fixture.detectChanges();
    tick(1000); expect(el.style.display).not.toBe('none');
    tick(4000); expect(fixture.componentInstance.fechamentos).toBe(1);
  }));
  it('mantém erros e avisos até o fechamento explícito', fakeAsync(() => {
    fixture.componentInstance.tipo = 'erro'; fixture.detectChanges();
    tick(30000); expect(el.style.display).not.toBe('none'); expect(el.getAttribute('role')).toBe('alert');
    fixture.componentInstance.tipo = 'aviso'; fixture.detectChanges();
    tick(30000); expect(fixture.componentInstance.fechamentos).toBe(0);
    el.querySelector('button')!.click(); expect(fixture.componentInstance.fechamentos).toBe(1);
  }));
  it('pausa durante leitura com mouse ou foco e retoma o tempo restante', fakeAsync(() => {
    fixture.destroy(); fixture = TestBed.createComponent(PaginaTeste); fixture.detectChanges(); el = fixture.nativeElement.querySelector('div');
    tick(2000); el.dispatchEvent(new MouseEvent('mouseenter'));
    el.dispatchEvent(new FocusEvent('focusin')); tick(10000);
    el.dispatchEvent(new MouseEvent('mouseleave')); tick(10000);
    expect(fixture.componentInstance.fechamentos).toBe(0);
    el.dispatchEvent(new FocusEvent('focusout', { relatedTarget: document.body }));
    tick(2999); expect(fixture.componentInstance.fechamentos).toBe(0);
    tick(1); expect(fixture.componentInstance.fechamentos).toBe(1);
  }));
  it('cancela o timer ao sair da página', fakeAsync(() => {
    fixture.destroy(); fixture = TestBed.createComponent(PaginaTeste); fixture.detectChanges();
    const pagina = fixture.componentInstance; fixture.destroy(); tick(6000);
    expect(pagina.fechamentos).toBe(0);
  }));
  it('não altera estado de conclusão quando o aviso é fechado', () => {
    el.querySelector('button')!.click(); expect(fixture.componentInstance.mensagem).toBe('Operação concluída.');
  });
  it('controla sucessos independentes e preserva falhas parciais sem prazo', fakeAsync(() => {
    const service = TestBed.inject(NotificacaoService);
    const host = TestBed.createComponent(NotificacoesComponent);
    service.sucesso('Salvo.'); service.aviso('Entrega concluída, mas a OS não foi enviada.'); host.detectChanges();
    tick(3000); service.sucesso('Atualizado.'); host.detectChanges();
    tick(2000); host.detectChanges(); expect(service.mensagens().map(n => n.mensagem)).toEqual(['Entrega concluída, mas a OS não foi enviada.', 'Atualizado.']);
    tick(3000); host.detectChanges(); expect(service.mensagens().length).toBe(1);
    host.nativeElement.querySelector('button').click(); host.detectChanges(); expect(service.mensagens().length).toBe(0);
    host.destroy();
  }));
  it('limpa notificações globais ao navegar, sem reaparecer na próxima tela', fakeAsync(() => {
    const service = TestBed.inject(NotificacaoService); service.erro('Falha na tela anterior.');
    TestBed.inject(Router).navigateByUrl('/'); tick(); expect(service.mensagens().length).toBe(0);
  }));
});
