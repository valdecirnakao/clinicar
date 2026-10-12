import { provideZoneChangeDetection } from '@angular/core';
import { TestBed, fakeAsync, flushMicrotasks, tick } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { FornecimentoPecasComponent } from '../../pages/menu-administrador/fornecimento-pecas/fornecimento-pecas.component';

describe('Atualização de um fornecimento duplicado', () => {
  let http: HttpTestingController;
  let anterior: any;
  const modais = new Map<string, any>();
  const fornecedor: any = { id: 7, razaoSocial: 'Fornecedor', ativo: true };
  const peca = { id: 12, nome: 'Filtro', fabricante: 'Marca', tipo: 'Filtro', unidade: 'Unidade' };
  const existente: any = { id: 18, fornecedor, peca, valorCusto: 40, prazoEntregaDias: 2, quantidadeMinima: 1, ativo: true, dataCadastro: '2026-10-04' };
  const mensagem = 'Já existe um fornecimento para este fornecedor e peça. Edite as condições do fornecimento existente.';
  beforeEach(() => {
    anterior = (globalThis as any).bootstrap; modais.clear();
    (globalThis as any).bootstrap = { Modal: { getOrCreateInstance: (el: HTMLElement) => {
      if (!modais.has(el.id)) modais.set(el.id, { show: jasmine.createSpy(), hide: jasmine.createSpy() });
      return modais.get(el.id);
    } } };
    TestBed.configureTestingModule({ imports: [FornecimentoPecasComponent], providers: [provideZoneChangeDetection(), provideHttpClient(), provideHttpClientTesting(), provideRouter([])] });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => { http.verify({ ignoreCancelled: true }); (globalThis as any).bootstrap = anterior; });
  function preparar() {
    const fixture = TestBed.createComponent(FornecimentoPecasComponent); fixture.detectChanges();
    http.expectOne(r=>r.url==='/api/fornecimento-pecas/pagina').flush({content:[existente],totalElements:1,totalPages:1,number:0,resumo:{total:1},opcoes:{}}); http.expectNone('/api/fornecedor'); http.expectNone('/api/peca');
    const c = fixture.componentInstance; c.abrirModalCadastro();
    c.novoFornecimento = { ...existente, id: undefined };
    return fixture;
  }
  function duplicado(c: FornecimentoPecasComponent) {
    c.registrarDuplicidade({ model: c.novoFornecimento, estado: { duplicado: true, id: 18, consultando: false, mensagem } });
  }
  it('valida o par no servidor, destaca ambos os campos, bloqueia salvar e oferece atualizar', fakeAsync(() => {
    const fixture = preparar(), c = fixture.componentInstance;
    const modal = fixture.nativeElement.querySelector('#modalCadastroFornecimento'); modal.dispatchEvent(new Event('show.bs.modal'));
    fixture.detectChanges(); flushMicrotasks(); tick(350);
    const req = http.expectOne(r => r.url === '/api/cadastros/duplicidade/fornecimento-peca');
    expect(req.request.params.get('idFornecedor')).toBe('7'); expect(req.request.params.get('idPeca')).toBe('12');
    req.flush({ duplicado: true, id: 18, mensagem }); flushMicrotasks(); fixture.detectChanges();
    expect(modal.querySelector('#fornecedorCadastroInput').classList.contains('is-invalid-box')).toBeTrue();
    expect(modal.querySelector('#pecaCadastroInput').classList.contains('is-invalid-box')).toBeTrue();
    expect(c.cadastroProntoParaSalvar).toBeFalse(); c.salvarNovoFornecimento(); http.expectNone(r => r.method === 'POST');
    expect(modal.textContent).toContain('Atualizar fornecimento existente');
    c.novoFornecimento.peca = { ...peca, id: 13 }; fixture.detectChanges(); flushMicrotasks(); tick(350);
    http.expectOne(r => r.params.get('idPeca') === '13').flush({ duplicado: false, id: null, mensagem: '' }); flushMicrotasks(); fixture.detectChanges();
    expect(c.fornecimentoNovoDuplicado).toBeFalse(); expect(c.cadastroProntoParaSalvar).toBeTrue(); fixture.destroy();
  }));
  it('abre o registro atual em condições, preserva o rascunho ao cancelar e não cria outro vínculo', () => {
    const fixture = preparar(), c = fixture.componentInstance; duplicado(c); c.novoFornecimento.valorCusto = 'R$ 60,00';
    const original = c.novoFornecimento; c.atualizarFornecimentoDuplicado();
    http.expectOne(req=>req.url==='/api/fornecimento-pecas/pagina' && req.params.get('tamanho')==='1').flush({content:[{ ...existente, valorCusto: 45 }]});
    expect(c.editId).toBe(18); expect(c.abaEdicaoFornecimento).toBe('condicoes'); expect(c.edit.valorCusto).toContain('45');
    expect(c.editandoExistenteNoFluxo).toBeTrue(); document.getElementById('modalEdicaoFornecimento')!.dispatchEvent(new Event('hidden.bs.modal'));
    expect(c.novoFornecimento).toBe(original); expect(c.novoFornecimento.valorCusto).toBe('R$ 60,00'); expect(c.editandoExistenteNoFluxo).toBeFalse();
    expect(modais.get('modalCadastroFornecimento').show).toHaveBeenCalled(); http.expectNone(r => r.method === 'POST');
  });
  it('atualiza o fornecimento existente por PUT e mantém a continuação ao estoque', () => {
    const c = preparar().componentInstance; duplicado(c); c.atualizarFornecimentoDuplicado(); http.expectOne(req=>req.url==='/api/fornecimento-pecas/pagina' && req.params.get('tamanho')==='1').flush({content:[existente]});
    c.edit.valorCusto = 'R$ 55,00'; c.salvarEdicaoModal(); const req = http.expectOne('/api/fornecimento-pecas/18'); expect(req.request.method).toBe('PUT'); req.flush({ ...existente, valorCusto: 55 });
    http.expectOne(r=>r.url==='/api/fornecimento-pecas/pagina').flush({content:[{...existente,valorCusto:55}],totalElements:1,totalPages:1,number:0,resumo:{total:1},opcoes:{}});
    expect(c.fornecimentoCadastrado?.id).toBe(18); expect(modais.get('modalContinuidadeEstoqueFornecedor').show).toHaveBeenCalled();
    http.expectNone(r => r.method === 'POST');
  });
  it('permite abrir o fornecimento inativo para atualizar suas condições e status', () => {
    const c = preparar().componentInstance; duplicado(c); c.atualizarFornecimentoDuplicado(); http.expectOne(req=>req.url==='/api/fornecimento-pecas/pagina' && req.params.get('tamanho')==='1').flush({content:[{ ...existente, ativo: false }]});
    expect(c.editId).toBe(18); expect(c.edit.ativo).toBeFalse(); expect(c.fornecimentoNovoDuplicado).toBeTrue(); http.expectNone(r => r.method === 'POST');
  });
  it('mantém o formulário e permite nova tentativa quando o registro não pode ser carregado', () => {
    const c = preparar().componentInstance; duplicado(c); c.atualizarFornecimentoDuplicado();
    http.expectOne(req=>req.url==='/api/fornecimento-pecas/pagina' && req.params.get('tamanho')==='1').flush('Falha', { status: 500, statusText: 'Erro' });
    expect(c.abrindoDuplicado).toBeFalse(); expect(c.erroAoAbrirDuplicado).toContain('Tente novamente'); expect(c.editId).toBeNull();
    c.atualizarFornecimentoDuplicado(); http.expectOne(req=>req.url==='/api/fornecimento-pecas/pagina' && req.params.get('tamanho')==='1').flush({content:[]}); expect(c.erroAoAbrirDuplicado).toContain('não foi localizado');
  });
  it('ignora a resposta se o usuário trocar a peça durante a consulta', () => {
    const c = preparar().componentInstance; duplicado(c); c.atualizarFornecimentoDuplicado(); c.novoFornecimento.peca = { ...peca, id: 13 };
    http.expectOne(req=>req.url==='/api/fornecimento-pecas/pagina' && req.params.get('tamanho')==='1').flush({content:[existente]}); expect(c.editId).toBeNull(); expect(c.abrindoDuplicado).toBeFalse();
  });
  it('não reabre um formulário se o usuário fechar o cadastro durante a consulta', () => {
    const c = preparar().componentInstance; duplicado(c);
    const el = document.getElementById('modalCadastroFornecimento')!; el.classList.add('show'); c.atualizarFornecimentoDuplicado();
    el.classList.remove('show'); http.expectOne(req=>req.url==='/api/fornecimento-pecas/pagina' && req.params.get('tamanho')==='1').flush({content:[existente]});
    expect(c.editId).toBeNull(); expect(c.abrindoDuplicado).toBeFalse();
  });
});
