import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FieldHelpDirective } from './field-help.directive';
import { FieldHelpPanelComponent } from './field-help-panel.component';

@Component({
    imports: [FieldHelpDirective, FieldHelpPanelComponent], template: `
  <section data-help-scope="manutencao"><app-field-help-panel></app-field-help-panel>
    <label for="horario">Antecedência (dias) *</label><input id="horario" class="form-control">
  </section>
  <section data-help-scope="estoque"><app-field-help-panel></app-field-help-panel>
    <label for="horario">Intervalo entre lembretes (horas) *</label><input id="horario" class="form-control">
  </section>
  <div class="modal"><app-field-help-panel></app-field-help-panel>
    <label>Observações<input class="form-control" data-help="Anote a justificativa desta operação."></label>
  </div>`
})
class FormularioEscopoTeste {}

describe('Ajuda isolada por formulário', () => {
  it('exibe o texto somente no formulário focado e resolve rótulos dentro dele', () => {
    const fixture = TestBed.createComponent(FormularioEscopoTeste); fixture.detectChanges();
    const manutencao = fixture.nativeElement.querySelector('[data-help-scope="manutencao"]');
    const estoque = fixture.nativeElement.querySelector('[data-help-scope="estoque"]');
    manutencao.querySelector('input').dispatchEvent(new Event('focus')); fixture.detectChanges();
    expect(manutencao.querySelector('.field-help-text').textContent).toContain('antes da data');
    expect(estoque.querySelector('.field-help-panel')).toBeNull();
    estoque.querySelector('input').dispatchEvent(new Event('focus')); fixture.detectChanges();
    expect(manutencao.querySelector('.field-help-panel')).toBeNull();
    expect(estoque.querySelector('.field-help-title').textContent).toContain('lembretes (horas)');
    expect(estoque.querySelector('.field-help-text').textContent).toContain('24 significa um dia');
    const modal = fixture.nativeElement.querySelector('.modal');
    modal.querySelector('input').dispatchEvent(new Event('focus')); fixture.detectChanges();
    expect(estoque.querySelector('.field-help-panel')).toBeNull();
    expect(modal.querySelector('.field-help-text').textContent).toBe('Anote a justificativa desta operação.');
  });
});
