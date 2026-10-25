import { provideZoneChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { FornecimentoPecasComponent } from '../../pages/menu-administrador/fornecimento-pecas/fornecimento-pecas.component';
import { FornecimentoServicoComponent } from '../../pages/menu-administrador/fornecimento-servico/fornecimento-servico.component';
import { PecaComponent } from '../../pages/menu-administrador/peca/peca.component';
import { ServicoComponent } from '../../pages/menu-administrador/servico/servico.component';
import { Fornecedor } from '../../pages/menu-administrador/fornecedor/fornecedor.service';

describe('Preenchimento da continuidade fornecedor → item → fornecimento', () => {
  let http: HttpTestingController;
  let navegar: jasmine.Spy;
  let bootstrapAnterior: any;
  const fornecedor = { id: 7, razaoSocial: 'Fornecedor teste', cnpj: '12345678000190' } as Fornecedor;
  const peca = { id: 12, nome: 'Filtro', tipo: 'Filtro', fabricante: 'Marca', unidade: 'Unidade' };
  const servico = { id: 12, nome: 'Balanceamento', categoria: 'Rodas', tipoDoPrestador: 'Fornecedor Externo', duracaoEstimada: '1', unidadeDuracao: 'HORA', valorBase: '80', unidadeCobranca: 'SERVICO', garantiaDias: 0, necessitaPecas: false, ativo: true };
  const params: Record<string, string> = {};

  beforeEach(() => {
    bootstrapAnterior = (globalThis as any).bootstrap;
    (globalThis as any).bootstrap = { Modal: { getOrCreateInstance: () => ({ show: jasmine.createSpy(), hide: jasmine.createSpy() }) } };
    Object.keys(params).forEach(key => delete params[key]);
    Object.assign(params, { continuarCadastro: '1', fornecedorId: '7' });
    TestBed.configureTestingModule({
      imports: [FornecimentoPecasComponent, FornecimentoServicoComponent, PecaComponent, ServicoComponent],
      providers: [provideZoneChangeDetection(), provideHttpClient(), provideHttpClientTesting(), provideRouter([]), {
        provide: ActivatedRoute, useValue: { snapshot: { get queryParamMap() { return convertToParamMap(params); } } }
      }]
    });
    http = TestBed.inject(HttpTestingController);
    navegar = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    spyOn(console, 'error');
  });
  afterEach(() => { http.verify(); (globalThis as any).bootstrap = bootstrapAnterior; });

  it('verifica nome e categoria, destaca duplicidade e ignora o próprio serviço na edição', () => {
    delete params['continuarCadastro'];
    const fixture = TestBed.createComponent(ServicoComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();
    http.expectOne(req => req.url === '/api/servico/pagina').flush({content:[servico],totalElements:1,totalPages:1,number:0,resumo:{total:1},opcoes:{}});
    http.expectNone('/api/fornecedor');
    component.abrirModalCadastro();
    component.novoServico.nome = 'balanceamento';
    component.novoServico.categoria = 'Rodas';
    component.verificarDuplicidade(component.novoServico);
    expect(component.consultandoDuplicidade).toBeTrue();
    http.expectOne(req => req.url === '/api/cadastros/duplicidade/servico').flush({ duplicado: true, id: 12 });
    expect(component.servicoDuplicado(component.novoServico)).toBeTrue();
    component.fornecedorFluxo = fornecedor;
    component.usarServicoExistente();
    expect(navegar).toHaveBeenCalledWith(['/menuAdministrador', 'fornecimentoServico'], { queryParams: { continuarCadastro: '1', fornecedorId: 7, servicoId: 12 } });
    component.fornecedorFluxo = null;
    expect(component.dadosServicoPendentes(component.novoServico)).toBeTrue();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('#nomeServicoCadastro').classList.contains('is-invalid')).toBeTrue();
    expect(fixture.nativeElement.querySelector('#categoriaServicoCadastro').classList.contains('is-invalid')).toBeTrue();
    component.novoServico.categoria = 'Outra';
    expect(component.servicoDuplicado(component.novoServico)).toBeFalse();
    component.abrirModalEdicao(servico as any);
    expect(component.servicoDuplicado(component.edit)).toBeFalse();
    component.verificarDuplicidade(component.edit);
    http.expectOne(req => req.url === '/api/cadastros/duplicidade/servico').flush({}, { status: 500, statusText: 'Erro' });
    expect(component.erroConsultaDuplicidade).toContain('Não foi possível verificar');
    component.verificarDuplicidade(component.edit);
    http.expectOne(req => req.url === '/api/cadastros/duplicidade/servico' && req.params.get('idIgnorado') === '12').flush({ duplicado: false, id: null });
    expect(component.erroConsultaDuplicidade).toBe('');
  });

  it('valida ao sair do campo real e destaca nomes equivalentes com acentos', async () => {
    delete params['continuarCadastro'];
    const fixture = TestBed.createComponent(ServicoComponent);
    const component = fixture.componentInstance; fixture.detectChanges();
    http.expectOne(req => req.url === '/api/servico/pagina').flush({content:[{ ...servico, nome: 'Servico Teste' }],totalElements:1,totalPages:1,number:0,resumo:{total:1},opcoes:{}});
    http.expectNone('/api/fornecedor');
    component.abrirModalCadastro(); component.novoServico.categoria = 'Rodas'; fixture.detectChanges();
    await fixture.whenStable();
    const nome: HTMLInputElement = fixture.nativeElement.querySelector('#nomeServicoCadastro');
    nome.value = 'Serviço Teste'; nome.dispatchEvent(new Event('input')); fixture.detectChanges(); await fixture.whenStable();
    nome.dispatchEvent(new Event('blur'));
    http.expectOne(r => r.url === '/api/cadastros/duplicidade/servico' && r.params.get('nome') === 'Serviço Teste').flush({ duplicado: true, id: 12 });
    fixture.detectChanges();
    expect(nome.classList.contains('is-invalid')).toBeTrue();
    expect(fixture.nativeElement.querySelector('#categoriaServicoCadastro').classList.contains('is-invalid')).toBeTrue();
    expect(component.podeAvancarCadastro).toBeFalse();
  });

  for (const peloFornecedor of [false, true]) {
    it(`exibe a classificação completa de óleo no cadastro ${peloFornecedor ? 'vindo do fornecedor' : 'normal de peças'}`, async () => {
      if (!peloFornecedor) delete params['continuarCadastro'];
      const fixture = TestBed.createComponent(PecaComponent);
      const component = fixture.componentInstance;
      fixture.detectChanges();
      http.expectOne(req => req.url === '/api/peca/pagina').flush({content:[],totalElements:0,totalPages:1,number:0,resumo:{total:0},opcoes:{}});
      if (peloFornecedor) {
        http.expectOne('/api/fornecedor/7').flush(fornecedor);
        expect(component.fornecedorFluxo?.id).toBe(7);
      } else component.abrirModalCadastro();
      component.novaPeca = { nome: 'Óleo de motor', fabricante: 'Marca teste', unidade: 'Litro', tipo: '' };
      component.trocarAbaCadastroPeca('classificacao');
      fixture.detectChanges();
      await fixture.whenStable();
      const modal = fixture.nativeElement.querySelector('#modalCadastroPeca');
      const tipo: HTMLSelectElement = modal.querySelector('#tipoPecaCadastro');
      tipo.value = Array.from(tipo.options).find(opcao => opcao.textContent?.trim() === 'Óleo de motor')!.value;
      tipo.dispatchEvent(new Event('change'));
      fixture.detectChanges();
      await fixture.whenStable();
      expect(component.novaPeca.tipo).toBe('Óleo de motor');
      for (const campo of ['tipoPecaCadastro', 'origemOleoPecaCadastro', 'modeloPecaCadastro', 'viscosidadeSaePecaCadastro', 'classificacaoApiPecaCadastro', 'classificacaoAceaPecaCadastro', 'normaOemPecaCadastro']) {
        expect(modal.querySelector(`#${campo}`)).withContext(campo).not.toBeNull();
      }
      expect(Array.from(modal.querySelector('#origemOleoPecaCadastro').options).map((opcao: any) => opcao.textContent.trim())).toEqual(['Selecione...', 'Mineral', 'Semissintético', 'Sintético']);
      expect(component.podeAvancarCadastro).toBeFalse();
      component.novaPeca.origemOleo = 'SINTETICO';
      component.novaPeca.viscosidadeSae = '5W40';
      expect(component.podeAvancarCadastro).toBeFalse();
      component.novaPeca.classificacaoApi = 'sp';
      expect(component.podeAvancarCadastro).toBeTrue();
      if (peloFornecedor) {
        component.novaPeca.modelo = 'Linha teste';
        component.novaPeca.classificacaoAcea = 'c3';
        component.novaPeca.normaOem = 'vw 502 00';
        component.salvarNovaPeca();
        const req = http.expectOne('/api/peca');
        expect(req.request.body).toEqual(jasmine.objectContaining({ tipo: 'Óleo De Motor', origemOleo: 'SINTETICO', viscosidadeSae: '5W-40', classificacaoApi: 'SP', classificacaoAcea: 'C3', normaOem: 'VW 502 00', modelo: 'Linha Teste' }));
        req.flush({ ...req.request.body, id: 12 });
        expect(navegar.calls.mostRecent().args[1].queryParams).toEqual({ continuarCadastro: '1', fornecedorId: 7, pecaId: 12 });
      }
    });
  }

  it('reabre as opções automaticamente quando não há peças cadastradas', () => {
    const component = TestBed.createComponent(FornecimentoPecasComponent).componentInstance;
    const escolher = spyOn(component, 'abrirModalPeca');
    component.iniciarFornecimentoDoFornecedor();
    http.expectOne('/api/fornecedor/7').flush(fornecedor);
    http.expectOne('/api/fornecedor').flush([fornecedor]);
    http.expectOne('/api/peca').flush([]);
    http.expectOne('/api/fornecimento-pecas').flush([]);
    expect(escolher).not.toHaveBeenCalled();
    expect(component.modalContinuidadePeca.show).toHaveBeenCalled();
    expect(component.novoFornecimento.fornecedor?.id).toBe(7);
    navegar.calls.reset();
    component.continuarEscolhaPeca(true);
    expect(navegar).toHaveBeenCalledWith(['/menuAdministrador', 'peca'], {
      queryParams: { continuarCadastro: '1', fornecedorId: 7 }
    });
    http.expectNone(req => req.method === 'POST');
  });

  it('aguarda fechar a seleção antes de reabrir as opções após uma busca sem resultado', () => {
    const component = TestBed.createComponent(FornecimentoPecasComponent).componentInstance;
    component.fluxoFornecedorAtivo = true;
    component.novoFornecimento = { fornecedor: { id: 7, razaoSocial: fornecedor.razaoSocial } };
    component.pecas = [peca]; component.descricaoFiltroEdit = 'Peça inexistente'; component.aplicarFiltroPecaEdit();
    expect(component.pecasFiltradas).toEqual([]);
    const el = document.getElementById('modalPeca')!;
    el.classList.add('show');
    component.modalPeca = { hide: jasmine.createSpy() };
    component.fecharModalPeca();
    expect(component.modalPeca.hide).toHaveBeenCalled();
    expect(component.modalContinuidadePeca).toBeUndefined();
    el.classList.remove('show'); el.dispatchEvent(new Event('hidden.bs.modal'));
    expect(component.modalContinuidadePeca.show).toHaveBeenCalled();
    const escolher = spyOn(component, 'abrirModalPeca');
    component.continuarEscolhaPeca(false);
    expect(escolher).toHaveBeenCalledWith('cadastro');
    expect(component.novoFornecimento.fornecedor?.id).toBe(7);
    expect(navegar).not.toHaveBeenCalled();
  });

  it('permite concluir por enquanto e não altera a seleção comum de peças', () => {
    const component = TestBed.createComponent(FornecimentoPecasComponent).componentInstance;
    component.novoFornecimento = { fornecedor: { id: 7, razaoSocial: fornecedor.razaoSocial } };
    component.voltarOpcoesFornecedor();
    expect(component.modalContinuidadePeca).toBeUndefined();
    component.fluxoFornecedorAtivo = true;
    component.voltarOpcoesFornecedor();
    component.concluirContinuidadePeca();
    expect(component.fluxoFornecedorAtivo).toBeFalse();
    expect(component.modalContinuidadePeca.hide).toHaveBeenCalled();
    component.continuarEscolhaPeca(true);
    expect(navegar).not.toHaveBeenCalled();
    http.expectNone(req => req.method === 'POST');
  });

  for (const tipo of ['peca', 'servico'] as const) {
    if (tipo === 'servico') {
      it('serviço: retorna às opções quando a lista está vazia e permite criar mantendo o fornecedor', () => {
        const component = TestBed.createComponent(FornecimentoServicoComponent).componentInstance;
        component.iniciarFornecimentoDoFornecedor();
        http.expectOne('/api/fornecedor/7').flush(fornecedor);
        http.expectOne('/api/fornecedor').flush([fornecedor]);
        http.expectOne('/api/servico').flush([]);
        expect(component.modalContinuidadeServico.show).toHaveBeenCalled();
        expect(component.novoFornecimento.idFornecedor).toBe(7);
        expect(component.novoFornecimento.quantidadeMinima).toBeUndefined();
        component.normalizarQuantidadeMinimaCadastro();
        expect(component.novoFornecimento.quantidadeMinima).toBeUndefined();
        component.continuarEscolhaServico(true);
        expect(navegar).toHaveBeenCalledWith(['/menuAdministrador', 'servico'], { queryParams: { continuarCadastro: '1', fornecedorId: 7 } });
        http.expectNone(req => req.method === 'POST');
      });

      it('serviço: aguarda fechar a busca para voltar às opções, sem perder o fornecedor', () => {
        const c = TestBed.createComponent(FornecimentoServicoComponent).componentInstance;
        c.fluxoFornecedorAtivo = true; c.modoSelecaoServico = 'cadastro';
        c.novoFornecimento = { idFornecedor: 7, razaoSocialFornecedor: fornecedor.razaoSocial };
        c.servicos = [servico]; c.servicoFiltro = 'inexistente'; c.aplicarFiltroServico();
        expect(c.servicosFiltrados).toEqual([]);
        const el = document.getElementById('modalServicoFornecimentoServico')!;
        el.classList.add('show'); c.modalServico = { hide: jasmine.createSpy() };
        c.cancelarSelecaoServico();
        expect(c.modalServico.hide).toHaveBeenCalled(); expect(c.modalContinuidadeServico).toBeUndefined();
        el.classList.remove('show'); el.dispatchEvent(new Event('hidden.bs.modal'));
        expect(c.modalContinuidadeServico.show).toHaveBeenCalled();
        const escolher = spyOn(c, 'abrirModalServico');
        c.continuarEscolhaServico(false); expect(escolher).toHaveBeenCalledWith('cadastro');
        expect(c.novoFornecimento.idFornecedor).toBe(7);
        c.concluirContinuidadeServico(); c.continuarEscolhaServico(true);
        expect(navegar).not.toHaveBeenCalled();
      });
    }
    for (const comItem of [false, true]) {
      it(`${tipo}: mantém o fornecedor e ${comItem ? 'abre condições com o item salvo' : 'solicita a escolha do item existente'}`, () => {
        if (comItem) params[tipo === 'peca' ? 'pecaId' : 'servicoId'] = '12';
        const component: any = tipo === 'peca'
          ? TestBed.createComponent(FornecimentoPecasComponent).componentInstance
          : TestBed.createComponent(FornecimentoServicoComponent).componentInstance;
        component.modalCadastro = { show: jasmine.createSpy(), hide: jasmine.createSpy() };
        const escolher = spyOn(component, tipo === 'peca' ? 'abrirModalPeca' : 'abrirModalServico');
        component.iniciarFornecimentoDoFornecedor();
        http.expectOne('/api/fornecedor/7').flush(fornecedor);
        http.expectOne('/api/fornecedor').flush([fornecedor]);
        http.expectOne(`/api/${tipo}`).flush([tipo === 'peca' ? peca : servico]);
        if (tipo === 'peca') http.expectOne('/api/fornecimento-pecas').flush([]);
        expect(tipo === 'peca' ? component.novoFornecimento.fornecedor.id : component.novoFornecimento.idFornecedor).toBe(7);
        if (comItem) {
          expect(tipo === 'peca' ? component.novoFornecimento.peca.id : component.novoFornecimento.idServico).toBe(12);
          expect(component.abaCadastroFornecimento).toBe('condicoes');
          expect(component.modalCadastro.show).toHaveBeenCalled();
          expect(escolher).not.toHaveBeenCalled();
        } else {
          expect(escolher).toHaveBeenCalledWith('cadastro');
          expect(component.abaCadastroFornecimento).toBe('vinculo');
        }
        // O vínculo ainda precisa da confirmação das condições comerciais.
        http.expectNone(req => req.method === 'POST');
      });
    }
    it(`${tipo}: segue para fornecimento somente após o novo item ser salvo`, () => {
      const component: any = tipo === 'peca'
        ? TestBed.createComponent(PecaComponent).componentInstance
        : TestBed.createComponent(ServicoComponent).componentInstance;
      component.fornecedorFluxo = fornecedor;
      component.modalCadastro = { hide: jasmine.createSpy() };
      if (tipo === 'peca') component.novaPeca = { ...peca, id: undefined };
      else { component.novoServico = { ...servico, id: undefined, idFornecedor: 7 }; component.abaCadastroServico = 'revisao'; }
      component[tipo === 'peca' ? 'salvarNovaPeca' : 'salvarNovoServico']();
      expect(navegar).not.toHaveBeenCalled();
      expect(component.salvandoCadastro).toBeTrue();
      // Clique repetido durante o envio não cria outro item.
      component[tipo === 'peca' ? 'salvarNovaPeca' : 'salvarNovoServico']();
      const req = http.expectOne(`/api/${tipo}`);
      expect(req.request.method).toBe('POST');
      req.flush(tipo === 'peca' ? peca : servico);
      expect(navegar.calls.mostRecent().args[1].queryParams).toEqual({ continuarCadastro: '1', fornecedorId: 7, [tipo === 'peca' ? 'pecaId' : 'servicoId']: 12 });
      expect(component.salvandoCadastro).toBeFalse();
    });
    it(`${tipo}: mantém o formulário e não avança se o salvamento falhar`, () => {
      const component: any = tipo === 'peca'
        ? TestBed.createComponent(PecaComponent).componentInstance
        : TestBed.createComponent(ServicoComponent).componentInstance;
      component.fornecedorFluxo = fornecedor;
      if (tipo === 'peca') component.novaPeca = { ...peca, id: undefined };
      else { component.novoServico = { ...servico, id: undefined, idFornecedor: 7 }; component.abaCadastroServico = 'revisao'; }
      component[tipo === 'peca' ? 'salvarNovaPeca' : 'salvarNovoServico']();
      http.expectOne(`/api/${tipo}`).flush({ mensagem: 'Falha ao salvar' }, { status: 500, statusText: 'Erro' });
      expect(navegar).not.toHaveBeenCalled();
      expect(component.fornecedorFluxo.id).toBe(7);
      expect(component.salvandoCadastro).toBeFalse();
    });
  }
});
