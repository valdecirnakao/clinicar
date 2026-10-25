import { provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { ControleEstoquePecasComponent } from './controle-estoque-pecas.component';

describe('ControleEstoquePecasComponent', () => {
  let component: ControleEstoquePecasComponent;
  let fixture: ComponentFixture<ControleEstoquePecasComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ControleEstoquePecasComponent],
      providers: [provideZoneChangeDetection(), provideRouter([]), provideHttpClient(), provideHttpClientTesting()]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ControleEstoquePecasComponent);
    component = fixture.componentInstance;
    component.fornecedoresMovimentacao = [{ id: 3, razaoSocial: 'Fornecedor de teste', ativo: true }];
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('exibe quantidades do alerta histórico sem casas decimais desnecessárias', () => {
    const mensagem = 'Estoque atual: 2.000. Quantidade reservada: 0.000. Quantidade disponível: 2.000. Estoque mínimo: 5.000. Estoque crítico: 2.000. Local: Almoxarifado.';
    expect(component.formatarMensagemAlertaEstoque(mensagem)).toBe(
      'Estoque atual: 2. Quantidade reservada: 0. Quantidade disponível: 2. Estoque mínimo: 5. Estoque crítico: 2. Local: Almoxarifado.'
    );
    expect(component.formatarMensagemAlertaEstoque('Estoque atual: 2000.000. Quantidade disponível: 2.500.')).toBe(
      'Estoque atual: 2.000. Quantidade disponível: 2,5.'
    );
  });

  it('associa o fornecedor escolhido sem apagar os dados da entrada', () => {
    component.tipoMovimentacaoSelecionado = 'ENTRADA';
    component.movimento = { origem: 'COMPRA', quantidade: '5', valorUnitario: '30' };
    component.selecionarFornecedorMovimentacao({ id: 8, razaoSocial: 'Fornecedor escolhido', ativo: true });
    expect(component.movimento.idFornecedor).toBe(8);
    expect(component.movimento.quantidade).toBe('5');
    expect(component.fornecedoresMovimentacao[0].razaoSocial).toBe('Fornecedor escolhido');
  });

  it('preserva o custo digitado ao escolher uma origem de entrada com custo manual', () => {
    component.tipoMovimentacaoSelecionado = 'ENTRADA';
    component.movimento = { quantidade: '5', valorUnitario: 'R$ 30,00', origem: 'COMPRA' };
    component.alterarOrigemMovimentacao();
    expect(component.movimento.valorUnitario).toBe('R$ 30,00');
    expect(component.movimento.quantidade).toBe('5');
    component.movimento.origem = 'OUTRA';
    component.alterarOrigemMovimentacao();
    expect(component.movimento.valorUnitario).toBe('R$ 30,00');
  });

  it('descarta custo digitado quando a origem determina o custo automaticamente', () => {
    component.tipoMovimentacaoSelecionado = 'ENTRADA';
    component.movimento = { quantidade: '5', valorUnitario: 'R$ 30,00', origem: 'BONIFICACAO' };
    component.alterarOrigemMovimentacao();
    expect(component.movimento.valorUnitario).toBe('');
    expect(component.custoMovimentacaoNumerico).toBe(0);
  });

  it('exige custo na compra e atualiza o progresso e os campos obrigatórios', () => {
    component.tipoMovimentacaoSelecionado = 'ENTRADA'; component.movimento = { origem: '', quantidade: '', valorUnitario: '' };
    expect(component.progressoMovimentacao).toBe(0);
    component.movimento.idFornecedor = 3; component.movimento.origem = 'COMPRA'; component.movimento.quantidade = '5'; fixture.detectChanges();
    const modal: HTMLElement = fixture.nativeElement.querySelector('#modalMovimentacaoEstoque');
    expect(modal.querySelector('#movimentoValorUnitario')!.classList.contains('is-invalid')).toBeTrue();
    expect(component.movimentacaoProntaParaSalvar).toBeFalse();
    component.movimento.valorUnitario = '0'; expect(component.custoMovimentacaoValido).toBeFalse();
    component.movimento.valorUnitario = '-2'; expect(component.custoMovimentacaoValido).toBeFalse();
    component.movimento.valorUnitario = 'R$ 30,00'; fixture.detectChanges();
    expect(component.progressoMovimentacao).toBe(100);
    expect(modal.querySelector('.cadastro-progress')!.getAttribute('aria-valuenow')).toBe('100');
    expect(component.movimentacaoProntaParaSalvar).toBeTrue();
  });

  it('aplica custo automático e exige motivo para outra entrada gratuita', () => {
    component.tipoMovimentacaoSelecionado = 'ENTRADA';
    component.estoqueSelecionado = { id: 1, custoMedio: 40, quantidadeAtual: 10 };
    component.movimento = { origem: 'BONIFICACAO', quantidade: '5', valorUnitario: '999' };
    expect(component.custoMovimentacaoNumerico).toBe(0);
    expect(component.custoMovimentacaoObrigatorio).toBeFalse();
    expect(component.movimentacaoProntaParaSalvar).toBeTrue();
    component.movimento.origem = 'OUTRA'; component.movimento.valorUnitario = '0';
    expect(component.motivoMovimentacaoObrigatorio).toBeTrue(); expect(component.movimentacaoProntaParaSalvar).toBeFalse();
    component.movimento.motivo = 'Amostra gratuita'; expect(component.movimentacaoProntaParaSalvar).toBeTrue();
    component.tipoMovimentacaoSelecionado = 'AJUSTE_ENTRADA'; component.movimento.origem = 'INVENTARIO';
    expect(component.custoMovimentacaoNumerico).toBe(40);
    component.estoqueSelecionado.custoMedio = null; component.movimento.valorUnitario = '';
    expect(component.custoMovimentacaoObrigatorio).toBeTrue(); expect(component.movimentacaoProntaParaSalvar).toBeFalse();
  });

  it('recupera o custo da saída vinculada e limita a devolução ao saldo não devolvido', () => {
    component.tipoMovimentacaoSelecionado = 'ENTRADA'; component.estoqueSelecionado = { id: 1, custoMedio: 40 };
    component.movimentacoesParaDevolucao = [
      { id: 8, tipoMovimento: 'SAIDA', origem: 'CONSUMO_INTERNO', quantidade: 3, valorUnitario: 20 },
      { id: 9, tipoMovimento: 'SAIDA', origem: 'ATENDIMENTO', quantidade: 3, valorUnitario: 90 },
      { id: 10, tipoMovimento: 'ENTRADA', idMovimentacaoOrigem: 8, quantidade: 1 }
    ];
    component.movimento = { origem: 'DEVOLUCAO_NAO_UTILIZADA', idMovimentacaoOrigem: 8, quantidade: '3' };
    expect(component.saidasDisponiveisDevolucao.length).toBe(1);
    expect(component.custoMovimentacaoNumerico).toBe(20);
    expect(component.quantidadeMovimentacaoValida).toBeFalse();
    component.movimento.quantidade = '2'; expect(component.movimentacaoProntaParaSalvar).toBeTrue();
    expect((component as any).montarPayloadMovimentacao().idMovimentacaoOrigem).toBe(8);
  });

  it('oferece origens por operação e explica todas as opções no card', () => {
    component.tipoMovimentacaoSelecionado = 'ENTRADA';
    expect(component.opcoesOrigemMovimentacao.map(item => item.valor)).toEqual(['COMPRA', 'DEVOLUCAO_NAO_UTILIZADA', 'BONIFICACAO', 'OUTRA']);
    for (const opcao of component.opcoesOrigemMovimentacao) expect(component.ajudaOrigensMovimentacao).toContain(opcao.ajuda);
    component.tipoMovimentacaoSelecionado = 'SAIDA';
    expect(component.opcoesOrigemMovimentacao.map(item => item.valor)).toEqual(['CONSUMO_INTERNO', 'DEVOLUCAO_FORNECEDOR', 'PERDA_AVARIA', 'OUTRA']);
    component.tipoMovimentacaoSelecionado = 'AJUSTE_ENTRADA';
    component.movimento = { origem: 'INVENTARIO', motivo: 'Contagem realizada' };
    component.ajusteSaidaSelecionado = true; component.alternarTipoAjuste();
    expect(component.origemMovimentacaoValida).toBeTrue();
    expect(component.movimento.motivo).toBe('Contagem realizada');
    expect(component.opcoesOrigemMovimentacao.map(item => item.valor)).toEqual(['INVENTARIO', 'CORRECAO_LANCAMENTO', 'OUTRA']);
  });

  it('renderiza a lista obrigatória e as explicações no modal de movimentação', () => {
    component.tipoMovimentacaoSelecionado = 'ENTRADA'; component.movimento = { origem: '' };
    fixture.detectChanges();
    const modal: HTMLElement = fixture.nativeElement.querySelector('#modalMovimentacaoEstoque');
    const select = modal.querySelector<HTMLSelectElement>('#movimentoOrigem')!;
    expect(select.tagName).toBe('SELECT'); expect(select.required).toBeTrue();
    expect(select.classList.contains('is-invalid')).toBeTrue();
    expect(select.options.length).toBe(5);
    select.dispatchEvent(new Event('focus')); fixture.detectChanges();
    const ajuda = modal.querySelector('.field-help-text')!.textContent!;
    for (const opcao of component.opcoesOrigemMovimentacao) expect(ajuda).toContain(`${opcao.rotulo}: ${opcao.ajuda}`);
    component.movimento.origem = 'OUTRA'; fixture.detectChanges();
    const motivo = modal.querySelector<HTMLInputElement>('#movimentoMotivo')!;
    expect(motivo.required).toBeTrue(); expect(motivo.classList.contains('is-invalid')).toBeTrue();
  });

  it('bloqueia outra origem sem justificativa e preserva a exibição de origens antigas', () => {
    component.tipoMovimentacaoSelecionado = 'ENTRADA';
    component.movimento = { origem: 'OUTRA', quantidade: '5', motivo: '   ', valorUnitario: '30' };
    expect((component as any).validarMovimentacao().toLowerCase()).toContain('motivo');
    component.movimento.motivo = 'Recebimento de amostra';
    expect((component as any).validarMovimentacao()).toBeNull();
    component.movimento.origem = 'ATENDIMENTO';
    expect((component as any).validarMovimentacao()).toContain('origem válida');
    expect(component.rotuloOrigemMovimentacao('COMPRA')).toBe('Compra');
    expect(component.rotuloOrigemMovimentacao('INVENTARIO_INICIAL')).toBe('Inventário inicial');
    expect(component.rotuloOrigemMovimentacao('Antiga origem personalizada')).toBe('Antiga origem personalizada');
  });

  it('deve exigir custo médio quando houver estoque inicial', () => {
    component.novoEstoque = {
      idPeca: 1,
      idLocalEstoque: 1,
      quantidadeAtual: '10',
      quantidadeReservada: '0',
      estoqueMinimo: '5',
      estoqueCritico: '2',
      custoMedio: ''
    };

    expect(component.custoMedioObrigatorio(component.novoEstoque)).toBeTrue();
    expect(component.progressoCadastroEstoque).toBe(86);
    expect(component.cadastroEstoqueProntoParaSalvar).toBeFalse();
    expect(component.mensagemBloqueioCadastro).toContain('custo médio');

    component.novoEstoque.custoMedio = 'R$ 20,00';

    expect(component.progressoCadastroEstoque).toBe(100);
    expect(component.cadastroEstoqueProntoParaSalvar).toBeTrue();
  });

  it('deve permitir custo médio vazio quando o estoque inicial for zero', () => {
    component.novoEstoque = {
      idPeca: 1,
      idLocalEstoque: 1,
      quantidadeAtual: '0',
      quantidadeReservada: '0',
      estoqueMinimo: '5',
      estoqueCritico: '2',
      custoMedio: ''
    };

    expect(component.custoMedioObrigatorio(component.novoEstoque)).toBeFalse();
    expect(component.progressoCadastroEstoque).toBe(100);
    expect(component.cadastroEstoqueProntoParaSalvar).toBeTrue();
  });

  it('não deve contar texto inválido como quantidade preenchida', () => {
    component.novoEstoque = {
      idPeca: 1,
      idLocalEstoque: 1,
      quantidadeAtual: 'valor inválido',
      quantidadeReservada: '0',
      estoqueMinimo: '5',
      estoqueCritico: '2'
    };

    expect(component.progressoCadastroEstoque).toBe(83);
    expect(component.cadastroEstoqueProntoParaSalvar).toBeFalse();
  });

  it('deve usar a barra Bootstrap no cadastro em vez do progress nativo', () => {
    const modal: HTMLElement = fixture.nativeElement.querySelector('#modalCadastroEstoquePeca');

    expect(modal.querySelector('progress')).toBeNull();
    expect(modal.querySelector('.cadastro-progress .cadastro-progress-bar')).not.toBeNull();
  });
  it('bloqueia devolução sem saída e mostra a autoria no histórico', () => {
    component.tipoMovimentacaoSelecionado = 'ENTRADA'; component.estoqueSelecionado = { id: 1, custoMedio: 40 };
    component.movimento = { origem: 'DEVOLUCAO_NAO_UTILIZADA', quantidade: '2' };
    expect(component.movimentacaoProntaParaSalvar).toBeFalse();
    component.movimentacoes = [{ id: 1, tipoMovimento: 'ENTRADA', quantidade: 2, idUsuario: 9, nomeUsuario: 'Administrador responsável' }];
    fixture.detectChanges();
    const modal: HTMLElement = fixture.nativeElement.querySelector('#modalHistoricoMovimentacoes');
    expect(modal.textContent).toContain('Administrador responsável');
    expect(modal.textContent).toContain('ID: 9');
  });
  it('exige vínculo na correção e considera correções anteriores nos limites', () => {
    component.tipoMovimentacaoSelecionado = 'AJUSTE_SAIDA'; component.estoqueSelecionado = { id: 1, custoMedio: 40, quantidadeAtual: 10 };
    component.movimento = { origem: 'CORRECAO_LANCAMENTO', quantidade: '3', motivo: 'Entrada lançada acima do recebido' };
    component.movimentacoesParaDevolucao = [
      { id: 8, tipoMovimento: 'ENTRADA', quantidade: 5 },
      { id: 9, tipoMovimento: 'AJUSTE_SAIDA', idMovimentacaoOrigem: 8, quantidade: 3 },
      { id: 10, tipoMovimento: 'SAIDA', origem: 'ATENDIMENTO', quantidade: 5 }
    ];
    fixture.detectChanges();
    const campo = fixture.nativeElement.querySelector('#movimentoOriginalCorrecao') as HTMLSelectElement;
    expect(campo.required).toBeTrue(); expect(campo.closest('app-seletor-remoto')!.classList.contains('is-invalid')).toBeTrue();
    expect(component.movimentacaoProntaParaSalvar).toBeFalse(); expect(component.movimentacoesDisponiveisCorrecao.length).toBe(1);
    component.movimento.idMovimentacaoOrigem = 8; expect(component.quantidadeMovimentacaoValida).toBeFalse();
    component.movimento.quantidade = '2'; expect(component.movimentacaoProntaParaSalvar).toBeTrue();
    expect((component as any).montarPayloadMovimentacao().idMovimentacaoOrigem).toBe(8);
    component.tipoMovimentacaoSelecionado = 'AJUSTE_ENTRADA'; component.movimento.quantidade = '9';
    expect(component.quantidadeMovimentacaoValida).toBeTrue();
    component.movimento.origem = 'INVENTARIO'; fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('#movimentoOriginalCorrecao')).toBeNull();
    expect((component as any).montarPayloadMovimentacao().idMovimentacaoOrigem).toBeNull();
  });

  it('recalcula o saldo devolvível de uma saída após correções', () => {
    const saida = { id: 8, tipoMovimento: 'SAIDA', quantidade: 5 };
    component.movimentacoesParaDevolucao = [saida,
      { tipoMovimento: 'AJUSTE_SAIDA', idMovimentacaoOrigem: 8, quantidade: 3 },
      { tipoMovimento: 'ENTRADA', idMovimentacaoOrigem: 8, quantidade: 2 }
    ];
    expect(component.saldoDevolucao(saida)).toBe(6);
  });
  it('aceita a diferença exata em quantidades fracionadas', () => {
    component.tipoMovimentacaoSelecionado = 'AJUSTE_SAIDA'; component.estoqueSelecionado = { quantidadeAtual: 10, custoMedio: 40 };
    component.movimentacoesParaDevolucao = [
      { id: 8, tipoMovimento: 'ENTRADA', quantidade: '0.3' },
      { tipoMovimento: 'AJUSTE_SAIDA', idMovimentacaoOrigem: 8, quantidade: '0.2' }
    ];
    component.movimento = { origem: 'CORRECAO_LANCAMENTO', idMovimentacaoOrigem: 8, quantidade: '0.1', motivo: 'Correção fracionada' };
    expect(component.quantidadeMovimentacaoValida).toBeTrue();
    expect(component.movimentacaoProntaParaSalvar).toBeTrue();
  });
  it('vincula devolução ao recebimento e considera correções da própria devolução', () => {
    component.tipoMovimentacaoSelecionado = 'SAIDA'; component.estoqueSelecionado = { id: 1, quantidadeAtual: 10, custoMedio: 40 };
    component.movimentacoesParaDevolucao = [
      { id: 8, tipoMovimento: 'ENTRADA', origem: 'COMPRA', quantidade: 10, idFornecedor: 3, nomeFornecedor: 'Fornecedor de teste' },
      { id: 9, tipoMovimento: 'AJUSTE_SAIDA', origem: 'CORRECAO_LANCAMENTO', quantidade: 2, idMovimentacaoOrigem: 8 },
      { id: 10, tipoMovimento: 'SAIDA', origem: 'DEVOLUCAO_FORNECEDOR', quantidade: 4, idMovimentacaoOrigem: 8, idFornecedor: 3 },
      { id: 11, tipoMovimento: 'AJUSTE_ENTRADA', origem: 'CORRECAO_LANCAMENTO', quantidade: 1, idMovimentacaoOrigem: 10 }
    ];
    component.movimento = { origem: 'DEVOLUCAO_FORNECEDOR', quantidade: '5', motivo: 'Produto incorreto' };
    fixture.detectChanges();
    const campo = fixture.nativeElement.querySelector('#movimentoRecebimentoFornecedor') as HTMLSelectElement;
    expect(campo.required).toBeTrue(); expect(campo.closest('app-seletor-remoto')!.classList.contains('is-invalid')).toBeTrue();
    expect(component.movimentacaoProntaParaSalvar).toBeFalse();
    component.movimento.idMovimentacaoOrigem = 8; fixture.detectChanges();
    expect(component.quantidadeOriginalCorrigida(component.recebimentoFornecedorSelecionado!)).toBe(5);
    expect(component.movimentacaoProntaParaSalvar).toBeTrue();
    const payload = (component as any).montarPayloadMovimentacao();
    expect(payload.idMovimentacaoOrigem).toBe(8); expect(payload.idFornecedor).toBe(3);
    expect(fixture.nativeElement.querySelector('#movimentoFornecedor')).toBeNull();
    component.movimento.quantidade = '6'; expect(component.quantidadeMovimentacaoValida).toBeFalse();
    component.movimento.quantidade = '5'; component.movimento.motivo = ' '; expect(component.movimentacaoProntaParaSalvar).toBeFalse();
    component.movimentacoes = [component.movimentacoesParaDevolucao[2]]; fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('#modalHistoricoMovimentacoes').textContent).toContain('Devolução do recebimento');
  });

  it('exige fornecedor no recebimento antigo e impede compra com fornecedor inativo', () => {
    component.estoqueSelecionado = { id: 1, quantidadeAtual: 10, custoMedio: 40 };
    component.fornecedoresMovimentacao = [{ id: 3, razaoSocial: 'Fornecedor antigo', ativo: false }];
    component.tipoMovimentacaoSelecionado = 'SAIDA';
    component.movimentacoesParaDevolucao = [{ id: 8, tipoMovimento: 'ENTRADA', origem: 'MANUAL', quantidade: 10 }];
    component.movimento = { origem: 'DEVOLUCAO_FORNECEDOR', idMovimentacaoOrigem: 8, quantidade: '2', motivo: 'Devolução ao fornecedor' };
    expect(component.movimentacaoProntaParaSalvar).toBeFalse();
    component.movimento.idFornecedor = 3; expect(component.movimentacaoProntaParaSalvar).toBeTrue();
    component.tipoMovimentacaoSelecionado = 'ENTRADA'; component.movimento.origem = 'COMPRA'; component.movimento.valorUnitario = '30';
    expect(component.fornecedorMovimentacaoValido).toBeFalse(); expect(component.opcoesFornecedoresMovimentacao.length).toBe(0);
  });

  it('permite corrigir devolução vinculada sem ultrapassar o recebimento original', () => {
    component.estoqueSelecionado = { id: 1, quantidadeAtual: 10, custoMedio: 40 };
    component.tipoMovimentacaoSelecionado = 'AJUSTE_SAIDA';
    component.movimentacoesParaDevolucao = [
      { id: 8, tipoMovimento: 'ENTRADA', origem: 'COMPRA', quantidade: 10 },
      { id: 10, tipoMovimento: 'SAIDA', origem: 'DEVOLUCAO_FORNECEDOR', quantidade: 4, idMovimentacaoOrigem: 8 }
    ];
    component.movimento = { origem: 'CORRECAO_LANCAMENTO', idMovimentacaoOrigem: 10, quantidade: '7', motivo: 'Correção da devolução' };
    expect(component.vinculoCorrecaoValido).toBeTrue(); expect(component.quantidadeMovimentacaoValida).toBeFalse();
    component.movimento.quantidade = '6'; expect(component.movimentacaoProntaParaSalvar).toBeTrue();
    component.tipoMovimentacaoSelecionado = 'AJUSTE_ENTRADA'; component.movimento.quantidade = '5';
    expect(component.quantidadeMovimentacaoValida).toBeFalse();
    component.movimento.quantidade = '4'; expect(component.movimentacaoProntaParaSalvar).toBeTrue();
  });
});
