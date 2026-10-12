import { provideZoneChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { ServicoComponent } from '../../pages/menu-administrador/servico/servico.component';
import { FornecimentoServicoComponent } from '../../pages/menu-administrador/fornecimento-servico/fornecimento-servico.component';
import { FluxoServicoService } from './fluxo-servico.service';

describe('Continuação serviço → fornecedor → fornecimento', () => {
  let http: HttpTestingController, navegar: jasmine.Spy, anterior: any;
  const modais = new Map<string, any>();
  const params: Record<string, string> = {};
  const fornecedor: any = { id: 7, razaoSocial: 'Fornecedor', cnpj: '12345678000190', ativo: true };
  const servico: any = { id: 12, nome: 'Balanceamento', categoria: 'Pneus', tipoDoPrestador: 'Mecânico', duracaoEstimada: 1, unidadeDuracao: 'HORA', valorBase: 80, unidadeCobranca: 'SERVICO', garantiaDias: 0, necessitaPecas: false, ativo: true };
  beforeEach(() => {
    Object.keys(params).forEach(k => delete params[k]); modais.clear(); anterior = (globalThis as any).bootstrap;
    (globalThis as any).bootstrap = { Modal: { getOrCreateInstance: (el: HTMLElement) => {
      if (!modais.has(el.id)) modais.set(el.id, { show: jasmine.createSpy(), hide: jasmine.createSpy() }); return modais.get(el.id);
    } } };
    TestBed.configureTestingModule({ imports: [ServicoComponent, FornecimentoServicoComponent], providers: [provideZoneChangeDetection(), provideHttpClient(), provideHttpClientTesting(), provideRouter([]), { provide: ActivatedRoute, useValue: { snapshot: { get queryParamMap() { return convertToParamMap(params); } } } }] });
    http = TestBed.inject(HttpTestingController); navegar = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true); spyOn(console, 'error');
  });
  afterEach(() => { http.verify({ ignoreCancelled: true }); (globalThis as any).bootstrap = anterior; });
  function origem() {
    const f = TestBed.createComponent(ServicoComponent); f.detectChanges(); http.expectOne(req => req.url === '/api/servico/pagina').flush({content:[],totalElements:0,totalPages:1,number:0,resumo:{total:0},opcoes:{}}); http.expectNone('/api/fornecedor');
    const c = f.componentInstance; c.abrirModalCadastro(); c.novoServico = { ...servico, id: undefined }; return f;
  }
  function destino(s = servico, fornecedores = [fornecedor]) {
    Object.assign(params, { continuarServico: '1', servicoId: '12' });
    const f = TestBed.createComponent(FornecimentoServicoComponent); f.detectChanges();
    const req = http.expectOne('/api/servico/12'); expect(req.request.withCredentials).toBeTrue(); req.flush(s);
    if(s.idFornecedor)http.expectOne('/api/fornecedor/'+s.idFornecedor).flush(fornecedores.find(f=>f.id===s.idFornecedor)??{...fornecedor,id:s.idFornecedor,ativo:false}); else http.expectNone('/api/fornecedor'); http.expectNone('/api/servico'); http.expectOne(r=>r.url==='/api/fornecimento-servicos/pagina').flush({content:[],totalElements:0,totalPages:0,number:0,resumo:{},opcoes:{}}); return f;
  }
  it('oferece continuação somente após salvar e concluir por enquanto não cria fornecimento', () => {
    const f = origem(), c = f.componentInstance; c.salvarNovoServico(); c.salvarNovoServico();
    expect(c.servicoCadastrado).toBeNull(); expect(navegar).not.toHaveBeenCalled();
    http.expectOne('/api/servico').flush(servico); http.expectOne(req => req.url === '/api/servico/pagina').flush({content:[servico],totalElements:1,totalPages:1,number:0,resumo:{total:1},opcoes:{}}); f.detectChanges();
    expect(c.servicoCadastrado?.id).toBe(12); expect(modais.get('modalContinuidadeFornecimentoServico').show).toHaveBeenCalled();
    expect(f.nativeElement.querySelector('#modalContinuidadeFornecimentoServico').textContent).toContain('Concluir por enquanto');
    c.concluirContinuidadeFornecimento(); expect(c.servicoCadastrado).toBeNull(); expect(c.servicos[0].id).toBe(12);
    http.expectNone(r => r.url.includes('fornecimento') || r.method === 'DELETE'); expect(navegar).not.toHaveBeenCalled();
  });
  it('aguarda o cadastro fechar antes de abrir a continuação', () => {
    const c = origem().componentInstance; const el = document.getElementById('modalCadastroServico')!; el.classList.add('show');
    c.salvarNovoServico(); http.expectOne('/api/servico').flush(servico); http.expectOne(req => req.url === '/api/servico/pagina').flush({content:[servico],totalElements:1,totalPages:1,number:0,resumo:{total:1},opcoes:{}});
    expect(modais.has('modalContinuidadeFornecimentoServico')).toBeFalse(); el.classList.remove('show'); el.dispatchEvent(new Event('hidden.bs.modal'));
    expect(modais.get('modalContinuidadeFornecimentoServico').show).toHaveBeenCalled();
  });
  it('navega com o serviço salvo e recupera falha de navegação sem repetir o cadastro', async () => {
    const c = origem().componentInstance; c.abrirContinuidadeFornecimento(servico); navegar.and.resolveTo(false);
    c.continuarFornecimentoDoServico(); c.continuarFornecimentoDoServico(); await Promise.resolve();
    expect(navegar).toHaveBeenCalledOnceWith(['/menuAdministrador', 'fornecimentoServico'], { queryParams: { continuarServico: '1', servicoId: 12 } });
    expect(c.erroContinuidadeFornecimento).toContain('permanece salvo'); expect(c.continuandoFornecimento).toBeFalse(); expect(c.servicoCadastrado?.id).toBe(12);
    navegar.and.resolveTo(true); c.continuarFornecimentoDoServico(); await Promise.resolve(); expect(navegar.calls.count()).toBe(2); http.expectNone(r => r.method === 'POST');
  });
  it('não continua quando o serviço cadastrado está inativo', () => {
    const c = origem().componentInstance; c.abrirContinuidadeFornecimento({ ...servico, ativo: false }); c.continuarFornecimentoDoServico(); expect(navegar).not.toHaveBeenCalled();
  });
  it('mantém o cadastro em caso de erro sem abrir a continuação', () => {
    const c = origem().componentInstance; c.salvarNovoServico(); http.expectOne('/api/servico').flush({ mensagem: 'Falha ao salvar' }, { status: 500, statusText: 'Erro' });
    expect(c.servicoCadastrado).toBeNull(); expect(c.mensagemErroCadastro).toContain('Falha'); expect(modais.has('modalContinuidadeFornecimentoServico')).toBeFalse();
  });
  it('sem fornecedor abre a seleção e preserva o serviço ao cancelar ou cadastrar fornecedor', () => {
    const f = destino(), c = f.componentInstance;
    expect(c.novoFornecimento.idServico).toBe(12); expect(c.novoFornecimento.idFornecedor).toBeUndefined(); expect(modais.get('modalFornecedorFornecimentoServico').show).toHaveBeenCalled();
    expect(c.novoFornecimento.valorCusto).toBe(''); expect(c.novoFornecimento.prazoExecucao).toBe('');
    c.cancelarSelecaoFornecedor(); expect(c.novoFornecimento.idServico).toBe(12); expect(modais.get('modalCadastroFornecimentoServico').show).toHaveBeenCalled();
    c.abrirModalFornecedor('cadastro'); c.iniciarCadastroAuxiliar('fornecedor'); expect(c.cadastroAuxiliar).toBe('fornecedor');
    c.fornecedorCriadoNoFornecimento({ ...fornecedor, id: 9 }); expect(c.novoFornecimento.idFornecedor).toBe(9); expect(c.novoFornecimento.idServico).toBe(12); expect(c.abaCadastroFornecimento).toBe('condicoes');
    c.abrirModalServico('cadastro'); expect(modais.has('modalServicoFornecimentoServico')).toBeFalse(); http.expectNone(r => r.method === 'POST');
  });
  it('preenche fornecedor ativo vinculado e abre as condições sem criar vínculo automaticamente', () => {
    const c = destino({ ...servico, idFornecedor: 7 }).componentInstance;
    expect(c.novoFornecimento.idFornecedor).toBe(7); expect(c.novoFornecimento.idServico).toBe(12); expect(c.abaCadastroFornecimento).toBe('condicoes');
    expect(modais.has('modalFornecedorFornecimentoServico')).toBeFalse(); expect(navegar.calls.mostRecent().args[1].queryParams).toEqual({ continuarServico: null, servicoId: null });
    http.expectNone(r => r.method === 'POST');
  });
  it('fornecedor inativo não é reutilizado e pode ser substituído sem alterar o serviço', () => {
    const c = destino({ ...servico, idFornecedor: 7 }, [{ ...fornecedor, ativo: false }]).componentInstance;
    expect(c.novoFornecimento.idFornecedor).toBeUndefined(); expect(c.mensagemErroModal).toContain('não está disponível como ativo');
    c.selecionarFornecedor({ ...fornecedor, id: 9 }); expect(c.novoFornecimento.idFornecedor).toBe(9); expect(c.novoFornecimento.idServico).toBe(12); expect(c.abaCadastroFornecimento).toBe('condicoes');
  });
  it('mantém o bloqueio de par duplicado e permite atualizar o registro existente', () => {
    const c = destino({ ...servico, idFornecedor: 7 }).componentInstance;
    c.registrarDuplicidade({ model: c.novoFornecimento, estado: { duplicado: true, consultando: false, id: 18, mensagem: 'Já existe um fornecimento para este fornecedor e serviço.' } });
    expect(c.cadastroProntoParaSalvar).toBeFalse(); c.salvarNovoFornecimento(); http.expectNone(r => r.method === 'POST');
    c.atualizarFornecimentoDuplicado(); http.expectOne(req=>req.url==='/api/fornecimento-servicos/pagina' && req.params.get('tamanho')==='1').flush({content:[{ id: 18, idFornecedor: 7, idServico: 12, nomeServico: servico.nome, valorCusto: 40, prazoExecucao: 2, unidadeCobranca: 'SERVICO', unidadePrazo: 'DIA', quantidadeMinima: 1, disponibilidade: 'SOB_DEMANDA', ativo: true }]});
    expect(c.editId).toBe(18); expect(c.editandoExistenteNoFluxo).toBeTrue();
  });
  it('recusa contexto com ID inválido ou serviço inativo sem iniciar fornecimento', () => {
    Object.assign(params, { continuarServico: '1', servicoId: 'abc' });
    let falhou = false; TestBed.inject(FluxoServicoService).carregar(TestBed.inject(ActivatedRoute)).subscribe({ error: () => falhou = true });
    expect(falhou).toBeTrue(); http.expectNone('/api/servico/abc');
    params['servicoId'] = '12'; falhou = false;
    TestBed.inject(FluxoServicoService).carregar(TestBed.inject(ActivatedRoute)).subscribe({ error: () => falhou = true });
    http.expectOne('/api/servico/12').flush({ ...servico, ativo: false }); expect(falhou).toBeTrue();
  });
});
