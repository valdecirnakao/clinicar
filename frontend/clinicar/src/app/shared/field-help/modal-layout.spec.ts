import { provideZoneChangeDetection } from '@angular/core';
import { Component } from '@angular/core';

import { TestBed } from '@angular/core/testing';
import { FieldHelpPanelComponent } from './field-help-panel.component';
import { FieldHelpService } from './field-help.service';

@Component({
    imports: [FieldHelpPanelComponent], template: `
  <div class="modal" style="display:block; position:static" id="layoutModal">
    <div class="modal-dialog"><div class="modal-content">
      <div class="modal-header">Cadastro</div>
      <div class="modal-body">
        <div class="teste-modal-tabs-area"><app-field-help-panel></app-field-help-panel>
          <button data-help-guia="dados">Dados</button><button data-help-guia="revisao">Revisão</button>
        </div>
        <div class="teste-modal-scroll-area"><div [style.height.px]="alturaGuia">Campos</div></div>
      </div>
      <div class="modal-footer"><button>Salvar</button></div>
    </div></div>
  </div>
  <div class="modal" style="display:block; position:static" id="selecaoModal">
    <div class="modal-dialog"><div class="modal-content"><div class="modal-body">
      <app-field-help-panel></app-field-help-panel><input id="busca" placeholder="Buscar">
    </div></div></div>
  </div>`
})
class ModalLayoutTeste { alturaGuia = 40; }

describe('Estabilidade vertical dos modais', () => {
  function preparar() {
    TestBed.configureTestingModule({providers: [provideZoneChangeDetection()],  imports: [ModalLayoutTeste] });
    const fixture = TestBed.createComponent(ModalLayoutTeste); fixture.detectChanges();
    // Attach to the document for real Chrome layout measurements.
    document.body.appendChild(fixture.nativeElement);
    const ajuda = TestBed.inject(FieldHelpService);
    const modal: HTMLElement = fixture.nativeElement.querySelector('#layoutModal');
    return { fixture, ajuda, modal };
  }
  it('mantém guias e rodapé no mesmo lugar com ajuda vazia, curta e longa', () => {
    const { fixture, ajuda, modal } = preparar();
    const posicoes = () => [modal.querySelector('[data-help-guia]')!.getBoundingClientRect().top, modal.querySelector('.modal-footer')!.getBoundingClientRect().top];
    const inicial = posicoes();
    expect(modal.querySelector('app-field-help-panel')!.getBoundingClientRect().height).toBeGreaterThan(0);
    ajuda.exibir('Nome', 'Nome do registro.', modal); fixture.detectChanges(); expect(posicoes()).toEqual(inicial);
    ajuda.exibir('Orientação', 'Texto de orientação completo. '.repeat(100), modal); fixture.detectChanges(); expect(posicoes()).toEqual(inicial);
    const painel = modal.querySelector('.field-help-panel') as HTMLElement;
    expect(painel.scrollHeight).toBeGreaterThan(painel.clientHeight); expect(getComputedStyle(painel).overflowY).toBe('auto');
    ajuda.limpar(); fixture.detectChanges(); expect(modal.querySelector('.field-help-panel')).toBeNull(); expect(posicoes()).toEqual(inicial);
    fixture.destroy();
  });
  it('mantém a altura e as âncoras do modal ao trocar uma guia curta por conteúdo extenso', () => {
    const { fixture, modal } = preparar();
    const rect = () => [modal.querySelector('.modal-content')!.getBoundingClientRect().top, modal.querySelector('.modal-content')!.getBoundingClientRect().height, modal.querySelector('.modal-footer')!.getBoundingClientRect().top];
    const inicial = rect(); fixture.componentInstance.alturaGuia = 1500; fixture.detectChanges();
    expect(rect()).toEqual(inicial);
    const corpo = modal.querySelector('.modal-body') as HTMLElement;
    const area = getComputedStyle(corpo).display === 'block' ? corpo : modal.querySelector('.teste-modal-scroll-area') as HTMLElement;
    expect(area.scrollHeight).toBeGreaterThan(area.clientHeight); fixture.destroy();
  });
  it('reserva o espaço também nas seleções e não transfere mensagens de outro modal', () => {
    const { fixture, ajuda, modal } = preparar();
    const selecao = fixture.nativeElement.querySelector('#selecaoModal');
    const posicao = selecao.querySelector('input').getBoundingClientRect().top;
    ajuda.exibir('Guia', 'Ajuda de outro modal', modal); fixture.detectChanges();
    expect(selecao.querySelector('.field-help-panel')).toBeNull();
    ajuda.exibir('Busca', 'Pesquise o item a selecionar.', selecao); fixture.detectChanges();
    expect(selecao.querySelector('input').getBoundingClientRect().top).toBe(posicao);
    ajuda.limpar(); fixture.detectChanges(); expect(selecao.querySelector('input').getBoundingClientRect().top).toBe(posicao); fixture.destroy();
  });
});
