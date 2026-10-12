import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExibeUsuarioComponent } from './exibe-usuario.component';

describe('ExibeUsuarioComponent', () => {
  let component: ExibeUsuarioComponent;
  let fixture: ComponentFixture<ExibeUsuarioComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
      imports: [ExibeUsuarioComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ExibeUsuarioComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    TestBed.inject(HttpTestingController).expectOne('/api/usuario').flush([]);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('bloqueia inativação protegida no menu e no modal de edição com mensagem clara', async () => {
    const abrir = spyOn<any>(component, 'abrirModalConfirmacao');
    const alerta = spyOn(window, 'alert');
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
    http.expectOne('/api/usuario').flush([{ id: 42, nome: 'Teste', email: 'teste@example.com', status: 'ATIVO', podeExcluir: false }]);
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
    http.expectOne('/api/usuario').flush([]);
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
    expect(component.emailCadastroAviso).toContain('A verificação será feita ao salvar');
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
    expect(component.cpfCadastroAviso).toContain('A verificação será feita ao salvar');
    http.verify();
  });
});
