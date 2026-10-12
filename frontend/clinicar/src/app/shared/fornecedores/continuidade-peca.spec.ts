import { provideZoneChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { FornecedorComponent } from '../../pages/menu-administrador/fornecedor/fornecedor.component';
import { PecaComponent } from '../../pages/menu-administrador/peca/peca.component';
import { FornecimentoPecasComponent } from '../../pages/menu-administrador/fornecimento-pecas/fornecimento-pecas.component';

describe('Continuidade peça → fornecedor → fornecimento', () => {
  let http: HttpTestingController;
  let navegar: jasmine.Spy;
  let anterior: any;
  const params: Record<string, string> = {};
  const modais = new Map<string, any>();
  const peca = { id: 12, nome: 'Filtro', fabricante: 'Marca', tipo: 'Filtro', unidade: 'Unidade' };
  const fornecedor: any = { id: 7, razaoSocial: 'Fornecedor ativo', cnpj: '12345678000190', ativo: true };
  const fornecimento: any = { id: 18, fornecedor, peca, ativo: true, valorCusto: 50, prazoEntregaDias: 2, quantidadeMinima: 1, dataCadastro: '2026-10-04' };
  beforeEach(() => {
    anterior = (globalThis as any).bootstrap;
    modais.clear(); Object.keys(params).forEach(k => delete params[k]);
    (globalThis as any).bootstrap = { Modal: { getOrCreateInstance: (el: HTMLElement) => {
      if (!modais.has(el.id)) modais.set(el.id, { show: jasmine.createSpy('show'), hide: jasmine.createSpy('hide') });
      return modais.get(el.id);
    } } };
    TestBed.configureTestingModule({ imports: [FornecedorComponent, PecaComponent, FornecimentoPecasComponent],
      providers: [provideZoneChangeDetection(), provideHttpClient(), provideHttpClientTesting(), provideRouter([]), {
        provide: ActivatedRoute, useValue: { snapshot: { get queryParamMap() { return convertToParamMap(params); } } }
      }] });
    http = TestBed.inject(HttpTestingController);
    navegar = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    spyOn(console, 'error');
  });
  afterEach(() => { http.verify({ ignoreCancelled: true }); (globalThis as any).bootstrap = anterior; });

  function prepararFornecedor() {
    Object.assign(params, { continuarPeca: '1', pecaId: '12' });
    const fixture = TestBed.createComponent(FornecedorComponent); fixture.detectChanges();
    http.match('/api/fornecedor').forEach(r => r.flush([fornecedor, { ...fornecedor, id: 8, ativo: false }]));
    http.expectOne('/api/peca/12').flush(peca);
    http.expectOne(r=>r.url==='/api/fornecedor/pagina').flush({content:[fornecedor],totalElements:1,totalPages:1,number:0,resumo:{total:1},opcoes:{}});
    return fixture;
  }
  function prepararFornecimento(item = fornecimento) {
    Object.assign(params, { continuarCadastro: '1', fornecedorId: '7', pecaId: '12' });
    const fixture = TestBed.createComponent(FornecimentoPecasComponent);
    fixture.componentInstance.iniciarFornecimentoDoFornecedor();
    http.expectOne('/api/fornecedor/7').flush(fornecedor);
    http.expectOne('/api/fornecedor').flush([fornecedor]);
    http.expectOne('/api/peca').flush([peca]);
    http.expectOne('/api/fornecimento-pecas').flush(item ? [item] : []);
    return fixture;
  }
  it('oferece a continuação somente depois de salvar a peça e não cria vínculos automaticamente', () => {
    const fixture = TestBed.createComponent(PecaComponent); const c = fixture.componentInstance;
    c.novaPeca = { ...peca, id: undefined }; c.salvarNovaPeca();
    expect(modais.has('modalFornecedorDaPeca')).toBeFalse();
    http.expectOne('/api/peca').flush(peca);
    http.expectOne('/api/peca').flush([peca]);
    expect(modais.get('modalFornecedorDaPeca').show).toHaveBeenCalled();
    expect(c.pecaCadastrada?.id).toBe(12);
    c.continuarFornecedorDaPeca();
    expect(navegar).toHaveBeenCalledWith(['/menuAdministrador/fornecedor'], { queryParams: { continuarPeca: '1', pecaId: 12 } });
    http.expectNone(r => r.method === 'POST');
  });
  it('mostra somente fornecedores ativos e mantém a peça ao selecionar', () => {
    const c = prepararFornecedor().componentInstance;
    expect(c.fornecedoresAtivosDaPeca.map(f => f.id)).toEqual([7]);
    c.buscaFornecedorPeca = 'não existe'; expect(c.fornecedoresAtivosDaPeca).toEqual([]);
    c.selecionarFornecedorDaPeca(fornecedor);
    expect(navegar).toHaveBeenCalledWith(['/menuAdministrador', 'fornecimentoPecas'], { queryParams: { continuarCadastro: '1', fornecedorId: 7, pecaId: 12 } });
    http.expectNone(r => r.method === 'POST');
  });
  it('retorna à escolha ao cancelar o cadastro do fornecedor, preservando a peça', () => {
    const c = prepararFornecedor().componentInstance;
    c.cadastrarFornecedorDaPeca();
    expect(c.novoFornecedor.ativo).toBeTrue();
    modais.get('modalFornecedorPeca').show.calls.reset();
    document.getElementById('modalCadastroFornecedor')!.dispatchEvent(new Event('hidden.bs.modal'));
    expect(modais.get('modalFornecedorPeca').show).toHaveBeenCalled(); expect(c.pecaFluxo?.id).toBe(12);
  });
  it('salva o fornecedor e segue para a peça original sem pedir outra peça', () => {
    const c = prepararFornecedor().componentInstance; c.cadastrarFornecedorDaPeca();
    spyOn<any>(c, 'validarFornecedor').and.returnValue(null);
    c.novoFornecedor = { ...fornecedor, id: undefined }; navegar.calls.reset(); c.salvarNovoFornecedor();
    const req = http.expectOne('/api/fornecedor'); expect(req.request.method).toBe('POST'); req.flush(fornecedor);
    http.expectOne(r=>r.url==='/api/fornecedor/pagina').flush({content:[fornecedor],totalElements:1,totalPages:1,number:0,resumo:{total:1},opcoes:{}});
    expect(navegar).toHaveBeenCalledWith(['/menuAdministrador', 'fornecimentoPecas'], { queryParams: { continuarCadastro: '1', fornecedorId: 7, pecaId: 12 } });
    expect(modais.has('modalContinuidadeFornecedor')).toBeFalse();
  });
  it('não consome o contexto quando a peça não pode ser carregada', () => {
    params['continuarPeca'] = '1'; params['pecaId'] = '12abc';
    const fixture = TestBed.createComponent(FornecedorComponent); fixture.componentInstance.iniciarFornecedorDaPeca();
    http.match('/api/fornecedor').forEach(r => r.flush([]));
    http.expectNone('/api/peca/12abc'); expect(navegar).not.toHaveBeenCalled();
    expect(fixture.componentInstance.pecaFluxo).toBeNull();
  });
  it('reaproveita o fornecimento existente e confirma disponibilidade antes de seguir ao estoque', () => {
    const c = prepararFornecimento().componentInstance;
    expect(c.fornecimentoExistente?.id).toBe(18);
    expect(modais.get('modalFornecimentoExistente').show).toHaveBeenCalled();
    expect(modais.get('modalCadastroFornecimento').show).not.toHaveBeenCalled();
    c.usarFornecimentoExistente();
    http.expectOne('/api/fornecimento-pecas/18').flush(fornecimento); http.expectOne('/api/fornecedor/7').flush(fornecedor);
    expect(modais.get('modalContinuidadeEstoqueFornecedor').show).toHaveBeenCalled();
    expect(c.fornecimentoCadastrado?.peca?.id).toBe(12); http.expectNone(r => r.method === 'POST');
  });
  it('bloqueia fornecimento inativo e retorna ao mesmo vínculo após editar', () => {
    const c = prepararFornecimento({ ...fornecimento, ativo: false }).componentInstance;
    c.usarFornecimentoExistente(); http.expectNone(() => true);
    c.editarFornecimentoExistente();
    expect(c.editId).toBe(18);
    modais.get('modalFornecimentoExistente').show.calls.reset();
    document.getElementById('modalEdicaoFornecimento')!.dispatchEvent(new Event('hidden.bs.modal'));
    expect(modais.get('modalFornecimentoExistente').show).toHaveBeenCalled();
  });
  it('não segue ao estoque se o fornecedor foi inativado enquanto o modal estava aberto', () => {
    const c = prepararFornecimento().componentInstance; c.usarFornecimentoExistente();
    http.expectOne('/api/fornecimento-pecas/18').flush(fornecimento); http.expectOne('/api/fornecedor/7').flush({ ...fornecedor, ativo: false });
    expect(c.erroFornecimentoExistente).toContain('não está mais disponível');
    expect(modais.has('modalContinuidadeEstoqueFornecedor')).toBeFalse();
  });
  it('preserva o vínculo durante a edição e segue ao estoque após salvar as condições', () => {
    const c = prepararFornecimento().componentInstance;
    c.editarFornecimentoExistente();
    c.abrirModalFornecedor('edicao'); c.abrirModalPeca('edicao');
    expect(modais.has('modalFornecedor')).toBeFalse(); expect(modais.has('modalPeca')).toBeFalse();
    c.edit.valorCusto = 'R$ 60,00'; c.salvarEdicaoModal();
    const req = http.expectOne('/api/fornecimento-pecas/18'); expect(req.request.method).toBe('PUT');
    req.flush({ ...fornecimento, valorCusto: 60 });
    http.expectOne('/api/fornecimento-pecas').flush([{ ...fornecimento, valorCusto: 60 }]);
    expect(c.fornecimentoCadastrado?.id).toBe(18); expect(c.fornecimentoCadastrado?.peca?.id).toBe(12);
    expect(modais.get('modalContinuidadeEstoqueFornecedor').show).toHaveBeenCalled();
    http.expectNone(r => r.method === 'POST');
  });
  it('permite voltar à escolha do fornecedor sem alterar o fornecimento', () => {
    const c = prepararFornecimento().componentInstance; c.voltarAosFornecedores('existente');
    expect(navegar).toHaveBeenCalledWith(['/menuAdministrador/fornecedor'], { queryParams: { continuarPeca: '1', pecaId: 12 } });
    http.expectNone(r => r.method !== 'GET');
  });
});
