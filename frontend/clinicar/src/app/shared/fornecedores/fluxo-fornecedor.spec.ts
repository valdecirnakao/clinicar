import { provideZoneChangeDetection } from '@angular/core';
import { DestroyRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { FluxoFornecedorService } from './fluxo-fornecedor.service';
import { aposFecharModal } from './transicao-modal';

describe('Continuidade do cadastro de fornecedor', () => {
  let fluxo: FluxoFornecedorService;
  let http: HttpTestingController;
  let navegar: jasmine.Spy;
  const rota = (params: Record<string, string>) => ({ snapshot: { queryParamMap: convertToParamMap(params) } }) as ActivatedRoute;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideZoneChangeDetection(), provideHttpClient(), provideHttpClientTesting(), provideRouter([])] });
    fluxo = TestBed.inject(FluxoFornecedorService);
    http = TestBed.inject(HttpTestingController);
    navegar = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
  });
  afterEach(() => http.verify());

  for (const tipo of ['peca', 'servico'] as const) {
    it(`direciona ${tipo} existente para o fornecimento e novo item para o cadastro`, () => {
      fluxo.iniciar(tipo, false, 7);
      expect(navegar.calls.mostRecent().args).toEqual([
        ['/menuAdministrador', tipo === 'peca' ? 'fornecimentoPecas' : 'fornecimentoServico'],
        { queryParams: { continuarCadastro: '1', fornecedorId: 7 } }
      ]);
      fluxo.iniciar(tipo, true, 7);
      expect(navegar.calls.mostRecent().args[0]).toEqual(['/menuAdministrador', tipo === 'peca' ? 'peca' : 'servico']);
    });
    it(`leva o identificador da nova ${tipo} e do fornecedor ao fornecimento`, () => {
      fluxo.continuarComItem(tipo, 7, 12);
      expect(navegar.calls.mostRecent().args[1].queryParams).toEqual({ continuarCadastro: '1', fornecedorId: 7, [tipo === 'peca' ? 'pecaId' : 'servicoId']: 12 });
    });
  }

  it('busca o fornecedor persistido com credenciais e recupera o item', () => {
    let resultado: any;
    fluxo.carregarContexto(rota({ continuarCadastro: '1', fornecedorId: '7', pecaId: '12' }), 'peca').subscribe(valor => resultado = valor);
    const req = http.expectOne('/api/fornecedor/7');
    expect(req.request.withCredentials).toBeTrue();
    req.flush({ id: 7, razaoSocial: 'Fornecedor teste' });
    expect(resultado.fornecedor.id).toBe(7);
    expect(resultado.itemId).toBe(12);
  });
  it('não inicia o fluxo nas visitas normais', () => {
    fluxo.carregarContexto(rota({ fornecedorId: '7' }), 'peca').subscribe(valor => expect(valor).toBeNull());
    http.expectNone('/api/fornecedor/7');
  });
  it('rejeita identificadores inválidos sem consultar a API', () => {
    for (const id of ['0', '-1', '1e2', 'NaN']) {
      let falhou = false;
      fluxo.carregarContexto(rota({ continuarCadastro: '1', fornecedorId: id }), 'peca').subscribe({ error: () => falhou = true });
      expect(falhou).toBeTrue();
    }
  });
  it('remove somente o contexto de continuidade da URL para não reabrir ao atualizar', () => {
    const atual = rota({ continuarCadastro: '1', fornecedorId: '7', pecaId: '12' });
    fluxo.consumirContexto(atual);
    expect(navegar).toHaveBeenCalledWith([], {
      relativeTo: atual, replaceUrl: true, queryParamsHandling: 'merge',
      queryParams: { continuarCadastro: null, fornecedorId: null, pecaId: null, servicoId: null }
    });
  });
});

describe('Transição entre modais do cadastro', () => {
  it('aguarda o fechamento completo e executa a continuação uma única vez', () => {
    const el = document.createElement('div');
    el.id = 'modalTesteContinuidade'; el.classList.add('show'); document.body.appendChild(el);
    const continuar = jasmine.createSpy();
    const hide = jasmine.createSpy();
    const destroyRef = { onDestroy: () => () => {} } as unknown as DestroyRef;
    aposFecharModal(el.id, { hide }, continuar, destroyRef);
    expect(hide).toHaveBeenCalled(); expect(continuar).not.toHaveBeenCalled();
    el.dispatchEvent(new Event('hidden.bs.modal'));
    el.dispatchEvent(new Event('hidden.bs.modal'));
    expect(continuar).toHaveBeenCalledTimes(1);
    el.remove();
  });
  it('cancela a continuação quando o componente é destruído', () => {
    const el = document.createElement('div'); el.id = 'modalTesteDestruido'; el.classList.add('show'); document.body.appendChild(el);
    let destruir = () => {};
    const destroyRef = { onDestroy: (callback: () => void) => { destruir = callback; return () => {}; } } as unknown as DestroyRef;
    const continuar = jasmine.createSpy();
    aposFecharModal(el.id, { hide: () => {} }, continuar, destroyRef);
    destruir(); el.dispatchEvent(new Event('hidden.bs.modal'));
    expect(continuar).not.toHaveBeenCalled(); el.remove();
  });
});
