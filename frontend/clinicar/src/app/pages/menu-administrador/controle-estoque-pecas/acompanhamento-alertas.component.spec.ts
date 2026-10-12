import { provideZoneChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ControleEstoquePecasComponent } from './controle-estoque-pecas.component';

describe('Acompanhamento dos alertas de estoque', () => {
  let component: ControleEstoquePecasComponent;
  let http: HttpTestingController;
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [ControleEstoquePecasComponent],
      providers: [provideZoneChangeDetection(), provideRouter([]), provideHttpClient(), provideHttpClientTesting()] }).compileComponents();
    component = TestBed.createComponent(ControleEstoquePecasComponent).componentInstance;
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('reconhece sem remover o alerta e bloqueia cliques repetidos', () => {
    const alerta = { id: 7, statusAlerta: 'ABERTO' };
    component.reconhecerAlerta(alerta); component.reconhecerAlerta(alerta);
    const req = http.expectOne('/api/alertas-estoque/7/reconhecer');
    expect(req.request.method).toBe('PATCH'); expect(req.request.body).toEqual({});
    req.flush({ ...alerta, reconhecidoEm: '2026-10-11T13:00:00', idUsuarioReconhecimento: 12 });
    expect(alerta.statusAlerta).toBe('ABERTO'); expect(component.processandoAlerta).toBeFalse();
    component.reconhecerAlerta(alerta); http.expectNone('/api/alertas-estoque/7/reconhecer');
  });
  it('abre a entrada com estoque e local atuais sem registrar movimentação', () => {
    const abrir = spyOn(component, 'abrirModalMovimentacao');
    component.registrarEntradaDoAlerta({ id: 7, idEstoquePeca: 4 });
    const estoque = { id: 4, idPeca: 3, idLocalEstoque: 2, ativo: true, quantidadeAtual: 5 };
    http.expectOne('/api/estoque-pecas/4').flush(estoque);
    expect(abrir).toHaveBeenCalledWith(estoque, 'ENTRADA');
    http.expectNone('/api/estoque-pecas/4/entrada');
  });
  it('não envia encerramento sem justificativa suficiente', () => {
    component.alertaParaEncerrar = { id: 7 };
    for (const texto of ['', '  ', 'curto', 'x'.repeat(1001)]) {
      component.justificativaEncerramento = texto; component.confirmarEncerramentoAlerta();
      expect(component.justificativaEncerramentoValida).toBeFalse();
    }
    http.expectNone('/api/alertas-estoque/7/encerrar-excepcionalmente');
    component.justificativaEncerramento = 'Peça descontinuada'; expect(component.justificativaEncerramentoValida).toBeTrue();
  });
  it('permite consultar auditoria de alertas encerrados', () => {
    component.incluirAlertasEncerrados = true; component.atualizarListaAlertas();
    const alerta = { id: 7, statusAlerta: 'ENCERRADO', justificativaEncerramento: 'Peça descontinuada', idUsuarioEncerramento: 12 };
    http.expectOne('/api/alertas-estoque').flush([alerta]);
    expect(component.alertasExibidos).toEqual([alerta]); expect(component.alertasAbertos).toEqual([]);
  });

  it('pagina os alertas e corrige a página após redução da lista', () => {
    spyOnProperty(component, 'limiteItensAlertas', 'get').and.returnValue(5);
    component.alertasExibidos = Array.from({ length: 12 }, (_, i) => ({ id: i + 1, statusAlerta: 'ABERTO' }));
    expect(component.totalPaginasAlertas).toBe(3);
    component.irParaPaginaAlertas(3);
    expect(component.alertasPaginados.map(a => a.id)).toEqual([11, 12]);
    expect(component.inicioPaginaAlertas).toBe(11); expect(component.fimPaginaAlertas).toBe(12);
    component.atualizarListaAlertas(false);
    http.expectOne('/api/alertas-estoque/abertos').flush(component.alertasExibidos.slice(0, 7));
    expect(component.paginaAlertas).toBe(2); expect(component.alertasPaginados.map(a => a.id)).toEqual([6, 7]);
    component.atualizarListaAlertas(); http.expectOne('/api/alertas-estoque/abertos').flush([]);
    expect(component.paginaAlertas).toBe(1); expect(component.inicioPaginaAlertas).toBe(0);
    expect(component.fimPaginaAlertas).toBe(0);
  });

  it('reduz o tamanho da página para caber em uma janela menor sem perder registros', () => {
    const limite = spyOnProperty(component, 'limiteItensAlertas', 'get').and.returnValue(10);
    component.alertasExibidos = Array.from({ length: 13 }, (_, i) => ({ id: i + 1 }));
    component.itensPorPaginaAlertas = 10; component.irParaPaginaAlertas(2);
    limite.and.returnValue(3); component.ajustarPaginacaoAlertas();
    expect(component.itensPorPaginaAlertas).toBe(3); expect(component.alertasPaginados.length).toBe(3);
    expect(component.opcoesItensAlertas).toEqual([3]); expect(component.totalPaginasAlertas).toBe(5);
    component.irParaPaginaAlertas(5); expect(component.alertasPaginados.map(a => a.id)).toEqual([13]);
    expect(component.paginasVisiveisAlertas()).toEqual([1, 2, 3, 4, 5]);
  });

  it('renderiza ações em linha e pagina textos longos sem rolagem vertical na lista', () => {
    const fixture = TestBed.createComponent(ControleEstoquePecasComponent);
    const tela = fixture.componentInstance;
    fixture.detectChanges();
    http.match(req => req.method === 'GET').forEach(req => req.flush(req.request.url.endsWith('/pagina')?{content:[],totalElements:0,totalPages:0,number:0,resumo:{},opcoes:{}}:[]));
    tela.alertasExibidos = Array.from({ length: 12 }, (_, i) => ({ id: i + 1, statusAlerta: 'ABERTO',
      nomePeca: 'Nome de peça extenso '.repeat(20), nomeLocalEstoque: 'Almoxarifado principal',
      justificativaEncerramento: 'Justificativa longa '.repeat(50), ultimoErro: 'Falha detalhada '.repeat(50) }));
    tela.itensPorPaginaAlertas = tela.limiteItensAlertas;
    tela.ajustarPaginacaoAlertas(); fixture.detectChanges();
    const modal: HTMLElement = fixture.nativeElement.querySelector('#modalAlertasEstoque');
    modal.style.display = 'block'; modal.classList.add('show');
    const tabela: HTMLElement = modal.querySelector('.alertas-table-responsive')!;
    expect(modal.querySelectorAll('tbody tr').length).toBe(tela.tamanhoPaginaAlertas);
    expect(modal.querySelector('.alertas-actions')!.classList.contains('flex-column')).toBeFalse();
    expect(modal.querySelectorAll('.alertas-actions button').length).toBe(tela.tamanhoPaginaAlertas * 5);
    expect(tabela.scrollHeight).toBeLessThanOrEqual(tabela.clientHeight + 1);
    expect(modal.scrollHeight).toBeLessThanOrEqual(modal.clientHeight + 1);
    modal.classList.remove('show'); modal.style.display = 'none';
  });
});
