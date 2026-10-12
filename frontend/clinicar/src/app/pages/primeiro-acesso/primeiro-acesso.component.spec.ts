import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { PrimeiroAcessoComponent } from './primeiro-acesso.component';

describe('Progresso do primeiro acesso', () => {
  beforeEach(() => TestBed.configureTestingModule({ imports: [PrimeiroAcessoComponent], providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()] }));

  it('atualiza a barra ao preencher e apagar um campo sem exibir erros prematuros', async () => {
    const fixture = TestBed.createComponent(PrimeiroAcessoComponent);
    const component = fixture.componentInstance;
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    http.expectOne('/api/setup/status').flush({ setupDisponivel: true, estado: 'NAO_INICIADO', mensagem: '' });
    fixture.detectChanges();
    await fixture.whenStable();
    const barra = fixture.nativeElement.querySelector('[role="progressbar"]');
    expect(barra.getAttribute('aria-valuenow')).toBe('0');
    const nome = fixture.nativeElement.querySelector('input[id$="nome"]') as HTMLInputElement;
    nome.value = 'Administrador Teste'; nome.dispatchEvent(new Event('input')); fixture.detectChanges();
    expect(barra.getAttribute('aria-valuenow')).toBe('9');
    expect(component.errosCampos).toEqual({});
    nome.value = ''; nome.dispatchEvent(new Event('input')); fixture.detectChanges();
    expect(barra.getAttribute('aria-valuenow')).toBe('0');
    http.verify(); fixture.destroy();
  });

  it('conta apenas obrigatórios válidos e preserva o progresso ao mudar de etapa', () => {
    const fixture = TestBed.createComponent(PrimeiroAcessoComponent);
    const component = fixture.componentInstance;
    component.dados.nomeSocial = 'Opcional'; component.dados.complementoEndereco = 'Opcional';
    component.dados.email = 'invalido'; component.dados.cpf = '123';
    expect(component.progressoPreenchimento).toBe(0);
    Object.assign(component.dados, { nome: 'Administrador Teste', cpf: '11111111111', nascimento: '2001-01-01', email: 'teste@example.com', telefone: '11999999999', cep: '01001000', logradouro: 'Praça da Sé', numeroEndereco: '1', bairro: 'Sé', cidade: 'São Paulo', estado: 'SP' });
    expect(component.totalCamposObrigatorios).toBe(11);
    expect(component.progressoPreenchimento).toBe(100);
    component.etapaAtual = 4; expect(component.progressoPreenchimento).toBe(100);
    component.dados.email = 'invalido'; expect(component.progressoPreenchimento).toBe(91);
    fixture.destroy();
  });
});
