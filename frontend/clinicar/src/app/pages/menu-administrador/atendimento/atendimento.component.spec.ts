import { provideZoneChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AtendimentoComponent } from './atendimento.component';
import { Atendimento, AtendimentoService } from './atendimento.service';
import { of, throwError } from 'rxjs';

describe('AtendimentoComponent', () => {
  let component: AtendimentoComponent;
  let fixture: ComponentFixture<AtendimentoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideZoneChangeDetection(), provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
      imports: [AtendimentoComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AtendimentoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('bloqueia conclusão sem KM, com valor fracionado ou abaixo da entrada', () => {
    const concluir = spyOn(TestBed.inject(AtendimentoService), 'concluir');
    component.atendimentoConclusao = { id: 1, quilometragemEntrada: 100 } as Atendimento;
    for (const km of [null, -1, 99, 100.5]) {
      component.quilometragemSaidaConclusao = km;
      component.confirmarConclusao();
      expect(component.erroConclusao).toBeTruthy();
    }
    expect(concluir).not.toHaveBeenCalled();
  });

  it('envia o KM na confirmação e fecha a janela após sucesso', () => {
    const atendimento = { id: 1, quilometragemEntrada: 0 } as Atendimento;
    const concluir = spyOn(TestBed.inject(AtendimentoService), 'concluir').and.returnValue(of(atendimento));
    const recarregar = spyOn(component, 'recarregar');
    component.modalConclusao = { hide: jasmine.createSpy('hide') };
    component.atendimentoConclusao = atendimento;
    component.quilometragemSaidaConclusao = 0;
    component.confirmarConclusao();
    expect(concluir).toHaveBeenCalledOnceWith(1, 0);
    expect(component.modalConclusao.hide).toHaveBeenCalled();
    expect(recarregar).toHaveBeenCalled();
    expect(component.concluindo).toBeFalse();
  });

  it('mantém a janela e o KM informado quando a conclusão falha', () => {
    spyOn(TestBed.inject(AtendimentoService), 'concluir').and.returnValue(throwError(() => ({ error: { mensagem: 'Não foi possível concluir' } })));
    component.modalConclusao = { hide: jasmine.createSpy('hide') };
    component.atendimentoConclusao = { id: 1, quilometragemEntrada: 100 } as Atendimento;
    component.quilometragemSaidaConclusao = 105;
    component.confirmarConclusao();
    expect(component.modalConclusao.hide).not.toHaveBeenCalled();
    expect(component.quilometragemSaidaConclusao).toBe(105);
    expect(component.erroConclusao).toContain('Não foi possível concluir');
    expect(component.concluindo).toBeFalse();
  });
  it('exige saída, saldo disponível, justificativa e tratamento da cobrança na devolução', () => {
    component.movimentosDevolucao = [{ id: 8, tipoMovimento: 'SAIDA', quantidade: 3, quantidadeDevolvida: 1, custoUnitarioEstoque: 20, valorUnitario: 80 } as any];
    component.saidaDevolucaoId = 8; component.quantidadeDevolucao = 2;
    component.motivoDevolucao = 'Peça não utilizada'; component.tratamentoCobrancaDevolucao = 'SEM_RESTITUICAO';
    expect(component.devolucaoAtendimentoValida).toBeTrue();
    component.quantidadeDevolucao = 3; expect(component.devolucaoAtendimentoValida).toBeFalse();
    component.quantidadeDevolucao = 2; component.tratamentoCobrancaDevolucao = 'RESTITUICAO_PENDENTE';
    component.valorRestituicaoDevolucao = 161; expect(component.devolucaoAtendimentoValida).toBeFalse();
    component.valorRestituicaoDevolucao = 50; expect(component.devolucaoAtendimentoValida).toBeTrue();
    component.motivoDevolucao = ' '; expect(component.devolucaoAtendimentoValida).toBeFalse();
    expect(component.podeDevolverPeca({ estoqueBaixado: false, statusAtendimento: 'CONCLUIDO' } as Atendimento)).toBeFalse();
  });

  it('envia a devolução vinculada e evita enviar dados inválidos', () => {
    const devolver = spyOn(TestBed.inject(AtendimentoService), 'devolverPeca').and.returnValue(of(undefined));
    spyOn(component, 'recarregar');
    component.atendimentoDevolucao = { id: 7 } as Atendimento;
    component.confirmarDevolucaoAtendimento(); expect(devolver).not.toHaveBeenCalled();
    component.movimentosDevolucao = [{ id: 8, tipoMovimento: 'SAIDA', quantidade: 3, custoUnitarioEstoque: 20 } as any];
    component.saidaDevolucaoId = 8; component.quantidadeDevolucao = 2; component.motivoDevolucao = ' Não utilizada ';
    component.tratamentoCobrancaDevolucao = 'SEM_RESTITUICAO'; component.confirmarDevolucaoAtendimento();
    expect(devolver).toHaveBeenCalledOnceWith(7, { idMovimentacaoOrigem: 8, quantidade: '2', motivo: 'Não utilizada', tratamentoCobranca: 'SEM_RESTITUICAO', valorRestituicao: '0' });
  });
});
