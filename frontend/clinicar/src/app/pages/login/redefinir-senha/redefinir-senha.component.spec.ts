import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RedefinirSenhaComponent } from './redefinir-senha.component';
import { AuthService } from '../../../services/auth.service.ts.service';
import { throwError } from 'rxjs';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { HttpTestingController } from '@angular/common/http/testing';

describe('RedefinirSenhaComponent', () => {
  let component: RedefinirSenhaComponent;
  let fixture: ComponentFixture<RedefinirSenhaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
      imports: [RedefinirSenhaComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RedefinirSenhaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    component.linkIndisponivel = false;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('traduz erro JSON em texto com a data real de uso e bloqueia nova tentativa', () => {
    component.token = 'token-teste'; component.novaSenha = 'SenhaTeste1!'; component.confirmarSenha = component.novaSenha;
    const enviar = spyOn(TestBed.inject(AuthService), 'redefinirSenha').and.returnValue(throwError(() => ({ status: 400, error: JSON.stringify({ mensagem: 'Token já utilizado.', dataHoraUtilizacao: '2026-10-01T17:45:28.535358', codigo: 'TOKEN_JA_UTILIZADO' }) })));
    component.redefinirSenha(); fixture.detectChanges();
    expect(component.mensagemErro).toBe('Token já utilizado em 01/10/2026 às 17:45:28.');
    expect(fixture.nativeElement.querySelector('#novaSenha').disabled).toBeTrue();
    expect(fixture.nativeElement.querySelector('#confirmarSenha').disabled).toBeTrue();
    expect(fixture.nativeElement.querySelector('button[type="submit"]').disabled).toBeTrue();
    component.redefinirSenha(); expect(enviar).toHaveBeenCalledTimes(1);
  });

  it('não apresenta horário de erro como data de uso de um token antigo', () => {
    component.token = 'token-teste'; component.novaSenha = 'SenhaTeste1!'; component.confirmarSenha = component.novaSenha;
    spyOn(TestBed.inject(AuthService), 'redefinirSenha').and.returnValue(throwError(() => ({ status: 400, error: { mensagem: 'Token já utilizado.', dataHora: '2026-10-01T18:00:00' } })));
    component.redefinirSenha(); expect(component.mensagemErro).toBe('Token já utilizado.');
  });

  it('verifica o link ao abrir a página e desabilita o formulário de um link usado', () => {
    const route = TestBed.inject(ActivatedRoute);
    spyOnProperty(route.snapshot, 'queryParamMap', 'get').and.returnValue(convertToParamMap({ token: 'token-teste' }));
    component.ngOnInit(); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('#novaSenha').disabled).toBeTrue();
    const http = TestBed.inject(HttpTestingController);
    const req = http.expectOne('/api/auth/redefinir-senha/validar?token=token-teste');
    req.flush(JSON.stringify({ mensagem: 'Token já utilizado.', dataHoraUtilizacao: '2026-10-01T17:45:28' }), { status: 400, statusText: 'Bad Request' });
    fixture.detectChanges();
    expect(component.verificandoLink).toBeFalse(); expect(component.linkIndisponivel).toBeTrue();
    expect(component.mensagemErro).toBe('Token já utilizado em 01/10/2026 às 17:45:28.');
    expect(fixture.nativeElement.querySelector('button[type="submit"]').disabled).toBeTrue();
    http.verify();
  });

  it('atualiza os cinco requisitos e a confirmação durante a digitação', async () => {
    component.token = 'token-teste'; fixture.detectChanges(); await fixture.whenStable();
    const input = fixture.nativeElement.querySelector('#novaSenha') as HTMLInputElement;
    input.value = 'Senha'; input.dispatchEvent(new Event('input')); fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.requisito.atendido').length).toBe(2);
    input.value = 'SenhaTeste1!'; input.dispatchEvent(new Event('input')); fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.requisito.atendido').length).toBe(5);
    expect(fixture.nativeElement.querySelector('[role="progressbar"]').getAttribute('aria-valuenow')).toBe('100');
    component.confirmarSenha = 'diferente'; fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('#confirmacao-status').textContent).toContain('ainda não coincidem');
    component.confirmarSenha = component.novaSenha; fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('#confirmacao-status').textContent).toContain('As senhas coincidem');
    input.value = ''; input.dispatchEvent(new Event('input')); fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.requisito.atendido').length).toBe(0);
  });

  it('bloqueia envio sem todos os requisitos e ignora espaços como caractere especial', () => {
    const enviar = spyOn(TestBed.inject(AuthService), 'redefinirSenha'); component.token = 'token-teste';
    for (const senha of ['abcdefgh1!', 'ABCDEFGH1!', 'Abcdefgh!', 'Abcdefgh1', 'Abcdefg1 ', 'Ab1!']) {
      component.novaSenha = senha; component.confirmarSenha = senha; component.redefinirSenha();
      expect(component.mensagemErro).toContain('todos os requisitos');
    }
    expect(enviar).not.toHaveBeenCalled();
  });
});
