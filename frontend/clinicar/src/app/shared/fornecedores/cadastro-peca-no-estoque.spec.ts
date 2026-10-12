import { provideZoneChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { By } from '@angular/platform-browser';
import { ControleEstoquePecasComponent } from '../../pages/menu-administrador/controle-estoque-pecas/controle-estoque-pecas.component';
import { PecaComponent } from '../../pages/menu-administrador/peca/peca.component';

describe('Cadastro de peça a partir do controle de estoque', () => {
  let http: HttpTestingController;
  let anterior: any;
  const modais = new Map<string, any>();
  const peca = { id: 12, nome: 'Filtro', fabricante: 'Marca', tipo: 'Filtro', unidade: 'Unidade' };
  beforeEach(() => {
    anterior = (globalThis as any).bootstrap;
    modais.clear();
    (globalThis as any).bootstrap = { Modal: { getOrCreateInstance: (el: HTMLElement) => {
      if (!modais.has(el.id)) modais.set(el.id, {
        show: jasmine.createSpy('show'), hide: jasmine.createSpy('hide'), dispose: jasmine.createSpy('dispose')
      });
      return modais.get(el.id);
    } } };
    TestBed.configureTestingModule({ imports: [ControleEstoquePecasComponent],
      providers: [provideZoneChangeDetection(), provideHttpClient(), provideHttpClientTesting(), provideRouter([])] });
    http = TestBed.inject(HttpTestingController);
    spyOn(console, 'error');
  });
  afterEach(() => { http.verify({ ignoreCancelled: true }); (globalThis as any).bootstrap = anterior; });

  async function preparar() {
    const fixture = TestBed.createComponent(ControleEstoquePecasComponent);
    fixture.detectChanges();
    http.expectNone('/api/peca');
    http.expectOne('/api/local-estoque/ativos').flush([{ id: 3, nome: 'Prateleira', ativo: true }]);
    http.match('/api/alertas-estoque/abertos').forEach(req => req.flush([]));
    http.expectOne(req=>req.url==='/api/estoque-pecas/pagina').flush({content:[],totalElements:0,totalPages:0,number:0,resumo:{},opcoes:{}});
    fixture.componentInstance.abrirModalCadastro();
    fixture.componentInstance.abrirModalPeca('cadastro');
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture;
  }

  it('oferece cadastrar uma peça mesmo quando a busca não encontra resultados', async () => {
    const f = await preparar(), c = f.componentInstance;
    c.filtroPeca = 'Não existe'; c.aplicarFiltroPeca(); f.detectChanges();
    expect(c.pecasFiltradas).toEqual([]);
    const botao = f.nativeElement.querySelector('#modalSelecionarPecaEstoque .modal-footer .btn-primary');
    expect(botao.textContent).toContain('Cadastrar nova peça');
    botao.click(); expect(c.cadastrandoPeca).toBeTrue();
    f.destroy();
  });

  it('espera a seleção fechar antes de abrir o cadastro', async () => {
    const f = await preparar(), c = f.componentInstance;
    const el = document.getElementById('modalSelecionarPecaEstoque')!;
    el.classList.add('show'); c.cadastrarNovaPeca();
    expect(c.cadastrandoPeca).toBeFalse();
    el.classList.remove('show'); el.dispatchEvent(new Event('hidden.bs.modal'));
    expect(c.cadastrandoPeca).toBeTrue(); f.destroy();
  });

  it('reutiliza o cadastro completo, seleciona a peça salva e preserva o estoque', async () => {
    const f = await preparar(), c = f.componentInstance;
    Object.assign(c.novoEstoque, { quantidadeAtual: '100', custoMedio: 'R$ 40,00', localizacaoFisica: 'A1' });
    const rascunho = c.novoEstoque;
    c.cadastrarNovaPeca(); f.detectChanges(); await f.whenStable(); f.detectChanges();
    const child = f.debugElement.query(By.directive(PecaComponent)).componentInstance as PecaComponent;
    expect(child.cadastroIntegrado).toBeTrue();
    child.novaPeca = { nome: 'Óleo novo', fabricante: 'Marca', tipo: 'Óleo de motor', unidade: 'Litro',
      origemOleo: 'SINTETICO', viscosidadeSae: '5W30', classificacaoApi: 'SP', classificacaoAcea: 'C3', normaOem: 'OEM', modelo: 'Linha' };
    child.abaCadastroPeca = 'classificacao'; f.detectChanges();
    for (const campo of ['origemOleo', 'modelo', 'viscosidadeSae', 'classificacaoApi', 'classificacaoAcea', 'normaOem'])
      expect(f.nativeElement.querySelector(`#${campo}PecaCadastro`)).withContext(campo).not.toBeNull();
    child.salvarNovaPeca();
    const req = http.expectOne('/api/peca'); expect(req.request.method).toBe('POST');
    req.flush({ ...req.request.body, id: 13 });
    expect(c.novoEstoque).toBe(rascunho);
    expect(c.novoEstoque).toEqual(jasmine.objectContaining({ idPeca: 13, unidadePeca: 'Litro',
      quantidadeAtual: '100', custoMedio: 'R$ 40,00', localizacaoFisica: 'A1', idLocalEstoque: 3 }));
    expect(c.pecas.some(item => item.id === 13)).toBeTrue();
    expect(c.cadastrandoPeca).toBeFalse();
    expect(modais.get('modalCadastroEstoquePeca').show).toHaveBeenCalledTimes(2);
    expect(modais.has('modalFornecedorDaPeca')).toBeFalse();
    http.expectNone(req => req.url === '/api/estoque-pecas' && req.method === 'POST');
    f.destroy();
  });

  it('cancelar retorna à seleção mantendo todos os dados', async () => {
    const f = await preparar(), c = f.componentInstance;
    c.novoEstoque.quantidadeAtual = '7';
    const original = { ...c.novoEstoque };
    c.cadastrarNovaPeca(); f.detectChanges(); await f.whenStable();
    document.getElementById('modalCadastroPeca')!.dispatchEvent(new Event('hidden.bs.modal'));
    expect(c.cadastrandoPeca).toBeFalse(); expect(c.novoEstoque).toEqual(original);
    expect(modais.get('modalSelecionarPecaEstoque').show).toHaveBeenCalledTimes(2);
    http.expectNone(req => req.method === 'POST'); f.destroy();
  });

  it('falha ao salvar mantém o cadastro da peça aberto e não altera o estoque', async () => {
    const f = await preparar(), c = f.componentInstance;
    const original = { ...c.novoEstoque };
    c.cadastrarNovaPeca(); f.detectChanges(); await f.whenStable();
    const child = f.debugElement.query(By.directive(PecaComponent)).componentInstance as PecaComponent;
    child.novaPeca = { ...peca, id: undefined }; child.salvarNovaPeca();
    http.expectOne('/api/peca').flush({ mensagem: 'Falha no cadastro' }, { status: 500, statusText: 'Erro' });
    expect(c.cadastrandoPeca).toBeTrue(); expect(c.novoEstoque).toEqual(original);
    expect(child.mensagemErroModal).toContain('Falha no cadastro'); f.destroy();
  });

  it('não oferece cadastro auxiliar para edição ou peça fixada pelo fornecimento', async () => {
    const f = await preparar(), c = f.componentInstance;
    c.modoSelecaoPeca = 'edicao'; f.detectChanges();
    expect(f.nativeElement.querySelector('#modalSelecionarPecaEstoque .modal-footer .btn-primary')).toBeNull();
    c.cadastrarNovaPeca(); expect(c.cadastrandoPeca).toBeFalse();
    c.modoSelecaoPeca = 'cadastro'; c.pecaContinuidade = peca;
    c.cadastrarNovaPeca(); expect(c.cadastrandoPeca).toBeFalse(); f.destroy();
  });

  it('marca os obrigatórios desde a abertura nas duas guias do cadastro integrado', async () => {
    const f = await preparar(), c = f.componentInstance;
    c.cadastrarNovaPeca(); f.detectChanges(); await f.whenStable(); f.detectChanges();
    const child = f.debugElement.query(By.directive(PecaComponent)).componentInstance as PecaComponent;
    for (const campo of ['nome', 'fabricante', 'unidade'])
      expect(f.nativeElement.querySelector(`#${campo}PecaCadastro`).classList.contains('is-invalid')).withContext(campo).toBeTrue();
    child.abaCadastroPeca = 'classificacao'; f.detectChanges();
    expect(f.nativeElement.querySelector('#tipoPecaCadastro').classList.contains('is-invalid')).toBeTrue();
    child.novaPeca.tipo = 'Óleo de motor'; f.detectChanges();
    for (const campo of ['origemOleo', 'viscosidadeSae'])
      expect(f.nativeElement.querySelector(`#${campo}PecaCadastro`).classList.contains('is-invalid')).withContext(campo).toBeTrue();
    child.novaPeca.origemOleo = 'SINTETICO'; child.novaPeca.viscosidadeSae = '5W30'; f.detectChanges();
    expect(f.nativeElement.querySelector('#viscosidadeSaePecaCadastro').classList.contains('is-invalid')).toBeFalse();
    f.destroy();
  });
});
