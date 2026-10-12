import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { SolicitacoesAcessoComponent } from './solicitacoes-acesso.component';

describe('SolicitacoesAcessoComponent', () => {
  let fixture: ComponentFixture<SolicitacoesAcessoComponent>, component: SolicitacoesAcessoComponent, http: HttpTestingController;
  const vazia = { itens: [], total: 0, pagina: 0, tamanho: 10, totalPaginas: 0, pendentes: 0 };
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [SolicitacoesAcessoComponent], providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])] }).compileComponents();
    fixture = TestBed.createComponent(SolicitacoesAcessoComponent); component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController); fixture.detectChanges();
    const req = http.expectOne(r => r.url === '/api/usuario/solicitacoes-acesso');
    expect(req.request.params.get('status')).toBe('PENDENTE'); req.flush(vazia);
  });
  afterEach(() => http.verify());
  it('exige decisão e justificativa e registra aprovação uma única vez', () => {
    component.selecionada = { id: 1, usuarioNome: 'Cliente teste', usuarioEmail: 'teste@example.com', tipo: 'INATIVACAO', justificativa: 'Solicitação de teste.', status: 'PENDENTE' } as any;
    fixture.detectChanges(); expect(component.podeConfirmar).toBeFalse(); component.confirmar(); http.expectNone(r => r.method === 'PUT');
    component.decisao = 'APROVAR'; component.justificativa = '  Solicitação confirmada pelo administrador.  '; fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('encerrará todas as suas sessões');
    component.confirmar(); const req = http.expectOne('/api/usuario/solicitacoes-acesso/1/decisao');
    expect(req.request.body).toEqual({ decisao: 'APROVAR', justificativa: 'Solicitação confirmada pelo administrador.' });
    expect(req.request.withCredentials).toBeTrue(); component.confirmar(); http.expectNone(r => r.method === 'PUT');
    req.flush({ status: 'APROVADA' }); http.expectOne(r => r.url === '/api/usuario/solicitacoes-acesso').flush(vazia);
    expect(component.selecionada).toBeNull(); expect(component.sucesso).toContain('sessões foram encerradas');
  });
  it('preserva decisão após falha e bloqueia confirmação se outra sessão já tiver analisado', () => {
    component.selecionada = { id: 1, status: 'PENDENTE' } as any; component.decisao = 'RECUSAR'; component.justificativa = 'Motivo de recusa para o teste.';
    component.confirmar(); http.expectOne('/api/usuario/solicitacoes-acesso/1/decisao').flush({ mensagem: 'Falha ao registrar decisão.' }, { status: 500, statusText: 'Error' });
    expect(component.justificativa).toContain('Motivo de recusa'); expect(component.podeConfirmar).toBeTrue();
    component.confirmar(); http.expectOne('/api/usuario/solicitacoes-acesso/1/decisao').flush({ mensagem: 'Solicitação já analisada.' }, { status: 409, statusText: 'Conflict' });
    http.expectOne(r => r.url === '/api/usuario/solicitacoes-acesso').flush(vazia);
    expect(component.erroDecisao).toBe('Solicitação já analisada.'); expect(component.podeConfirmar).toBeFalse();
    component.confirmar(); http.expectNone(r => r.method === 'PUT');
  });
  it('filtra histórico e usa paginação sem carregar todos os registros', () => {
    component.status = 'RECUSADA'; component.tamanho = 25; component.carregar(2);
    const req = http.expectOne(r => r.url === '/api/usuario/solicitacoes-acesso');
    expect(req.request.params.get('status')).toBe('RECUSADA'); expect(req.request.params.get('pagina')).toBe('2');
    expect(req.request.params.get('tamanho')).toBe('25'); req.flush(vazia);
  });
  it('mostra o período e confirma agendamento sem anunciar inativação imediata', () => {
    component.selecionada = { id: 2, tipo: 'TEMPORARIA', status: 'PENDENTE', usuarioNome: 'Colaborador teste',
      inicioPeriodo: '2030-10-10', fimPeriodo: '2030-10-20', justificativa: 'Férias programadas.' } as any;
    component.decisao = 'APROVAR'; component.justificativa = 'Férias aprovadas pela administração.'; fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('10/10/2030'); expect(fixture.nativeElement.textContent).toContain('20/10/2030');
    expect(fixture.nativeElement.textContent).toContain('retornará automaticamente'); component.confirmar();
    http.expectOne('/api/usuario/solicitacoes-acesso/2/decisao').flush({ status: 'APROVADA', tipo: 'TEMPORARIA', situacaoPeriodo: 'AGENDADA' });
    http.expectOne(r => r.url === '/api/usuario/solicitacoes-acesso').flush(vazia);
    expect(component.sucesso).toContain('agendada'); expect(component.sucesso).not.toContain('foi inativado');
  });
});
