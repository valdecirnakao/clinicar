import { provideZoneChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UsuarioComponent } from './usuario.component';
import { NotificacaoService } from '../../../shared/feedback/notificacao.service';

describe('UsuarioComponent', () => {
  let component: UsuarioComponent;
  let fixture: ComponentFixture<UsuarioComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideZoneChangeDetection(), provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
      imports: [UsuarioComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UsuarioComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    TestBed.inject(HttpTestingController).expectOne(r=>r.url==='/api/usuario/pagina').flush({content:[],totalElements:0,totalPages:0,number:0,resumo:{},opcoes:{}});
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('libera etapas somente após consultas válidas e bloqueia novamente ao alterar o documento', () => {
    const http = TestBed.inject(HttpTestingController);
    component.novoUsuario = { cpf: '22222222222', nome: 'Teste', nascimento: '2000-01-01' };
    expect(component.podeAvancarCadastro).toBeFalse();
    component.verificarCpfCadastro();
    expect(component.podeAvancarCadastro).toBeFalse();
    http.expectOne(req => req.url === '/api/usuario/validar-cpf').flush({ cadastrado: false });
    expect(component.podeAvancarCadastro).toBeTrue();
    component.trocarAbaCadastroUsuario('seguranca');
    expect(component.abaCadastroUsuario).toBe('dados');
    component.cadastroAbaProxima();
    expect(component.abaCadastroUsuario).toBe('contato');
    Object.assign(component.novoUsuario, { telefone: '11999999999', email: 'teste@example.com', tipo_do_acesso: 'cliente' });
    component.verificarEmailCadastro();
    expect(component.podeAvancarCadastro).toBeFalse();
    http.expectOne(req => req.url === '/api/usuario/validar-email').flush({ cadastrado: true });
    expect(component.podeAvancarCadastro).toBeFalse();
    component.novoUsuario.email = 'novo@example.com';
    component.alterarEmailCadastro();
    component.verificarEmailCadastro();
    http.expectOne(req => req.url === '/api/usuario/validar-email').flush({ cadastrado: false });
    component.cadastroAbaProxima();
    expect(component.abaCadastroUsuario).toBe('endereco');
    expect(component.podeAvancarCadastro).toBeFalse();
    component.trocarAbaCadastroUsuario('dados');
    component.novoUsuario.cpf = '33333333333';
    component.alterarCpfCadastro();
    expect(component.podeAvancarCadastro).toBeFalse();
  });

  it('destaca formato inválido ao sair do e-mail no cadastro e na edição sem consultar duplicidade', () => {
    const http = TestBed.inject(HttpTestingController);
    for (const email of ['semarroba.com', '@empresa.com', 'nome@', 'nome@empresa', 'nome@@empresa.com', 'nome sobrenome@empresa.com', 'nome@empresa..com']) {
      component.novoUsuario.email = email;
      component.verificarEmailCadastro();
      expect(component.campoCadastroInvalido('email')).withContext(email).toBeTrue();
      component.iniciarEdicao({ id: 7, email } as any);
      component.verificarEmailEdicao();
      expect(component.campoEdicaoInvalido('email')).withContext(email).toBeTrue();
    }
    http.expectNone(req => req.url === '/api/usuario/validar-email');
    component.edit.email = 'nome+teste@empresa.com.br';
    component.alterarEmailEdicao();
    component.verificarEmailEdicao();
    http.expectOne(req => req.url === '/api/usuario/validar-email').flush({ cadastrado: false });
    expect(component.campoEdicaoInvalido('email')).toBeFalse();
  });

  it('consulta e-mail na edição e bloqueia duplicidade com mensagem no campo', () => {
    component.iniciarEdicao({ id: 7, email: ' Cliente@Example.com ' } as any);
    component.verificarEmailEdicao();
    const http = TestBed.inject(HttpTestingController);
    http.expectOne(req => req.url === '/api/usuario/validar-email'
      && req.params.get('email') === 'cliente@example.com' && req.params.get('idIgnorado') === '7')
      .flush({ cadastrado: true });
    expect(component.campoEdicaoInvalido('email')).toBeTrue();
    expect(component.mensagemEmailEdicao).toBe('E-mail já cadastrado anteriormente.');
    component.salvarEdicaoModal();
    http.expectNone(req => req.method === 'PUT');
    expect(component.mensagemErroModal).toBe('E-mail já cadastrado anteriormente.');
    expect(component.abaEdicaoUsuario).toBe('contato');
  });

  it('aceita o próprio e-mail e cancela consulta ao mudar de valor ou usuário', () => {
    component.iniciarEdicao({ id: 7, email: 'cliente@example.com' } as any);
    const http = TestBed.inject(HttpTestingController);
    component.verificarEmailEdicao();
    http.expectOne(req => req.url === '/api/usuario/validar-email').flush({ cadastrado: false });
    expect(component.campoEdicaoInvalido('email')).toBeFalse();
    component.verificarEmailEdicao();
    const anterior = http.expectOne(req => req.url === '/api/usuario/validar-email');
    component.edit.email = 'outro@example.com';
    component.alterarEmailEdicao();
    expect(anterior.cancelled).toBeTrue();
    expect(component.emailEdicaoConsultando).toBeFalse();
    component.verificarEmailEdicao();
    http.expectOne(req => req.url === '/api/usuario/validar-email').flush({ cadastrado: true });
    component.iniciarEdicao({ id: 8, email: 'livre@example.com' } as any);
    expect(component.emailEdicaoDuplicado).toBeFalse();
  });

  it('exibe aviso se a consulta de e-mail falhar e conserva a validação ao salvar', () => {
    component.iniciarEdicao({ id: 7, email: 'cliente@example.com' } as any);
    component.verificarEmailEdicao();
    TestBed.inject(HttpTestingController).expectOne(req => req.url === '/api/usuario/validar-email')
      .flush({}, { status: 500, statusText: 'Erro' });
    expect(component.emailEdicaoConsultando).toBeFalse();
    expect(component.emailEdicaoDuplicado).toBeFalse();
    expect(component.emailEdicaoAviso).toContain('ao salvar');
  });

  it('consulta CPF na edição ignorando o próprio usuário e bloqueia duplicidade', () => {
    component.iniciarEdicao({ id: 7, cpf: '222.222.222-22' } as any);
    component.verificarCpfEdicao();
    const http = TestBed.inject(HttpTestingController);
    http.expectOne(req => req.url === '/api/usuario/validar-cpf'
      && req.params.get('cpf') === '22222222222' && req.params.get('idIgnorado') === '7')
      .flush({ cadastrado: true });
    expect(component.campoEdicaoInvalido('cpf')).toBeTrue();
    expect(component.mensagemCpfEdicao).toBe('CPF já cadastrado anteriormente.');
    component.salvarEdicaoModal();
    http.expectNone(req => req.method === 'PUT');
    expect(component.mensagemErroModal).toBe('CPF já cadastrado anteriormente.');
  });

  it('aceita o próprio documento e também verifica CNPJ na edição', () => {
    component.iniciarEdicao({ id: 7, cpf: '11111111111111' } as any);
    component.verificarCpfEdicao();
    TestBed.inject(HttpTestingController).expectOne(req => req.url === '/api/usuario/validar-cpf')
      .flush({ cadastrado: false });
    expect(component.campoEdicaoInvalido('cpf')).toBeFalse();
    component.verificarCpfEdicao();
    TestBed.inject(HttpTestingController).expectOne(req => req.url === '/api/usuario/validar-cpf')
      .flush({ cadastrado: true });
    expect(component.mensagemCpfEdicao).toBe('CNPJ já cadastrado anteriormente.');
  });

  it('cancela consulta ao trocar o documento e limpa o estado ao mudar de usuário', () => {
    const http = TestBed.inject(HttpTestingController);
    component.iniciarEdicao({ id: 7, cpf: '22222222222' } as any);
    component.verificarCpfEdicao();
    const consulta = http.expectOne(req => req.url === '/api/usuario/validar-cpf');
    component.edit.cpf = '33333333333';
    component.alterarCpfEdicao();
    expect(consulta.cancelled).toBeTrue();
    expect(component.cpfEdicaoConsultando).toBeFalse();
    component.verificarCpfEdicao();
    http.expectOne(req => req.url === '/api/usuario/validar-cpf').flush({ cadastrado: true });
    component.iniciarEdicao({ id: 8, cpf: '44444444444' } as any);
    expect(component.cpfEdicaoDuplicado).toBeFalse();
    expect(component.campoEdicaoInvalido('cpf')).toBeFalse();
  });

  it('bloqueia inativação protegida no menu e no modal de edição com mensagem clara', async () => {
    const abrir = spyOn<any>(component, 'abrirModalConfirmacao');
    const alerta = spyOn(TestBed.inject(NotificacaoService), 'aviso');
    const usuario = { id: 7, nome: 'Administrador', email: 'admin@example.com', status: 'ativo',
      podeInativar: false, motivoBloqueioInativacao: 'Você não pode inativar seu próprio usuário.' } as any;
    component.abrirConfirmacaoAlterarStatus(usuario);
    expect(abrir).not.toHaveBeenCalled(); expect(alerta).toHaveBeenCalledWith(usuario.motivoBloqueioInativacao);
    component.iniciarEdicao(usuario); fixture.detectChanges();
    await fixture.whenStable(); fixture.detectChanges();
    expect((fixture.nativeElement.querySelector('#edit-status') as HTMLSelectElement).disabled).toBeTrue();
    expect(fixture.nativeElement.textContent).toContain(usuario.motivoBloqueioInativacao);
    usuario.status = 'inativo';
    component.abrirConfirmacaoAlterarStatus(usuario);
    expect((abrir.calls.mostRecent().args[0] as any).novoStatus).toBe('ativo');
  });

  it('oferece exclusão somente para cadastro elegível e mantém inativação e reativação', () => {
    const abrir = spyOn<any>(component, 'abrirModalConfirmacao');
    const usuario = { id: 42, nome: 'Teste', email: 'teste@example.com', status: 'ativo', podeExcluir: true } as any;
    expect(component.rotuloAcaoUsuario(usuario)).toBe('Deletar usuário');
    component.abrirConfirmacaoAlterarStatus(usuario);
    expect((abrir.calls.mostRecent().args[0] as any).tipo).toBe('excluir');
    usuario.podeExcluir = false;
    component.abrirConfirmacaoAlterarStatus(usuario);
    expect(component.rotuloAcaoUsuario(usuario)).toBe('Inativar usuário');
    expect((abrir.calls.mostRecent().args[0] as any).novoStatus).toBe('inativo');
    usuario.status = 'inativo';
    component.abrirConfirmacaoAlterarStatus(usuario);
    expect(component.rotuloAcaoUsuario(usuario)).toBe('Reativar usuário');
    expect((abrir.calls.mostRecent().args[0] as any).novoStatus).toBe('ativo');
    usuario.podeExcluir = true;
    component.abrirConfirmacaoAlterarStatus(usuario, true);
    expect((abrir.calls.mostRecent().args[0] as any).novoStatus).toBe('ativo');
    expect(component.rotuloAcaoUsuario({ status: 'ativo' } as any)).toBe('Inativar usuário');
  });

  it('exige justificativa na exclusão, evita envio duplo e bloqueia confirmação se surgir vínculo', () => {
    const http = TestBed.inject(HttpTestingController);
    component.confirmacao = {
      tipo: 'excluir', usuario: { id: 42, podeExcluir: true } as any,
      titulo: 'Deletar usuário?', mensagem: 'Exclusão permanente', icone: 'bi-trash',
      confirmarLabel: 'Confirmar exclusão', confirmarClasse: 'btn-danger'
    };
    fixture.detectChanges();
    const botao = fixture.nativeElement.querySelector('#modalConfirmacaoUsuario .modal-footer button:last-child') as HTMLButtonElement;
    expect(botao.disabled).toBeTrue();
    expect(fixture.nativeElement.querySelector('#justificativaExclusao')).toBeTruthy();
    component.executarAcaoConfirmada(); http.expectNone('/api/usuario/42');
    component.justificativaExclusao = '  Cadastro criado por engano.  ';
    fixture.detectChanges(); expect(botao.disabled).toBeFalse();
    component.executarAcaoConfirmada();
    const req = http.expectOne('/api/usuario/42');
    expect(req.request.method).toBe('DELETE');
    expect(req.request.body).toEqual({ justificativa: 'Cadastro criado por engano.' });
    expect(req.request.withCredentials).toBeTrue();
    component.executarAcaoConfirmada(); http.expectNone('/api/usuario/42');
    req.flush({ mensagem: 'Este usuário possui vínculos.' }, { status: 409, statusText: 'Conflict' });
    http.expectOne(r=>r.url==='/api/usuario/pagina').flush({content:[{ id: 42, nome: 'Teste', email: 'teste@example.com', status: 'ATIVO', podeExcluir: false }],totalElements:[{ id: 42, nome: 'Teste', email: 'teste@example.com', status: 'ATIVO', podeExcluir: false }].length,totalPages:1,number:0,resumo:{},opcoes:{}});
    fixture.detectChanges();
    expect(component.justificativaExclusaoErro).toContain('possui vínculos');
    expect(botao.disabled).toBeTrue();
    expect(component.rotuloAcaoUsuario(component.usuarios[0])).toBe('Inativar usuário');
    component.executarAcaoConfirmada(); http.expectNone('/api/usuario/42');
    http.verify();
  });

  it('remove da lista após exclusão confirmada e mantém registro após falha', () => {
    const http = TestBed.inject(HttpTestingController);
    spyOn(window, 'alert');
    component.confirmacao = {
      tipo: 'excluir', usuario: { id: 42, podeExcluir: true } as any,
      titulo: 'Deletar usuário?', mensagem: 'Exclusão permanente', icone: 'bi-trash',
      confirmarLabel: 'Confirmar exclusão', confirmarClasse: 'btn-danger'
    };
    component.justificativaExclusao = 'Cadastro criado por engano.';
    component.executarAcaoConfirmada();
    http.expectOne('/api/usuario/42').flush({ mensagem: 'Auditoria indisponível' }, { status: 500, statusText: 'Error' });
    expect(component.confirmacao).not.toBeNull();
    expect(component.justificativaExclusaoErro).toBe('Auditoria indisponível');
    component.executarAcaoConfirmada();
    http.expectOne('/api/usuario/42').flush(null, { status: 204, statusText: 'No Content' });
    http.expectOne(r=>r.url==='/api/usuario/pagina').flush({content:[],totalElements:0,totalPages:1,number:0,resumo:{},opcoes:{}});
    expect(component.confirmacao).toBeNull();
    expect(component.usuarios.length).toBe(0);
    http.verify();
  });

  it('exige justificativa no modal e envia o motivo no reset de 2FA', () => {
    const http = TestBed.inject(HttpTestingController);
    component.confirmacao = {
      tipo: 'resetar-mfa', usuario: { id: 42 } as any,
      titulo: 'Resetar 2FA', mensagem: 'Confirmar reset', icone: 'bi-shield-x',
      confirmarLabel: 'Confirmar reset 2FA', confirmarClasse: 'btn-warning'
    };
    fixture.detectChanges();
    const botao = fixture.nativeElement.querySelector('#modalConfirmacaoUsuario .modal-footer button:last-child') as HTMLButtonElement;
    expect(botao.disabled).toBeTrue();
    component.justificativaResetMfa = '   ';
    component.executarAcaoConfirmada();
    expect(component.justificativaResetErro).toContain('10 a 1000');
    http.expectNone('/api/usuario/42/resetar-mfa');
    component.justificativaResetMfa = '  Perda do dispositivo autenticador.  ';
    fixture.detectChanges();
    expect(botao.disabled).toBeFalse();
    component.executarAcaoConfirmada();
    const req = http.expectOne('/api/usuario/42/resetar-mfa');
    expect(req.request.body).toEqual({ justificativa: 'Perda do dispositivo autenticador.' });
    component.executarAcaoConfirmada();
    http.expectNone('/api/usuario/42/resetar-mfa');
    req.flush({ mensagem: 'Falha simulada de auditoria' }, { status: 409, statusText: 'Conflict' });
    expect(component.justificativaResetMfa.trim()).toBe('Perda do dispositivo autenticador.');
    expect(component.justificativaResetErro).toBe('Falha simulada de auditoria');
    expect(component.acaoEmExecucao).toBeFalse();
    http.verify();
  });

  it('consulta e-mail normalizado ao sair do campo e destaca duplicidade na guia Contato e Acesso', () => {
    const http = TestBed.inject(HttpTestingController);
    component.abaCadastroUsuario = 'contato';
    component.novoUsuario.email = ' Cliente@Exemplo.com ';
    fixture.detectChanges();
    const campo = fixture.nativeElement.querySelector('input[aria-describedby="emailCadastroFeedback"]') as HTMLInputElement;
    campo.dispatchEvent(new Event('blur'));
    expect(component.emailCadastroConsultando).toBeTrue();
    expect(component.cadastroProntoParaSalvar).toBeFalse();
    const consulta = http.expectOne(req => req.url === '/api/usuario/validar-email');
    expect(consulta.request.params.get('email')).toBe('cliente@exemplo.com');
    consulta.flush({ cadastrado: true });
    fixture.detectChanges();
    expect(campo.classList.contains('is-invalid')).toBeTrue();
    expect(fixture.nativeElement.querySelector('#emailCadastroFeedback').textContent)
      .toContain('E-mail já cadastrado anteriormente.');
    expect(component.cadastroProntoParaSalvar).toBeFalse();
    component.novoUsuario.email = 'novo@exemplo.com';
    component.alterarEmailCadastro();
    expect(component.emailCadastroDuplicado).toBeFalse();
    component.verificarEmailCadastro();
    http.expectOne(req => req.url === '/api/usuario/validar-email').flush({ cadastrado: false });
    expect(component.campoCadastroInvalido('email')).toBeFalse();
    http.verify();
  });

  it('ignora formato inválido, cancela consulta antiga e trata indisponibilidade sem acusar duplicidade', () => {
    const http = TestBed.inject(HttpTestingController);
    component.novoUsuario.email = 'sem-arroba';
    component.verificarEmailCadastro();
    http.expectNone(req => req.url === '/api/usuario/validar-email');
    component.novoUsuario.email = 'antigo@exemplo.com';
    component.verificarEmailCadastro();
    const antiga = http.expectOne(req => req.url === '/api/usuario/validar-email');
    component.novoUsuario.email = 'novo@exemplo.com';
    component.alterarEmailCadastro();
    expect(antiga.cancelled).toBeTrue();
    component.verificarEmailCadastro();
    http.expectOne(req => req.url === '/api/usuario/validar-email')
      .flush({}, { status: 503, statusText: 'Indisponível' });
    expect(component.emailCadastroConsultando).toBeFalse();
    expect(component.emailCadastroDuplicado).toBeFalse();
    expect(component.emailCadastroAviso).toContain('antes de avançar');
    http.verify();
  });

  it('destaca CPF duplicado ao sair do campo e limpa o aviso ao alterar o documento', () => {
    const http = TestBed.inject(HttpTestingController);
    component.novoUsuario.cpf = '22222222222';
    fixture.detectChanges();
    const campo = fixture.nativeElement.querySelector('#cpfCnpj') as HTMLInputElement;
    campo.dispatchEvent(new Event('blur'));
    expect(component.cpfCadastroConsultando).toBeTrue();
    expect(component.cadastroProntoParaSalvar).toBeFalse();
    const consulta = http.expectOne(req => req.url === '/api/usuario/validar-cpf');
    expect(consulta.request.params.get('cpf')).toBe('22222222222');
    consulta.flush({ cadastrado: true });
    fixture.detectChanges();
    expect(campo.classList.contains('is-invalid')).toBeTrue();
    expect(fixture.nativeElement.querySelector('#cpfCadastroFeedback').textContent)
      .toContain('CPF já cadastrado anteriormente.');
    expect(component.cadastroProntoParaSalvar).toBeFalse();
    component.novoUsuario.cpf = '33333333333';
    component.alterarCpfCadastro();
    component.verificarCpfCadastro();
    http.expectOne(req => req.url === '/api/usuario/validar-cpf').flush({ cadastrado: false });
    expect(component.cpfCadastroDuplicado).toBeFalse();
    http.verify();
  });

  it('cancela consulta antiga e não trata falha de rede como documento duplicado', () => {
    const http = TestBed.inject(HttpTestingController);
    component.novoUsuario.cpf = '22222222222';
    component.verificarCpfCadastro();
    const antiga = http.expectOne(req => req.url === '/api/usuario/validar-cpf');
    component.novoUsuario.cpf = '33333333333';
    component.alterarCpfCadastro();
    expect(antiga.cancelled).toBeTrue();
    component.verificarCpfCadastro();
    http.expectOne(req => req.url === '/api/usuario/validar-cpf')
      .flush({}, { status: 503, statusText: 'Indisponível' });
    expect(component.cpfCadastroConsultando).toBeFalse();
    expect(component.cpfCadastroDuplicado).toBeFalse();
    expect(component.cpfCadastroAviso).toContain('antes de avançar');
    http.verify();
  });
});
