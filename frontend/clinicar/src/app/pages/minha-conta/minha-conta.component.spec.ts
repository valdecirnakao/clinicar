import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { MinhaContaComponent } from './minha-conta.component';

describe('MinhaContaComponent', () => {
  let fixture: ComponentFixture<MinhaContaComponent>, component: MinhaContaComponent, http: HttpTestingController;
  const vazia = { itens: [], total: 0, pagina: 0, tamanho: 10, totalPaginas: 0, pendentes: 0 };
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [MinhaContaComponent], providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])] }).compileComponents();
    fixture = TestBed.createComponent(MinhaContaComponent); component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController); fixture.detectChanges();
    http.expectOne('/api/auth/me').flush({ id: 42, nome: 'Cliente teste', email: 'teste@example.com', status: 'ATIVO', tipo_do_acesso: 'CLIENTE' });
    http.expectOne(r => r.url === '/api/usuario/solicitacoes-acesso/minhas').flush(vazia);
  });
  afterEach(() => http.verify());
  it('exige justificativa e confirmação e não altera diretamente o status ao enviar', () => {
    component.enviar(); http.expectNone(r => r.method === 'POST');
    component.justificativa = '  Quero encerrar o acesso à minha conta.  '; component.confirmo = true;
    fixture.detectChanges(); expect(component.podeEnviar).toBeTrue(); component.enviar();
    const req = http.expectOne('/api/usuario/solicitacoes-acesso/minhas');
    expect(req.request.body).toEqual({ tipo: 'INATIVACAO', justificativa: 'Quero encerrar o acesso à minha conta.' });
    expect(req.request.withCredentials).toBeTrue(); component.enviar(); http.expectNone(r => r.method === 'POST');
    req.flush({ id: 1, status: 'PENDENTE' });
    http.expectOne(r => r.url === '/api/usuario/solicitacoes-acesso/minhas').flush({ ...vazia, pendentes: 1 });
    expect(component.usuario?.status).toBe('ATIVO'); expect(component.podeEnviar).toBeFalse();
    expect(component.sucesso).toContain('continuará ativo');
    http.expectNone(r => r.method === 'PUT' || r.method === 'DELETE');
  });
  it('bloqueia novo pedido pendente e exibe decisão recusada no histórico', () => {
    component.carregar();
    http.expectOne(r => r.url === '/api/usuario/solicitacoes-acesso/minhas').flush({ ...vazia, total: 1, pendentes: 1,
      itens: [{ id: 1, tipo: 'INATIVACAO', justificativa: 'Pedido anterior de teste.', status: 'PENDENTE', solicitadoEm: '2026-10-01T10:00:00Z' }] });
    component.justificativa = 'Nova solicitação de teste.'; component.confirmo = true; fixture.detectChanges();
    expect(component.podeEnviar).toBeFalse(); expect(fixture.nativeElement.textContent).toContain('solicitação pendente');
    component.enviar(); http.expectNone(r => r.method === 'POST');
    component.carregar();
    http.expectOne(r => r.url === '/api/usuario/solicitacoes-acesso/minhas').flush({ ...vazia, total: 1,
      itens: [{ id: 1, tipo: 'INATIVACAO', justificativa: 'Pedido anterior de teste.', status: 'RECUSADA', solicitadoEm: '2026-10-01T10:00:00Z',
        motivoDecisao: 'Motivo da recusa de teste.', administradorNome: 'Administrador teste', decididoEm: '2026-10-01T12:00:00Z' }] });
    fixture.detectChanges(); expect(fixture.nativeElement.textContent).toContain('Motivo da recusa de teste.');
    expect(component.podeEnviar).toBeTrue();
  });
  it('preserva justificativa em falha e bloqueia o formulário se o histórico não carregar', () => {
    component.justificativa = 'Pedido de inativação de teste.'; component.confirmo = true; component.enviar();
    http.expectOne('/api/usuario/solicitacoes-acesso/minhas').flush({ mensagem: 'Falha simulada.' }, { status: 500, statusText: 'Error' });
    expect(component.erro).toBe('Falha simulada.'); expect(component.justificativa).toContain('inativação'); expect(component.enviando).toBeFalse();
    component.carregar(); http.expectOne(r => r.url === '/api/usuario/solicitacoes-acesso/minhas').flush({}, { status: 500, statusText: 'Error' });
    expect(component.podeEnviar).toBeFalse();
  });
  it('solicita a página correta e retorna ao login quando a sessão é revogada', () => {
    const navegar = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    component.carregar(1); const req = http.expectOne(r => r.url === '/api/usuario/solicitacoes-acesso/minhas');
    expect(req.request.params.get('pagina')).toBe('1'); req.flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(navegar).toHaveBeenCalledWith(['/login']); expect(component.podeEnviar).toBeFalse();
  });
  it('exige período válido para colaborador e envia datas somente na suspensão temporária', () => {
    component.usuario = { ...component.usuario!, tipo_do_acesso: 'COLABORADOR' };
    component.tipo = 'TEMPORARIA'; component.justificativa = 'Férias programadas pelo colaborador.'; component.confirmo = true;
    fixture.detectChanges(); expect(fixture.nativeElement.textContent).toContain('Primeiro dia'); expect(component.podeEnviar).toBeFalse();
    component.inicioPeriodo = component.hoje; component.fimPeriodo = '2000-01-01'; expect(component.podeEnviar).toBeFalse();
    component.fimPeriodo = component.hoje; expect(component.podeEnviar).toBeTrue(); component.enviar();
    const req = http.expectOne('/api/usuario/solicitacoes-acesso/minhas');
    expect(req.request.body.inicioPeriodo).toBe(component.hoje); expect(req.request.body.fimPeriodo).toBe(component.hoje);
    req.flush({ id: 1, status: 'PENDENTE', tipo: 'TEMPORARIA' });
    http.expectOne(r => r.url === '/api/usuario/solicitacoes-acesso/minhas').flush({ ...vazia, pendentes: 1 });
    expect(component.inicioPeriodo).toBe('');
  });
  it('cliente não possui opção de suspensão temporária nem pode enviar esse tipo', () => {
    fixture.detectChanges(); expect(fixture.nativeElement.querySelector('option[value="TEMPORARIA"]')).toBeNull();
    component.tipo = 'TEMPORARIA'; component.inicioPeriodo = component.hoje; component.fimPeriodo = component.hoje;
    component.justificativa = 'Justificativa válida de teste.'; component.confirmo = true; component.enviar();
    expect(component.podeEnviar).toBeFalse(); http.expectNone(r => r.method === 'POST');
  });
});
