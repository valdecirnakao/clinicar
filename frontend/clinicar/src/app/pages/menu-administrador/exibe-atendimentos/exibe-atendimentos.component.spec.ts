import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExibeAtendimentosComponent } from './exibe-atendimentos.component';
import { Atendimento, ExibeAtendimentosService } from './exibe-atendimentos.service';
import { of, throwError } from 'rxjs';

describe('ExibeAtendimentosComponent', () => {
  let component: ExibeAtendimentosComponent;
  let fixture: ComponentFixture<ExibeAtendimentosComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
      imports: [ExibeAtendimentosComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ExibeAtendimentosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('bloqueia conclusão sem KM, com valor fracionado ou abaixo da entrada', () => {
    const concluir = spyOn(TestBed.inject(ExibeAtendimentosService), 'concluir');
    component.atendimentoConclusao = { id: 1, quilometragemEntrada: 100 } as Atendimento;
    for (const km of [null, -1, 99, 100.5]) {
      component.quilometragemSaidaConclusao = km;
      component.confirmarConclusao();
      expect(component.erroConclusao).toBeTruthy();
    }
    expect(concluir).not.toHaveBeenCalled();
  });

  it('envia o KM na confirmação e fecha a janela após sucesso', () => {
    const atendimento = { id: 1, quilometragemEntrada: 0 } as Atendimento;
    const concluir = spyOn(TestBed.inject(ExibeAtendimentosService), 'concluir').and.returnValue(of(atendimento));
    const recarregar = spyOn(component, 'recarregar');
    component.modalConclusao = { hide: jasmine.createSpy('hide') };
    component.atendimentoConclusao = atendimento;
    component.quilometragemSaidaConclusao = 0;
    component.confirmarConclusao();
    expect(concluir).toHaveBeenCalledOnceWith(1, 0);
    expect(component.modalConclusao.hide).toHaveBeenCalled();
    expect(recarregar).toHaveBeenCalled();
    expect(component.concluindo).toBeFalse();
  });

  it('mantém a janela e o KM informado quando a conclusão falha', () => {
    spyOn(TestBed.inject(ExibeAtendimentosService), 'concluir').and.returnValue(throwError(() => ({ error: { mensagem: 'Não foi possível concluir' } })));
    component.modalConclusao = { hide: jasmine.createSpy('hide') };
    component.atendimentoConclusao = { id: 1, quilometragemEntrada: 100 } as Atendimento;
    component.quilometragemSaidaConclusao = 105;
    component.confirmarConclusao();
    expect(component.modalConclusao.hide).not.toHaveBeenCalled();
    expect(component.quilometragemSaidaConclusao).toBe(105);
    expect(component.erroConclusao).toContain('Não foi possível concluir');
    expect(component.concluindo).toBeFalse();
  });
});
