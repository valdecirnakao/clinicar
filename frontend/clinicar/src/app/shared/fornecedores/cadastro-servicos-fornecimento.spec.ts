import { provideZoneChangeDetection } from '@angular/core';
import { TestBed, fakeAsync, flushMicrotasks, tick } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { By } from '@angular/platform-browser';
import { FornecimentoServicoComponent } from '../../pages/menu-administrador/fornecimento-servico/fornecimento-servico.component';
import { FornecedorComponent } from '../../pages/menu-administrador/fornecedor/fornecedor.component';
import { ServicoComponent } from '../../pages/menu-administrador/servico/servico.component';

describe('Cadastros e duplicidade no fornecimento de serviços', () => {
  let http: HttpTestingController, anterior: any;
  const modais = new Map<string, any>();
  const fornecedor: any = { id: 7, razaoSocial: 'Fornecedor', cnpj: '12345678000190', ativo: true };
  const servico: any = { id: 12, nome: 'Balanceamento', categoria: 'Pneus', tipoDoPrestador: 'Fornecedor Externo', duracaoEstimada: 1, unidadeDuracao: 'HORA', valorBase: 80, unidadeCobranca: 'SERVICO', garantiaDias: 0, necessitaPecas: false, ativo: true };
  const existente: any = { id: 18, idFornecedor: 7, razaoSocialFornecedor: 'Fornecedor', idServico: 12, nomeServico: 'Balanceamento', categoriaServico: 'Pneus', valorCusto: 40, unidadeCobranca: 'SERVICO', prazoExecucao: 2, unidadePrazo: 'DIA', quantidadeMinima: 1, disponibilidade: 'SOB_DEMANDA', ativo: true };
  beforeEach(() => {
    anterior = (globalThis as any).bootstrap; modais.clear();
    (globalThis as any).bootstrap = { Modal: { getOrCreateInstance: (el: HTMLElement) => {
      if (!modais.has(el.id)) modais.set(el.id, { show: jasmine.createSpy(), hide: jasmine.createSpy(), dispose: jasmine.createSpy() });
      return modais.get(el.id);
    } } };
    TestBed.configureTestingModule({ imports: [FornecimentoServicoComponent], providers: [provideZoneChangeDetection(), provideHttpClient(), provideHttpClientTesting(), provideRouter([])] });
    http = TestBed.inject(HttpTestingController); spyOn(console, 'error');
  });
  afterEach(() => { http.verify({ ignoreCancelled: true }); (globalThis as any).bootstrap = anterior; });
  function preparar() {
    const f = TestBed.createComponent(FornecimentoServicoComponent); f.detectChanges();
    http.expectNone('/api/fornecedor');
    http.expectNone('/api/servico');
    http.expectOne(req=>req.url==='/api/fornecimento-servicos/pagina').flush({content:[existente],totalElements:1,totalPages:1,number:0,resumo:{},opcoes:{}}); f.componentInstance.abrirModalCadastro(); return f;
  }
  function duplicado(c: FornecimentoServicoComponent) {
    c.novoFornecimento = { ...existente, id: undefined };
    c.registrarDuplicidade({ model: c.novoFornecimento, estado: { duplicado: true, consultando: false, id: 18, mensagem: 'Já existe um fornecimento para este fornecedor e serviço.' } });
  }
  it('oferece novos cadastros mesmo sem resultados e filtra fornecedores e serviços inativos', () => {
    const f = preparar(), c = f.componentInstance;
    expect(c.fornecedores.length).toBe(0); expect(c.servicos.length).toBe(0);
    c.abrirModalFornecedor('cadastro'); c.fornecedorFiltro = 'Inexistente'; c.aplicarFiltroFornecedor(); f.detectChanges();
    expect(c.fornecedoresFiltrados).toEqual([]);
    expect(f.nativeElement.querySelector('#modalFornecedorFornecimentoServico .modal-footer .btn-primary').textContent).toContain('Cadastrar novo fornecedor');
    c.selecionarFornecedor({ ...fornecedor, ativo: false }); expect(c.novoFornecimento.idFornecedor).toBeFalsy();
    c.abrirModalServico('cadastro'); c.servicoFiltro = 'Inexistente'; c.aplicarFiltroServico(); f.detectChanges();
    expect(c.servicosFiltrados).toEqual([]);
    expect(f.nativeElement.querySelector('#modalServicoFornecimentoServico .modal-footer .btn-primary').textContent).toContain('Cadastrar novo serviço');
    c.selecionarServico({ ...servico, ativo: false }); expect(c.novoFornecimento.idServico).toBeFalsy();
  });
  it('reutiliza o cadastro completo do fornecedor, inicia como serviços e restaura a busca ao cancelar', async () => {
    const f = preparar(), c = f.componentInstance; c.novoFornecimento = { ...existente, valorCusto: 'R$ 60,00' }; const original = c.novoFornecimento;
    c.abrirModalFornecedor('cadastro'); c.iniciarCadastroAuxiliar('fornecedor'); f.detectChanges(); await f.whenStable(); f.detectChanges();
    const child = f.debugElement.query(By.directive(FornecedorComponent)).componentInstance as FornecedorComponent;
    expect(child.novoFornecedor.itemFornecido).toBe('Serviços automotivos');
    document.getElementById('modalCadastroFornecedor')!.dispatchEvent(new Event('hidden.bs.modal'));
    expect(c.cadastroAuxiliar).toBeNull(); expect(c.novoFornecimento).toBe(original); expect(modais.get('modalFornecedorFornecimentoServico').show).toHaveBeenCalled();
    http.expectNone(r => r.method === 'POST'); f.destroy();
  });
  it('aguarda o fechamento da seleção do fornecedor antes de retornar ao rascunho', () => {
    const c = preparar().componentInstance; c.abrirModalFornecedor('cadastro');
    const original = c.novoFornecimento; const el = document.getElementById('modalFornecedorFornecimentoServico')!;
    el.classList.add('show'); modais.get('modalCadastroFornecimentoServico').show.calls.reset();
    c.cancelarSelecaoFornecedor(); expect(modais.get('modalCadastroFornecimentoServico').show).not.toHaveBeenCalled();
    el.classList.remove('show'); el.dispatchEvent(new Event('hidden.bs.modal'));
    expect(modais.get('modalCadastroFornecimentoServico').show).toHaveBeenCalled(); expect(c.novoFornecimento).toBe(original);
  });
  it('salva o serviço no formulário completo e volta ao rascunho sem copiar preço de venda ou prazo estimado', async () => {
    const f = preparar(), c = f.componentInstance; c.selecionarFornecedor(fornecedor); c.novoFornecimento.observacoes = 'Rascunho';
    const original = c.novoFornecimento;
    c.abrirModalServico('cadastro'); c.iniciarCadastroAuxiliar('servico'); f.detectChanges();
    http.expectNone('/api/fornecedor'); await f.whenStable(); f.detectChanges();
    const child = f.debugElement.query(By.directive(ServicoComponent)).componentInstance as ServicoComponent;
    expect(child.novoServico.tipoDoPrestador).toBe('Fornecedor Externo'); expect(child.novoServico.idFornecedor).toBe(7);
    child.novoServico = { ...servico, id: undefined, idFornecedor: 7 }; child.abaCadastroServico = 'revisao'; child.salvarNovoServico(); child.salvarNovoServico();
    const req = http.expectOne('/api/servico'); expect(req.request.method).toBe('POST'); req.flush(servico);
    expect(c.novoFornecimento).toBe(original); expect(c.novoFornecimento.idServico).toBe(12);
    expect(c.novoFornecimento.observacoes).toBe('Rascunho'); expect(c.novoFornecimento.valorCusto).toBeFalsy(); expect(c.novoFornecimento.prazoExecucao).toBeFalsy();
    expect(c.abaCadastroFornecimento).toBe('condicoes'); expect(c.cadastroAuxiliar).toBeNull(); f.destroy();
  });
  it('reaproveita um serviço duplicado ativo sem criar outro ou mudar o fornecedor padrão do catálogo', async () => {
    const f = preparar(), c = f.componentInstance; c.novoFornecimento.idFornecedor = 7;
    c.abrirModalServico('cadastro'); c.iniciarCadastroAuxiliar('servico'); f.detectChanges(); http.expectNone('/api/fornecedor'); await f.whenStable();
    const child = f.debugElement.query(By.directive(ServicoComponent)).componentInstance as ServicoComponent;
    child.novoServico.nome = servico.nome; child.novoServico.categoria = servico.categoria; child.verificarDuplicidade(child.novoServico);
    http.expectOne(r => r.url === '/api/cadastros/duplicidade/servico').flush({ duplicado: true, id: 12 });
    child.usarServicoExistente(); http.expectOne('/api/servico/12').flush({ ...servico, idFornecedor: 99 });
    expect(c.novoFornecimento.idServico).toBe(12); expect(c.novoFornecimento.idFornecedor).toBe(7); http.expectNone(r => r.method === 'POST' || r.method === 'PUT'); f.destroy();
  });
  it('destaca o par duplicado, bloqueia salvar e oferece atualizar o fornecimento existente', fakeAsync(() => {
    const f = preparar(), c = f.componentInstance; c.novoFornecimento = { ...existente, id: undefined };
    const modal = document.getElementById('modalCadastroFornecimentoServico')!; modal.dispatchEvent(new Event('show.bs.modal')); f.detectChanges(); flushMicrotasks(); tick(350);
    const req = http.expectOne(r => r.url === '/api/cadastros/duplicidade/fornecimento-servico'); expect(req.request.params.get('idServico')).toBe('12');
    req.flush({ duplicado: true, id: 18, mensagem: 'Já existe um fornecimento para este fornecedor e serviço.' }); flushMicrotasks(); f.detectChanges();
    expect(modal.querySelector('#fornecedorCadastro')!.classList.contains('is-invalid')).toBeTrue(); expect(modal.querySelector('#servicoCadastro')!.classList.contains('is-invalid')).toBeTrue();
    expect(c.cadastroProntoParaSalvar).toBeFalse(); expect(modal.textContent).toContain('Atualizar fornecimento existente'); c.salvarNovoFornecimento(); http.expectNone(r => r.method === 'POST'); f.destroy();
  }));
  it('abre o vínculo inativo em condições e preserva o rascunho ao cancelar', () => {
    const c = preparar().componentInstance; duplicado(c); const original = c.novoFornecimento;
    c.atualizarFornecimentoDuplicado(); http.expectOne(req=>req.url==='/api/fornecimento-servicos/pagina' && req.params.get('tamanho')==='1').flush({content:[{ ...existente, ativo: false }]});
    expect(c.editId).toBe(18); expect(c.edit.ativo).toBeFalse(); expect(c.abaEdicaoFornecimento).toBe('condicoes');
    c.abrirModalFornecedor('edicao'); expect(modais.has('modalFornecedorFornecimentoServico')).toBeFalse();
    document.getElementById('modalEdicaoFornecimentoServico')!.dispatchEvent(new Event('hidden.bs.modal'));
    expect(c.novoFornecimento).toBe(original); expect(c.editandoExistenteNoFluxo).toBeFalse();
  });
  it('atualiza o vínculo por PUT e encerra sem solicitar controle de estoque', () => {
    const c = preparar().componentInstance; duplicado(c); c.atualizarFornecimentoDuplicado(); http.expectOne(req=>req.url==='/api/fornecimento-servicos/pagina' && req.params.get('tamanho')==='1').flush({content:[existente]});
    c.edit.valorCusto = 'R$ 55,00'; c.salvarEdicaoModal(); c.salvarEdicaoModal(); const req = http.expectOne('/api/fornecimento-servicos/18'); expect(req.request.method).toBe('PUT'); req.flush({ ...existente, valorCusto: 55 });
    http.expectOne(req=>req.url==='/api/fornecimento-servicos/pagina').flush({content:[existente],totalElements:1,totalPages:1,number:0,resumo:{},opcoes:{}}); expect(c.editandoExistenteNoFluxo).toBeFalse(); http.expectNone(r => r.url.includes('estoque') || r.method === 'POST');
  });
  it('ignora resposta de duplicidade se o usuário trocar o serviço e permite recuperar falha de consulta', () => {
    const c = preparar().componentInstance; duplicado(c); c.atualizarFornecimentoDuplicado(); c.novoFornecimento.idServico = 13;
    http.expectOne(req=>req.url==='/api/fornecimento-servicos/pagina' && req.params.get('tamanho')==='1').flush({content:[existente]}); expect(c.editId).toBeNull();
    c.novoFornecimento.idServico = 12; c.atualizarFornecimentoDuplicado(); http.expectOne(req=>req.url==='/api/fornecimento-servicos/pagina' && req.params.get('tamanho')==='1').flush('', { status: 500, statusText: 'Erro' });
    expect(c.erroAoAbrirDuplicado).toContain('Tente novamente'); expect(c.abrindoDuplicado).toBeFalse();
  });
});
