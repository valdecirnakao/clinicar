import { provideZoneChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { ControleEstoquePecasComponent } from '../../pages/menu-administrador/controle-estoque-pecas/controle-estoque-pecas.component';
import { FornecimentoPecasComponent } from '../../pages/menu-administrador/fornecimento-pecas/fornecimento-pecas.component';

describe('Continuidade fornecimento → controle de estoque', () => {
  let http: HttpTestingController;
  let navegar: jasmine.Spy;
  let bootstrapAnterior: any;
  const params: Record<string, string> = {};
  const modais = new Map<string, { show: jasmine.Spy; hide: jasmine.Spy }>();
  const peca = { id: 12, nome: 'Óleo teste', fabricante: 'Marca', modelo: 'Linha', unidade: 'Litro' };
  const local = { id: 3, nome: 'Prateleira', ativo: true };

  beforeEach(() => {
    bootstrapAnterior = (globalThis as any).bootstrap;
    modais.clear();
    (globalThis as any).bootstrap = { Modal: { getOrCreateInstance: (el: HTMLElement) => {
      if (!modais.has(el.id)) modais.set(el.id, { show: jasmine.createSpy('show'), hide: jasmine.createSpy('hide') });
      return modais.get(el.id);
    } } };
    Object.keys(params).forEach(key => delete params[key]);
    Object.assign(params, { continuarEstoque: '1', pecaId: '12' });
    TestBed.configureTestingModule({
      imports: [ControleEstoquePecasComponent, FornecimentoPecasComponent],
      providers: [provideZoneChangeDetection(), provideHttpClient(), provideHttpClientTesting(), provideRouter([]), {
        provide: ActivatedRoute, useValue: { snapshot: { get queryParamMap() { return convertToParamMap(params); } } }
      }]
    });
    http = TestBed.inject(HttpTestingController);
    navegar = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    spyOn(console, 'error');
  });
  afterEach(() => { http.verify({ ignoreCancelled: true }); (globalThis as any).bootstrap = bootstrapAnterior; });

  function prepararEstoque(estoques: any[] = [], pecas: any[] = [peca]) {
    const fixture = TestBed.createComponent(ControleEstoquePecasComponent);
    fixture.detectChanges();
    http.expectOne('/api/peca/12').flush(pecas[0]??null);
    http.expectOne('/api/local-estoque/ativos').flush([local]);
    http.expectOne(req=>req.url==='/api/estoque-pecas/por-peca' && req.params.get('pecaId')==='12').flush(estoques);
    http.expectOne('/api/alertas-estoque/abertos').flush([]);
    fixture.detectChanges();
    return fixture;
  }

  it('abre o formulário completo com a peça preenchida, sem transformar o fornecimento em entrada', () => {
    const fixture = prepararEstoque();
    const c = fixture.componentInstance;
    expect(c.novoEstoque).toEqual(jasmine.objectContaining({ idPeca: 12, nomePeca: 'Óleo teste', unidadePeca: 'Litro', quantidadeAtual: '0', quantidadeReservada: '0', custoMedio: '' }));
    expect(modais.get('modalCadastroEstoquePeca')!.show).toHaveBeenCalled();
    expect(navegar).toHaveBeenCalledWith([], jasmine.objectContaining({ replaceUrl: true, queryParams: { continuarEstoque: null, pecaId: null } }));
    const botao = fixture.nativeElement.querySelector('#modalCadastroEstoquePeca button[disabled]');
    expect(botao).not.toBeNull();
    c.abrirModalPeca('cadastro'); expect(modais.has('modalSelecionarPecaEstoque')).toBeFalse();
    http.expectNone(req => req.method === 'POST');
  });

  it('identifica controles existentes e impede duplicar a peça no mesmo local', () => {
    const fixture = prepararEstoque([{ id: 8, idPeca: 12, idLocalEstoque: 3, nomeLocalEstoque: 'Prateleira', quantidadeAtual: 10 }]);
    const c = fixture.componentInstance;
    expect(c.estoquesDaPeca.length).toBe(1);
    expect(c.novoEstoque.idLocalEstoque).toBeUndefined();
    c.novoEstoque.idLocalEstoque = 3;
    expect(c.estoqueCampoInvalido(c.novoEstoque, 'idLocalEstoque', true)).toBeTrue();
    expect(c.mensagemBloqueioCadastro).toContain('Já existe controle');
    c.salvarNovoEstoque(); http.expectNone(req => req.method === 'POST');
    const detalhes = spyOn(c, 'abrirDetalhes');
    c.consultarEstoqueExistente(c.estoquesDaPeca[0]);
    expect(detalhes).toHaveBeenCalledWith(c.estoquesDaPeca[0]);
  });

  it('mantém o contexto para nova tentativa se a peça não existir', () => {
    const fixture = prepararEstoque([], []);
    expect(fixture.componentInstance.errorMsg).toContain('não foi encontrada');
    expect(navegar).not.toHaveBeenCalled();
    expect(modais.has('modalCadastroEstoquePeca')).toBeFalse();
  });

  it('não abre o formulário sem confirmar o carregamento dos controles existentes', () => {
    const fixture = TestBed.createComponent(ControleEstoquePecasComponent);
    fixture.detectChanges();
    http.expectOne('/api/peca/12').flush(peca);
    http.expectOne('/api/local-estoque/ativos').flush([local]);
    http.expectOne(req=>req.url==='/api/estoque-pecas/por-peca' && req.params.get('pecaId')==='12').flush('Falha', { status: 500, statusText: 'Falha' });
    expect(fixture.componentInstance.loading).toBeFalse();
    expect(fixture.componentInstance.errorMsg).not.toBe('');
    expect(navegar).not.toHaveBeenCalled();
    expect(modais.has('modalCadastroEstoquePeca')).toBeFalse();
  });

  it('rejeita identificadores inválidos sem consultar ou abrir o estoque', () => {
    params['pecaId'] = '12abc';
    const fixture = TestBed.createComponent(ControleEstoquePecasComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance.errorMsg).toContain('identificar a peça');
    http.expectNone(() => true);
  });

  function prepararFornecimento() {
    Object.keys(params).forEach(key => delete params[key]);
    const fixture = TestBed.createComponent(FornecimentoPecasComponent);
    fixture.detectChanges();
    http.match(req => req.method === 'GET').forEach(req => req.flush([]));
    fixture.componentInstance.novoFornecimento = { fornecedor: { id: 7, razaoSocial: 'Fornecedor' }, peca, valorCusto: '20', prazoEntregaDias: '0', quantidadeMinima: '1', ativo: true, dataCadastro: '2026-10-04' };
    return fixture;
  }

  it('oferece a continuação somente depois do sucesso e evita dois salvamentos simultâneos', async () => {
    const fixture = prepararFornecimento();
    const c = fixture.componentInstance;
    c.salvarNovoFornecimento(); c.salvarNovoFornecimento();
    expect(modais.has('modalContinuidadeEstoqueFornecedor')).toBeFalse();
    http.expectOne(req => req.method === 'POST').flush({ id: 21, fornecedor: { id: 7, razaoSocial: 'Fornecedor' }, peca, valorCusto: 20, prazoEntregaDias: 0, quantidadeMinima: 1, ativo: true, dataCadastro: '2026-10-04' });
    http.match(req => req.method === 'GET').forEach(req => req.flush([]));
    expect(modais.get('modalContinuidadeEstoqueFornecedor')!.show).toHaveBeenCalled();
    expect(navegar).not.toHaveBeenCalled();
    c.continuarCadastroEstoque(); await fixture.whenStable();
    expect(modais.get('modalContinuidadeEstoqueFornecedor')!.hide).toHaveBeenCalled();
    expect(navegar).toHaveBeenCalledWith(['/menuAdministrador/controleEstoquePecas'], { queryParams: { continuarEstoque: '1', pecaId: 12 } });
  });

  it('mantém o fornecimento em edição e não oferece estoque em caso de falha ao salvar', () => {
    const fixture = prepararFornecimento();
    fixture.componentInstance.salvarNovoFornecimento();
    http.expectOne(req => req.method === 'POST').flush('Falha ao salvar', { status: 500, statusText: 'Falha' });
    expect(fixture.componentInstance.salvandoCadastro).toBeFalse();
    expect(fixture.componentInstance.mensagemErroModal).not.toBe('');
    expect(modais.has('modalContinuidadeEstoqueFornecedor')).toBeFalse();
    expect(navegar).not.toHaveBeenCalled();
  });
});
