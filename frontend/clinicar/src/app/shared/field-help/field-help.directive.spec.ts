import { provideZoneChangeDetection } from '@angular/core';
import { Component } from '@angular/core';

import { TestBed } from '@angular/core/testing';
import { FieldHelpDirective } from './field-help.directive';
import { FieldHelpService, FieldHelpState } from './field-help.service';
import { obterAjudaCampo } from './field-help-content';
import { FieldHelpPanelComponent } from './field-help-panel.component';

@Component({
    imports: [FieldHelpDirective], template: `
  <div class="modal" id="modalCadastroFornecimento"><div class="col-lg-4">
    <label for="custo">Valor unitário *</label><input id="custo" class="form-control">
  </div></div>
  <div class="modal" id="modalAtendimento"><div class="col-lg-4">
    <label>KM de saída *</label><input class="form-control" id="semRotuloAssociado">
  </div></div>
  <div class="modal" id="modalRegra"><div class="form-check">
    <input class="form-check-input" id="regraAtiva" type="checkbox"><label for="regraAtiva">Ativa</label>
  </div></div>
  <div class="modal"><input id="especifico" class="form-control" aria-label="Dado especial" data-help="Detalhe específico da operação."></div>
  <div class="modal"><label for="origemTeste">Origem *</label><select id="origemTeste" class="form-select" data-help-options="Compra: peças compradas. Bonificação: peças gratuitas."><option>Compra</option></select></div>
`
})
class FormularioAjudaTeste {}

@Component({
    imports: [FieldHelpDirective, FieldHelpPanelComponent], template: `
  <div class="modal" id="modalTesteFoco">
    <app-field-help-panel></app-field-help-panel>
    <div id="areaSemCampo">Condições comerciais</div>
    <button id="outraGuia" (click)="primeiraGuia = false">Outra guia</button>
    @if (primeiraGuia) {
      <div><label for="valorFoco">Valor unitário *</label><input id="valorFoco" class="form-control"></div>
    }
    <div><label for="prazoFoco">Prazo de entrega (dias) *</label><input id="prazoFoco" class="form-control"></div>
  </div>
  `
})
class FormularioFocoTeste { primeiraGuia = true; }

describe('Visibilidade da ajuda conforme o foco', () => {
  const preparar = () => {
    TestBed.configureTestingModule({providers: [provideZoneChangeDetection()],  imports: [FormularioFocoTeste] });
    const fixture = TestBed.createComponent(FormularioFocoTeste);
    fixture.detectChanges();
    const elemento = (id: string): HTMLElement => fixture.nativeElement.querySelector(`#${id}`);
    const foco = (id: string) => { elemento(id).dispatchEvent(new Event('focus')); fixture.detectChanges(); };
    const clicar = (id: string) => { elemento(id).dispatchEvent(new MouseEvent('click', { bubbles: true })); fixture.detectChanges(); };
    const visivel = () => !!fixture.nativeElement.querySelector('.field-help-panel');
    return { fixture, elemento, foco, clicar, visivel };
  };

  it('fica oculta inicialmente, aparece no foco e desaparece ao clicar fora dos campos', () => {
    const { elemento, foco, clicar, visivel } = preparar();
    expect(visivel()).toBeFalse();
    (elemento('valorFoco') as HTMLInputElement).value = '75';
    foco('valorFoco'); expect(visivel()).toBeTrue();
    clicar('areaSemCampo'); expect(visivel()).toBeFalse();
    expect((elemento('valorFoco') as HTMLInputElement).value).toBe('75');
    clicar('valorFoco'); expect(visivel()).toBeTrue();
  });

  it('limpa ao trocar de guia e reaparece apenas quando outro campo recebe foco', () => {
    const { fixture, foco, clicar, visivel } = preparar();
    foco('valorFoco');
    clicar('outraGuia');
    expect(visivel()).toBeFalse();
    expect(fixture.nativeElement.querySelector('#valorFoco')).toBeNull();
    foco('prazoFoco');
    expect(visivel()).toBeTrue();
    expect(fixture.nativeElement.querySelector('.field-help-title').textContent.trim()).toBe('Prazo de entrega (dias)');
  });

  it('limpa ao perder foco e ao navegar pelo teclado para um botão', () => {
    const { fixture, elemento, foco, visivel } = preparar();
    foco('valorFoco');
    elemento('valorFoco').dispatchEvent(new Event('blur'));
    fixture.detectChanges(); expect(visivel()).toBeFalse();
    foco('valorFoco');
    elemento('outraGuia').dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    fixture.detectChanges(); expect(visivel()).toBeFalse();
  });

  it('não apaga a ajuda de outro campo ao destruir o campo anterior', () => {
    const { fixture, foco, visivel } = preparar();
    foco('valorFoco'); foco('prazoFoco');
    fixture.componentInstance.primeiraGuia = false;
    fixture.detectChanges();
    expect(visivel()).toBeTrue();
    expect(fixture.nativeElement.querySelector('.field-help-title').textContent.trim()).toBe('Prazo de entrega (dias)');
    fixture.destroy();
    let estado: FieldHelpState | null = null;
    const sub = TestBed.inject(FieldHelpService).state$.subscribe(valor => estado = valor);
    expect(estado).toBeNull(); sub.unsubscribe();
  });
});

describe('Ajuda objetiva dos campos dos modais', () => {
  it('exibe explicações das opções em vez da descrição genérica de origem', () => {
    TestBed.configureTestingModule({providers: [provideZoneChangeDetection()],  imports: [FormularioAjudaTeste] });
    const fixture = TestBed.createComponent(FormularioAjudaTeste); fixture.detectChanges();
    const service = TestBed.inject(FieldHelpService);
    let estado: FieldHelpState | null = null;
    const sub = service.state$.subscribe(valor => estado = valor);
    const select: HTMLElement = fixture.nativeElement.querySelector('#origemTeste');
    select.dispatchEvent(new Event('focus'));
    expect(estado!.mensagem).toContain('Bonificação: peças gratuitas.');
    select.setAttribute('data-help-options', 'Inventário: contagem física.');
    select.dispatchEvent(new Event('change'));
    expect(estado!.mensagem).toBe('Inventário: contagem física.');
    select.dispatchEvent(new Event('blur')); expect(estado).toBeNull();
    sub.unsubscribe(); fixture.destroy();
  });
  it('explica o custo de aquisição e encontra o rótulo de campos sem for e de checkboxes', () => {
    TestBed.configureTestingModule({providers: [provideZoneChangeDetection()],  imports: [FormularioAjudaTeste] });
    const fixture = TestBed.createComponent(FormularioAjudaTeste);
    fixture.detectChanges();
    let estado: FieldHelpState | null = null;
    const sub = TestBed.inject(FieldHelpService).state$.subscribe(valor => estado = valor);
    const focar = (id: string) => fixture.nativeElement.querySelector(`#${id}`).dispatchEvent(new Event('focus'));
    focar('custo');
    expect(estado!.titulo).toBe('Valor unitário');
    expect(estado!.mensagem).toBe('Preço pago pela oficina ao fornecedor por uma unidade da peça.');
    focar('semRotuloAssociado');
    expect(estado!.titulo).toBe('KM de saída');
    expect(estado!.mensagem).toContain('ao concluir o atendimento');
    focar('regraAtiva');
    expect(estado!.mensagem).toContain('regra de manutenção');
    focar('especifico');
    expect(estado!.mensagem).toBe('Detalhe específico da operação.');
    sub.unsubscribe();
  });

  it('distingue nomes e fabricantes por contexto, sem confundir preço de venda e de compra', () => {
    expect(obterAjudaCampo('Nome *', 'modalNovoUsuario')).toContain('Nome completo');
    expect(obterAjudaCampo('Nome *', 'modalCadastroServico')).toContain('atividade');
    expect(obterAjudaCampo('Fabricante *', 'modalCadastroVeiculo')).toContain('veículo');
    expect(obterAjudaCampo('Valor unitário *', 'modalCadastroFornecimento')).toContain('pago pela oficina');
    expect(obterAjudaCampo('Unitário', 'modalPecaAgendamento')).toContain('cobrado do cliente');
  });

  it('explica campos técnicos, limites de estoque e ações de auditoria', () => {
    for (const campo of ['Origem do óleo', 'Viscosidade SAE', 'Classificação API', 'Classificação ACEA', 'Norma / aprovação OEM', 'Estoque Mínimo', 'Estoque Crítico', 'Quantidade Reservada', 'Prazo de entrega (dias)', 'Justificativa do reset', 'Justificativa da exclusão', 'Justificativa da decisão']) {
      const ajuda = obterAjudaCampo(campo);
      expect(ajuda).withContext(campo).not.toBeNull();
      expect(ajuda).withContext(campo).not.toContain('Este campo');
    }
  });
});
