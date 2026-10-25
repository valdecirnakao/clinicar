import { provideZoneChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';

import { FornecedorComponent } from './fornecedor.component';

describe('FornecedorComponent', () => {
  let component: FornecedorComponent;
  let fixture: ComponentFixture<FornecedorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideZoneChangeDetection(), provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
      imports: [FornecedorComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FornecedorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('preserva os 11 dígitos do celular na formatação e no payload de cadastro e edição', () => {
    component.novoFornecedor.telefone = '11999999999';
    component.formatarTelefoneCadastro();
    expect(component.novoFornecedor.telefone).toBe('+55 (11) 99999-9999');
    expect((component as any).montarPayloadFornecedor(component.novoFornecedor).telefone).toBe('5511999999999');

    component.edit.telefone = '11999999999';
    component.normalizarTelefoneEdicao();
    expect(component.edit.telefone).toBe('+55 (11) 99999-9999');
    expect((component as any).montarPayloadFornecedor(component.edit).telefone).toBe('5511999999999');
    expect(component.exibirTelefoneFormatado('1133334444')).toBe('+55 (11) 3333-4444');
  });

  for (const tipo of ['cadastro', 'edicao'] as const) {
    it(`valida e-mail automaticamente no ${tipo}, aguardando o domínio completo e a pausa na digitação`, fakeAsync(() => {
      const http = TestBed.inject(HttpTestingController);
      const model = tipo === 'cadastro' ? component.novoFornecedor : component.edit;
      component.editId = 7;
      component.camposInvalidos = ['email'];
      model.email = 'teste@empresa.com';
      component.agendarVerificacaoEmail(tipo);
      expect(component.consultaEmail[tipo].aguardando).toBeTrue();
      expect(component.emailInvalido(model)).toBeTrue();
      expect(component.campoMarcadoInvalido(model, 'email')).toBeFalse();
      tick(300);
      model.email = 'teste@empresa.com.br';
      component.agendarVerificacaoEmail(tipo);
      tick(499);
      http.expectNone(req => req.url === '/api/fornecedor/verificar-email');
      tick(1);
      expect(component.consultaEmail[tipo].consultando).toBeTrue();
      const req = http.expectOne(req => req.url === '/api/fornecedor/verificar-email' && req.params.get('email') === 'teste@empresa.com.br');
      expect(req.request.params.get('idIgnorado')).toBe(tipo === 'edicao' ? '7' : null);
      component.finalizarVerificacaoEmail(tipo);
      http.expectNone(req => req.url === '/api/fornecedor/verificar-email');
      req.flush({ cadastrado: false });
      expect(component.consultaEmail[tipo].verificado).toBeTrue();
      expect(component.emailInvalido(model)).toBeFalse();
      component.finalizarVerificacaoEmail(tipo);
      http.expectNone(req => req.url === '/api/fornecedor/verificar-email');
    }));

    it(`não consulta e-mail incompleto e cancela respostas antigas no ${tipo}`, fakeAsync(() => {
      const http = TestBed.inject(HttpTestingController);
      const model = tipo === 'cadastro' ? component.novoFornecedor : component.edit;
      model.email = 'teste@empresa';
      component.agendarVerificacaoEmail(tipo);
      tick(500);
      http.expectNone(req => req.url === '/api/fornecedor/verificar-email');
      expect(component.consultaEmail[tipo].formatoInvalido).toBeTrue();
      model.email = 'teste@empresa.com';
      component.agendarVerificacaoEmail(tipo);
      tick(500);
      const antiga = http.expectOne(req => req.url === '/api/fornecedor/verificar-email');
      model.email = 'outro@empresa.org';
      component.agendarVerificacaoEmail(tipo);
      expect(antiga.cancelled).toBeTrue();
      expect(component.consultaEmail[tipo].verificado).toBeFalse();
      tick(500);
      http.expectOne(req => req.url === '/api/fornecedor/verificar-email' && req.params.get('email') === 'outro@empresa.org').flush({ cadastrado: true });
      expect(component.campoMarcadoInvalido(model, 'email')).toBeTrue();
      expect(component.mensagemEmail(tipo)).toBe('E-mail já cadastrado anteriormente.');
    }));
  }

  it('verifica imediatamente ao sair do campo sem duplicar a consulta agendada', fakeAsync(() => {
    const http = TestBed.inject(HttpTestingController);
    component.novoFornecedor.email = 'teste@empresa.com';
    component.agendarVerificacaoEmail('cadastro');
    tick(100);
    component.finalizarVerificacaoEmail('cadastro');
    http.expectOne(req => req.url === '/api/fornecedor/verificar-email').flush({ cadastrado: false });
    tick(500);
    http.expectNone(req => req.url === '/api/fornecedor/verificar-email');
    expect(component.consultaEmail.cadastro.verificado).toBeTrue();
  }));

  it('oferece nova tentativa se a consulta automática falhar e cancela temporizadores ao encerrar', fakeAsync(() => {
    const http = TestBed.inject(HttpTestingController);
    component.novoFornecedor.email = 'teste@empresa.com';
    component.agendarVerificacaoEmail('cadastro');
    tick(500);
    http.expectOne(req => req.url === '/api/fornecedor/verificar-email').flush({}, { status: 500, statusText: 'Erro' });
    expect(component.consultaEmail.cadastro.verificado).toBeFalse();
    expect(component.consultaEmail.cadastro.aviso).toContain('Verificar novamente');
    component.verificarEmail('cadastro');
    http.expectOne(req => req.url === '/api/fornecedor/verificar-email').flush({ cadastrado: false });
    component.edit.email = 'outro@empresa.com';
    component.agendarVerificacaoEmail('edicao');
    component.ngOnDestroy();
    tick(500);
    http.expectNone(req => req.url === '/api/fornecedor/verificar-email');
  }));

  it('libera contato depois do CNPJ validado e exige e-mail validado para o endereço', () => {
    const http = TestBed.inject(HttpTestingController);
    component.novoFornecedor = { cnpj: '11111111111111', razaoSocial: 'Teste', nomeFantasia: 'Teste',
      itemFornecido: component.opcoesItemFornecidoFornecedor[0], fundacao: '2000-01-01' };
    expect(component.podeAvancarCadastro).toBeFalse();
    component.verificarCnpj('cadastro');
    http.expectOne(req => req.url === '/api/fornecedor/verificar-cnpj').flush({ cadastrado: false });
    expect(component.podeAvancarCadastro).toBeTrue();
    component.trocarAbaCadastroFornecedor('revisao');
    expect(component.abaCadastroFornecedor).toBe('dados');
    component.proximaAbaCadastro();
    expect(component.abaCadastroFornecedor).toBe('contato');
    Object.assign(component.novoFornecedor, { telefone: '11999999999', email: 'teste@example.com' });
    expect(component.podeAvancarCadastro).toBeFalse();
    component.verificarEmail('cadastro');
    http.expectOne(req => req.url === '/api/fornecedor/verificar-email').flush({ cadastrado: false });
    component.proximaAbaCadastro();
    expect(component.abaCadastroFornecedor).toBe('endereco');
    expect(component.podeAvancarCadastro).toBeFalse();
  });

  it('marca formato inválido de e-mail nos dois modais antes da consulta de duplicidade', () => {
    const http = TestBed.inject(HttpTestingController);
    component.editId = 7;
    for (const email of ['semarroba.com', '@empresa.com', 'nome@', 'nome@empresa', 'nome@@empresa.com', 'nome sobrenome@empresa.com', 'nome@empresa..com']) {
      component.novoFornecedor.email = email;
      component.verificarEmail('cadastro');
      expect(component.campoMarcadoInvalido(component.novoFornecedor, 'email')).withContext(email).toBeTrue();
      component.edit.email = email;
      component.verificarEmail('edicao');
      expect(component.campoMarcadoInvalido(component.edit, 'email')).withContext(email).toBeTrue();
    }
    http.expectNone(req => req.url === '/api/fornecedor/verificar-email');
    component.edit.email = 'nome+teste@empresa.com.br';
    component.alterarEmail('edicao');
    component.verificarEmail('edicao');
    http.expectOne(req => req.url === '/api/fornecedor/verificar-email').flush({ cadastrado: false });
    expect(component.campoMarcadoInvalido(component.edit, 'email')).toBeFalse();
  });

  it('destaca e-mail duplicado e impede o cadastro após a consulta', () => {
    component.novoFornecedor.email = ' Teste@Example.com ';
    component.verificarEmail('cadastro');
    const http = TestBed.inject(HttpTestingController);
    http.expectOne(req => req.url === '/api/fornecedor/verificar-email'
      && req.params.get('email') === 'teste@example.com').flush({ cadastrado: true });
    expect(component.campoMarcadoInvalido(component.novoFornecedor, 'email')).toBeTrue();
    expect(component.mensagemEmail('cadastro')).toBe('E-mail já cadastrado anteriormente.');
    component.salvarNovoFornecedor();
    http.expectNone(req => req.method === 'POST');
  });

  it('permite o próprio e-mail na edição e cancela consultas antigas ao alterar o valor', () => {
    component.editId = 7;
    component.edit.email = 'teste@example.com';
    const http = TestBed.inject(HttpTestingController);
    component.verificarEmail('edicao');
    http.expectOne(req => req.url === '/api/fornecedor/verificar-email'
      && req.params.get('idIgnorado') === '7').flush({ cadastrado: false });
    expect(component.emailInvalido(component.edit)).toBeFalse();
    component.verificarEmail('edicao');
    const consulta = http.expectOne(req => req.url === '/api/fornecedor/verificar-email');
    component.edit.email = 'outro@example.com';
    component.alterarEmail('edicao');
    expect(consulta.cancelled).toBeTrue();
    expect(component.consultaEmail.edicao.consultando).toBeFalse();
    component.verificarEmail('edicao');
    http.expectOne(req => req.url === '/api/fornecedor/verificar-email').flush({ cadastrado: true });
    component.salvarEdicaoModal();
    http.expectNone(req => req.method === 'PUT');
  });

  it('marca CNPJ duplicado e impede o cadastro', () => {
    component.novoFornecedor.cnpj = '11.111.111/1111-11';
    component.verificarCnpj('cadastro');
    TestBed.inject(HttpTestingController).expectOne(req =>
      req.url === '/api/fornecedor/verificar-cnpj' && req.params.get('cnpj') === '11111111111111'
    ).flush({ cadastrado: true });
    expect(component.campoMarcadoInvalido(component.novoFornecedor, 'cnpj')).toBeTrue();
    expect(component.mensagemCnpj('cadastro')).toBe('CNPJ já cadastrado anteriormente.');
    component.salvarNovoFornecedor();
    TestBed.inject(HttpTestingController).expectNone(req => req.method === 'POST');
  });

  it('consulta na edição desconsiderando o próprio fornecedor', () => {
    component.editId = 7;
    component.edit.cnpj = '11.111.111/1111-11';
    component.verificarCnpj('edicao');
    TestBed.inject(HttpTestingController).expectOne(req =>
      req.url === '/api/fornecedor/verificar-cnpj' && req.params.get('idIgnorado') === '7'
    ).flush({ cadastrado: false });
    expect(component.cnpjInvalido(component.edit)).toBeFalse();
  });

  it('cancela consulta ao alterar CNPJ e permite salvar se a consulta falhar', () => {
    component.novoFornecedor.cnpj = '11111111111111';
    component.verificarCnpj('cadastro');
    const http = TestBed.inject(HttpTestingController);
    const anterior = http.expectOne(req => req.url === '/api/fornecedor/verificar-cnpj');
    component.novoFornecedor.cnpj = '22222222222222';
    component.alterarCnpj('cadastro');
    expect(anterior.cancelled).toBeTrue();
    expect(component.consultaCnpj.cadastro.consultando).toBeFalse();
    component.verificarCnpj('cadastro');
    http.expectOne(req => req.url === '/api/fornecedor/verificar-cnpj')
      .flush({}, { status: 500, statusText: 'Erro' });
    expect(component.cnpjInvalido(component.novoFornecedor)).toBeFalse();
    expect(component.consultaCnpj.cadastro.aviso).toContain('antes de avançar');
  });
});
