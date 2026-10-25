import { provideZoneChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CadastraClienteComponent } from './cadastra-cliente.component';

describe('CadastraClienteComponent', () => {
  let component: CadastraClienteComponent;
  let fixture: ComponentFixture<CadastraClienteComponent>;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideZoneChangeDetection(), provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
      imports: [CadastraClienteComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CadastraClienteComponent);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  afterEach(() => { http.verify(); sessionStorage.removeItem('clinicar.cadastroCliente'); });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('cadastra somente a conta pública e deixa veículos para a sessão do próprio cliente', () => {
    Object.assign(component.cliente, { nome: 'Cliente Teste', cpf: '52998224725', nascimento: '1990-01-02',
      email: 'cliente@example.com', telefone: '11987654321', cep: '12345678', logradouro: 'Rua A',
      numero_endereco: '10', bairro: 'Centro', cidade: 'São Paulo', estado: 'SP',
      senha: 'Senha@123', confirmarSenha: 'Senha@123' });
    for (let i = 0; i < 4; i++) component.proximo();
    expect(component.etapa).toBe('revisao');
    component.cadastrar();
    const cadastro = http.expectOne('/api/usuario');
    expect(cadastro.request.body.tipo_do_acesso).toBe('cliente');
    expect(cadastro.request.body).not.toEqual(jasmine.objectContaining({ idProprietario: jasmine.anything() }));
    cadastro.flush({ id: 7 });
    expect(component.concluido).toBeTrue();
    expect(sessionStorage.getItem('clinicar.cadastroCliente')).toBe('7:veiculos');
    http.expectNone('/api/veiculo');
  });

  it('preenche o endereço pelo CEP e preserva o complemento informado', () => {
    component.cliente.cep = '01001000';
    component.cliente.complemento_endereco = 'Sala 2';
    component.consultarCep();
    expect(component.cliente.cep).toBe('01001-000');
    expect(component.cepConsultando).toBeTrue();
    http.expectOne('https://viacep.com.br/ws/01001000/json/').flush({
      logradouro: 'Praça da Sé', bairro: 'Sé', localidade: 'São Paulo', uf: 'sp', complemento: 'Outro'
    });
    expect(component.cepConsultando).toBeFalse();
    expect(component.cliente.logradouro).toBe('Praça da Sé');
    expect(component.cliente.bairro).toBe('Sé');
    expect(component.cliente.cidade).toBe('São Paulo');
    expect(component.cliente.estado).toBe('SP');
    expect(component.cliente.complemento_endereco).toBe('Sala 2');
  });

  it('permite preencher manualmente quando o CEP não é encontrado', () => {
    component.cliente.cep = '99999999';
    component.consultarCep();
    http.expectOne('https://viacep.com.br/ws/99999999/json/').flush({ erro: true });
    expect(component.cepErro).toContain('não encontrado');
    expect(component.cepConsultando).toBeFalse();
  });

  it('ignora resposta antiga se o cliente alterar o CEP durante a consulta', () => {
    component.cliente.cep = '01001000';
    component.consultarCep();
    component.cliente.cep = '01310100';
    component.aoAlterarCep();
    http.expectOne('https://viacep.com.br/ws/01001000/json/').flush({
      logradouro: 'Praça da Sé', bairro: 'Sé', localidade: 'São Paulo', uf: 'SP'
    });
    expect(component.cliente.logradouro).toBe('');
  });
});
