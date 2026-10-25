import { provideZoneChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { ControleEstoquePecasComponent } from './controle-estoque-pecas.component';

describe('Histórico paginado e saldo completo de movimentações',()=>{
  let c:ControleEstoquePecasComponent,http:HttpTestingController,anterior:any,modal:HTMLElement;
  const url='/api/estoque-pecas/20/movimentacoes/pagina';
  const pagina=(id:number,total=23)=>({content:[{id,tipoMovimento:'ENTRADA',quantidade:2,saldoAnterior:10,saldoPosterior:12}],totalElements:total,totalPages:Math.ceil(total/10),number:0,resumo:{},opcoes:{}});
  beforeEach(()=>{
    TestBed.configureTestingModule({providers:[provideZoneChangeDetection(),provideHttpClient(),provideHttpClientTesting(),provideRouter([])]});
    c=TestBed.createComponent(ControleEstoquePecasComponent).componentInstance;c.modoPaginado=true;
    http=TestBed.inject(HttpTestingController);modal=document.createElement('div');modal.id='modalHistoricoMovimentacoes';document.body.appendChild(modal);
    anterior=(globalThis as any).bootstrap;(globalThis as any).bootstrap={Modal:{getOrCreateInstance:()=>({show:()=>{},hide:()=>{}})}};
    c.estoqueSelecionado={id:20,quantidadeAtual:100,quantidadeReservada:0,custoMedio:30} as any;
  });
  afterEach(()=>{modal.remove();(globalThis as any).bootstrap=anterior;http.verify({ignoreCancelled:true});});
  it('abre somente a primeira página e mantém o saldo atual independente dos lançamentos visíveis',()=>{
    c.abrirModalMovimentacoes(c.estoqueSelecionado!);
    const req=http.expectOne(r=>r.url===url);expect(req.request.params.get('tamanho')).toBe('10');req.flush(pagina(23));
    expect(c.totalMovimentacoes).toBe(23);expect(c.movimentacoes.length).toBe(1);expect(c.estoqueSelecionado?.quantidadeAtual).toBe(100);
    http.expectNone('/api/estoque-pecas/20/movimentacoes');
    c.paginaMovimentacoes=2;c.carregarPaginaMovimentacoes();const ultima=http.expectOne(r=>r.url===url);expect(ultima.request.params.get('pagina')).toBe('2');ultima.flush(pagina(3));expect(c.movimentacoes[0].id).toBe(3);
  });
  it('cancela a página anterior e reinicia a paginação ao pesquisar',()=>{
    c.carregarPaginaMovimentacoes();const antigo=http.expectOne(r=>r.url===url);c.paginaMovimentacoes=2;c.buscaMovimentacoes='compra';c.carregarPaginaMovimentacoes(true);
    expect(antigo.cancelled).toBeTrue();const atual=http.expectOne(r=>r.url===url);expect(atual.request.params.get('pagina')).toBe('0');expect(atual.request.params.get('busca')).toBe('compra');atual.flush(pagina(1,1));
  });
  it('usa o saldo calculado no servidor sem depender dos vínculos carregados na tela',()=>{
    const saida={id:8,tipoMovimento:'SAIDA',quantidade:6,quantidadeDisponivelOriginal:5} as any;
    c.movimentacoesParaDevolucao=[];expect(c.saldoDevolucao(saida)).toBe(5);expect(c.quantidadeOriginalCorrigida(saida)).toBe(5);
    c.tipoMovimentacaoSelecionado='AJUSTE_SAIDA';c.movimento.origem='CORRECAO_LANCAMENTO';c.movimento.idMovimentacaoOrigem=9;
    c.registrarMovimentacaoOriginal({id:9,tipoMovimento:'SAIDA',origem:'DEVOLUCAO_FORNECEDOR',idMovimentacaoOrigem:1,quantidade:4,quantidadeDisponivelOriginal:3,quantidadeDisponivelRecebimento:9} as any);
    c.movimento.quantidade='8';expect(c.quantidadeMovimentacaoValida).toBeTrue();c.movimento.quantidade='10';expect(c.quantidadeMovimentacaoValida).toBeFalse();
  });
  it('mostra falha de consulta e permite uma nova tentativa sem gravar movimentação',()=>{
    c.carregarPaginaMovimentacoes();http.expectOne(r=>r.url===url).flush({}, {status:500,statusText:'Erro'});expect(c.erroMovimentacoes).toContain('Atualizar');expect(c.carregandoMovimentacoes).toBeFalse();
    c.carregarPaginaMovimentacoes();http.expectOne(r=>r.url===url).flush(pagina(1));expect(c.erroMovimentacoes).toBe('');http.expectNone(r=>r.method==='POST');
  });
});
