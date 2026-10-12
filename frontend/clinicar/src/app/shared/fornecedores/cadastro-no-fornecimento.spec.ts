import { provideZoneChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { By } from '@angular/platform-browser';
import { FornecimentoPecasComponent } from '../../pages/menu-administrador/fornecimento-pecas/fornecimento-pecas.component';
import { FornecedorComponent } from '../../pages/menu-administrador/fornecedor/fornecedor.component';
import { PecaComponent } from '../../pages/menu-administrador/peca/peca.component';

describe('Cadastro auxiliar no novo fornecimento de peças', () => {
  let http: HttpTestingController;
  let anterior: any;
  const modais = new Map<string, any>();
  const fornecedor: any = { id: 7, razaoSocial: 'Fornecedor ativo', cnpj: '12345678000190', ativo: true };
  const peca = { id: 12, nome: 'Filtro', fabricante: 'Marca', tipo: 'Filtro', unidade: 'Unidade' };
  beforeEach(() => {
    anterior = (globalThis as any).bootstrap; modais.clear();
    (globalThis as any).bootstrap = { Modal: { getOrCreateInstance: (el: HTMLElement) => {
      if (!modais.has(el.id)) modais.set(el.id, { show: jasmine.createSpy('show'), hide: jasmine.createSpy('hide'), dispose: jasmine.createSpy('dispose') });
      return modais.get(el.id);
    } } };
    TestBed.configureTestingModule({ imports: [FornecimentoPecasComponent], providers: [provideZoneChangeDetection(), provideHttpClient(), provideHttpClientTesting(), provideRouter([])] });
    http = TestBed.inject(HttpTestingController); spyOn(console, 'error');
  });
  afterEach(() => { http.verify({ ignoreCancelled: true }); (globalThis as any).bootstrap = anterior; });
  function preparar() {
    const fixture = TestBed.createComponent(FornecimentoPecasComponent); fixture.detectChanges();
    http.expectNone('/api/fornecedor');
    http.expectNone('/api/peca'); http.expectOne(req=>req.url==='/api/fornecimento-pecas/pagina').flush({content:[],totalElements:0,totalPages:0,number:0,resumo:{},opcoes:{}});
    fixture.componentInstance.abrirModalCadastro();
    return fixture;
  }
  it('oferece novos cadastros mesmo sem resultados na busca, sem selecionar fornecedores inativos', () => {
    const fixture = preparar(), c = fixture.componentInstance;
    c.abrirModalFornecedor('cadastro'); c.razaoSocialFiltroEdit = 'Não existe'; c.aplicarFiltroFornecedorEdit(); fixture.detectChanges();
    expect(c.fornecedoresFiltrados).toEqual([]);
    const btn: HTMLButtonElement = fixture.nativeElement.querySelector('#modalFornecedor .modal-footer .btn-primary');
    expect(btn.textContent).toContain('Cadastrar novo fornecedor'); btn.click(); expect(c.cadastroAuxiliar).toBe('fornecedor');
    const original = c.novoFornecimento.fornecedor;
    c.selecionarFornecedorModal({ ...fornecedor, ativo: false }); expect(c.novoFornecimento.fornecedor).toBe(original);
    http.expectNone(r => r.method === 'POST');
  });
  it('aguarda a seleção fechar antes de abrir o cadastro auxiliar', () => {
    const c = preparar().componentInstance; c.abrirModalFornecedor('cadastro');
    const el = document.getElementById('modalFornecedor')!; el.classList.add('show');
    c.iniciarCadastroAuxiliar('fornecedor'); expect(c.cadastroAuxiliar).toBeNull();
    el.classList.remove('show'); el.dispatchEvent(new Event('hidden.bs.modal'));
    expect(c.cadastroAuxiliar).toBe('fornecedor');
  });
  it('reutiliza o cadastro completo e associa o fornecedor salvo preservando peça e condições', async () => {
    const fixture = preparar(), c = fixture.componentInstance;
    c.novoFornecimento.peca = peca; c.novoFornecimento.valorCusto = 'R$ 75,00';
    const rascunho = c.novoFornecimento;
    c.abrirModalFornecedor('cadastro'); c.iniciarCadastroAuxiliar('fornecedor'); fixture.detectChanges(); await fixture.whenStable(); fixture.detectChanges();
    const child = fixture.debugElement.query(By.directive(FornecedorComponent)).componentInstance as FornecedorComponent;
    expect(child.cadastroIntegrado).toBeTrue(); expect(fixture.nativeElement.querySelector('app-fornecedor .fornecedor-page')).toBeNull();
    expect(child.novoFornecedor.ativo).toBeTrue();
    spyOn<any>(child, 'validarFornecedor').and.returnValue(null); child.novoFornecedor = { ...fornecedor, id: undefined };
    child.salvarNovoFornecedor(); const req = http.expectOne('/api/fornecedor'); expect(req.request.method).toBe('POST'); req.flush(fornecedor);
    expect(c.cadastroAuxiliar).toBeNull(); expect(c.novoFornecimento).toBe(rascunho);
    expect(c.novoFornecimento.peca?.id).toBe(12); expect(c.novoFornecimento.fornecedor?.id).toBe(7);
    expect(c.novoFornecimento.valorCusto).toBe('R$ 75,00'); expect(c.abaCadastroFornecimento).toBe('condicoes');
    expect(modais.get('modalCadastroFornecimento').show).toHaveBeenCalled();
    expect(modais.has('modalContinuidadeFornecedor')).toBeFalse();
    http.expectNone(r => r.method === 'GET');
  });
  for (const tipo of ['fornecedor', 'peca'] as const) {
    it(`cancelar ${tipo} retorna à seleção sem perder o rascunho`, async () => {
      const fixture = preparar(), c = fixture.componentInstance;
      c.novoFornecimento.valorCusto = 'R$ 75,00'; c.novoFornecimento.prazoEntregaDias = '3'; c.novoFornecimento.quantidadeMinima = '2';
      const original = { ...c.novoFornecimento };
      if (tipo === 'fornecedor') c.abrirModalFornecedor('cadastro'); else c.abrirModalPeca('cadastro');
      c.iniciarCadastroAuxiliar(tipo); fixture.detectChanges(); await fixture.whenStable(); fixture.detectChanges();
      const id = tipo === 'fornecedor' ? 'modalCadastroFornecedor' : 'modalCadastroPeca';
      document.getElementById(id)!.dispatchEvent(new Event('hidden.bs.modal')); fixture.detectChanges();
      expect(c.cadastroAuxiliar).toBeNull(); expect(c.novoFornecimento).toEqual(original);
      expect(modais.get(tipo === 'fornecedor' ? 'modalFornecedor' : 'modalPeca').show).toHaveBeenCalledTimes(2);
      http.expectNone(r => r.method === 'POST');
    });
  }
  it('reutiliza a classificação completa de óleo e retorna a peça salva ao fornecimento', async () => {
    const fixture = preparar(), c = fixture.componentInstance;
    c.novoFornecimento.fornecedor = fornecedor; c.novoFornecimento.valorCusto = 'R$ 40,00';
    c.abrirModalPeca('cadastro'); fixture.detectChanges();
    const btn = fixture.nativeElement.querySelector('#modalPeca .modal-footer .btn-primary'); expect(btn.textContent).toContain('Cadastrar nova peça'); btn.click();
    fixture.detectChanges(); await fixture.whenStable(); fixture.detectChanges();
    const child = fixture.debugElement.query(By.directive(PecaComponent)).componentInstance as PecaComponent;
    child.novaPeca = { nome: 'Óleo novo', fabricante: 'Marca', tipo: 'Óleo de motor', unidade: 'Litro', origemOleo: 'SINTETICO', viscosidadeSae: '5W30', classificacaoApi: 'SP', classificacaoAcea: 'C3', normaOem: 'OEM teste', modelo: 'Linha teste' };
    child.abaCadastroPeca = 'classificacao'; fixture.detectChanges();
    for (const campo of ['origemOleo', 'modelo', 'viscosidadeSae', 'classificacaoApi', 'classificacaoAcea', 'normaOem']) expect(fixture.nativeElement.querySelector(`#${campo}PecaCadastro`)).withContext(campo).not.toBeNull();
    child.salvarNovaPeca(); const req = http.expectOne('/api/peca'); expect(req.request.method).toBe('POST'); expect(req.request.body.viscosidadeSae).toBe('5W-30');
    req.flush({ ...req.request.body, id: 13 });
    expect(c.novoFornecimento.peca?.id).toBe(13); expect(c.novoFornecimento.fornecedor?.id).toBe(7); expect(c.novoFornecimento.valorCusto).toBe('R$ 40,00');
    expect(c.abaCadastroFornecimento).toBe('condicoes'); expect(c.cadastroAuxiliar).toBeNull(); expect(modais.has('modalFornecedorDaPeca')).toBeFalse();
  });
  it('mantém o cadastro auxiliar aberto após falha ao salvar', async () => {
    const fixture = preparar(), c = fixture.componentInstance;
    c.abrirModalPeca('cadastro'); c.iniciarCadastroAuxiliar('peca'); fixture.detectChanges(); await fixture.whenStable();
    const child = fixture.debugElement.query(By.directive(PecaComponent)).componentInstance as PecaComponent;
    child.novaPeca = { ...peca, id: undefined }; child.salvarNovaPeca();
    http.expectOne('/api/peca').flush({ mensagem: 'Falha no cadastro' }, { status: 500, statusText: 'Erro' });
    expect(c.cadastroAuxiliar).toBe('peca'); expect(c.novoFornecimento.peca).toBeUndefined(); expect(child.salvandoCadastro).toBeFalse();
    expect(child.mensagemErroModal).toContain('Falha no cadastro');
  });
  it('após salvar o fornecimento oferece estoque da mesma peça sem criar saldo automaticamente', () => {
    const c = preparar().componentInstance;
    c.novoFornecimento = { fornecedor, peca, valorCusto: 'R$ 40,00', prazoEntregaDias: '3', quantidadeMinima: '1', ativo: true, dataCadastro: '2026-10-04' };
    c.salvarNovoFornecimento(); const req = http.expectOne('/api/fornecimento-pecas'); expect(req.request.method).toBe('POST');
    req.flush({ ...c.novoFornecimento, id: 18 }); http.expectOne(req=>req.url==='/api/fornecimento-pecas/pagina').flush({content:[],totalElements:0,totalPages:1,number:0,resumo:{},opcoes:{}});
    expect(c.fornecimentoCadastrado?.peca?.id).toBe(12); expect(modais.get('modalContinuidadeEstoqueFornecedor').show).toHaveBeenCalled();
    http.expectNone(r => r.url.includes('estoque') && r.method === 'POST');
  });
});
