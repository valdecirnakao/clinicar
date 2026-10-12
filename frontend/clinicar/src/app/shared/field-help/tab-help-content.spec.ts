import { provideZoneChangeDetection } from '@angular/core';
import { Component } from '@angular/core';
import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { FieldHelpDirective } from './field-help.directive';
import { FieldHelpPanelComponent } from './field-help-panel.component';
import { obterAjudaGuia, obterAjudaSelecao, obterAjudaModal } from './tab-help-content';

@Component({
    imports: [FieldHelpDirective, FieldHelpPanelComponent], template: `
  <div class="modal" id="modalCadastroFornecimento">
    <app-field-help-panel></app-field-help-panel>
    <button id="vinculo" data-help-guia="vinculo" [class.active]="aba === 'vinculo'" (click)="aba = 'vinculo'">Vínculo</button>
    <button id="condicoes" data-help-guia="condicoes" [class.active]="aba === 'condicoes'" (click)="aba = 'condicoes'">Condições</button>
    <button id="proximo" data-help-navegacao (click)="aba = 'condicoes'">Próximo</button>
    <label for="valor">Valor unitário *</label><input id="valor" class="form-control">
    <div id="vazio">Área vazia</div>
  <div class="modal" id="selecao">
    <h5 class="modal-title">Selecionar Peça / Insumo</h5>
    <app-field-help-panel></app-field-help-panel>
    <input id="pesquisa" class="form-control" aria-label="Buscar">
  </div>
  </div>
  <div class="modal" id="modalContinuidadeFornecedor">
    <h5 class="modal-title">Continuar cadastro do fornecedor</h5>
    <app-field-help-panel></app-field-help-panel>
    <label for="tipo">O que este fornecedor vai fornecer?</label><select id="tipo" class="form-select"><option>Peça ou insumo</option></select>
  </div>
  <div class="modal" id="desconhecido"><h5 class="modal-title">Outro modal</h5><app-field-help-panel></app-field-help-panel></div>
`
})
class ModalGuiasTeste { aba = 'vinculo'; }

describe('Ajuda das guias e seleções', () => {
  function preparar() {
    TestBed.configureTestingModule({providers: [provideZoneChangeDetection()],  imports: [ModalGuiasTeste] });
    const fixture = TestBed.createComponent(ModalGuiasTeste);
    fixture.detectChanges();
    const elemento = (id: string): HTMLElement => fixture.nativeElement.querySelector(`#${id}`);
    const evento = (id: string, tipo: string) => { if (tipo === 'focus') elemento(id).focus(); elemento(id).dispatchEvent(new Event(tipo, { bubbles: true })); fixture.detectChanges(); };
    const titulo = () => fixture.nativeElement.querySelector('.field-help-title')?.textContent.trim();
    return { fixture, evento, titulo };
  }

  it('retorna à explicação geral do modal ao sair do campo e preserva a ajuda da guia selecionada', () => {
    const { fixture, evento } = preparar();
    document.body.appendChild(fixture.nativeElement);
    const modal: HTMLElement = fixture.nativeElement.querySelector('#modalCadastroFornecimento');
    modal.classList.add('show');
    const cabecalho = document.createElement('h5'); cabecalho.className = 'modal-title';
    cabecalho.textContent = 'Novo Fornecimento'; modal.prepend(cabecalho);
    evento('modalCadastroFornecimento', 'shown.bs.modal');
    const titulo = () => modal.querySelector('.field-help-title')?.textContent?.trim();
    expect(titulo()).toBe('Dados do fornecimento');
    evento('valor', 'focus'); expect(titulo()).toBe('Valor unitário');
    evento('valor', 'blur'); expect(titulo()).toBe('Dados do fornecimento');
    evento('condicoes', 'click'); expect(titulo()).toBe('Condições comerciais');
    evento('vazio', 'click'); expect(titulo()).toBe('Dados do fornecimento');
    fixture.destroy();
  });

  it('explica a guia inicial, a guia selecionada e depois o campo, ocultando ao clicar fora', () => {
    const { evento, titulo } = preparar();
    evento('modalCadastroFornecimento', 'shown.bs.modal'); expect(titulo()).toBe('Vínculo');
    evento('condicoes', 'click'); expect(titulo()).toBe('Condições comerciais');
    evento('valor', 'focus'); expect(titulo()).toBe('Valor unitário');
    evento('vazio', 'click'); expect(titulo()).toBeUndefined();
    evento('condicoes', 'click'); expect(titulo()).toBe('Condições comerciais');
  });

  it('explica a guia de destino ao avançar', fakeAsync(() => {
    const { fixture, evento, titulo } = preparar();
    evento('proximo', 'click'); tick(); fixture.detectChanges();
    expect(titulo()).toBe('Condições comerciais');
  }));

  it('orienta a seleção, respeita o campo em foco e limpa ao fechar', () => {
    const { evento, titulo } = preparar();
    evento('selecao', 'shown.bs.modal'); expect(titulo()).toBe('Selecionar peça ou insumo');
    evento('modalCadastroFornecimento', 'hidden.bs.modal'); expect(titulo()).toBe('Selecionar peça ou insumo');
    evento('pesquisa', 'focus'); expect(titulo()).toBe('Buscar');
    evento('selecao', 'shown.bs.modal'); expect(titulo()).toBe('Buscar');
    evento('selecao', 'hidden.bs.modal'); expect(titulo()).toBeUndefined();
  });

  it('cobre as etapas de todos os cadastros e diferencia seus contextos', () => {
    for (const guia of ['dados', 'contato', 'endereco', 'seguranca', 'revisao', 'veiculo', 'proprietario', 'classificacao', 'cobranca', 'fornecedor', 'vinculo', 'condicoes', 'identificacao', 'quantidades', 'reposicao', 'agendamento', 'atendimento', 'pecas', 'itens', 'adicionais', 'resumo', 'servicos']) {
      expect(obterAjudaGuia(guia, '')).withContext(guia).not.toBeNull();
    }
    expect(obterAjudaGuia('dados', 'modalNovoUsuario')!.mensagem).toContain('pessoa');
    expect(obterAjudaGuia('condicoes', 'modalNovoFornecimentoServico')!.mensagem).toContain('serviço');
    for (const titulo of ['Selecionar Peça/Insumo', 'Selecionar Serviço', 'Selecionar Fornecedor', 'Selecionar Proprietário', 'Adicionar Peça Prevista', 'Editar Peça ATD-123', 'Adicionar Serviço']) {
      expect(obterAjudaSelecao(titulo)).withContext(titulo).not.toBeNull();
    }
    expect(obterAjudaSelecao('Novo Fornecedor')).toBeNull();
  });

  it('substitui a ajuda anterior ao continuar o fornecedor e a mantém apenas no modal atual', () => {
    const { fixture, evento, titulo } = preparar();
    evento('valor', 'focus'); expect(titulo()).toBe('Valor unitário');
    expect(fixture.nativeElement.querySelector('#modalContinuidadeFornecedor .field-help-panel')).toBeNull();
    evento('modalContinuidadeFornecedor', 'show.bs.modal'); expect(titulo()).toBeUndefined();
    evento('modalContinuidadeFornecedor', 'shown.bs.modal'); expect(titulo()).toBe('Associar um item ao fornecedor');
    expect(fixture.nativeElement.querySelector('#modalCadastroFornecimento .field-help-panel')).toBeNull();
    evento('modalCadastroFornecimento', 'hidden.bs.modal'); expect(titulo()).toBe('Associar um item ao fornecedor');
    evento('tipo', 'focus'); expect(titulo()).toBe('O que este fornecedor vai fornecer?');
    evento('modalContinuidadeFornecedor', 'hidden.bs.modal'); expect(titulo()).toBeUndefined();
  });

  it('não conserva a explicação de outro modal quando não há orientação cadastrada', () => {
    const { evento, titulo } = preparar();
    evento('valor', 'focus');
    evento('desconhecido', 'shown.bs.modal'); expect(titulo()).toBeUndefined();
  });

  it('cobre os modais sem guias identificados na revisão do projeto', () => {
    for (const titulo of ['Continuar cadastro do fornecedor', 'Concluir atendimento', 'Cancelar Agendamento', 'Cancelar Atendimento', 'Analisar solicitação', 'Resetar autenticação em duas etapas?', 'Deletar usuário?', 'Inativar usuário?', 'Reativar usuário?', 'Enviar mensagem pelo WhatsApp?', 'Registrar Entrada de Estoque', 'Registrar Saída de Estoque', 'Registrar Ajuste de Entrada', 'Registrar Ajuste de Saída', 'Novo Local de Estoque']) {
      expect(obterAjudaModal(titulo)).withContext(titulo).not.toBeNull();
    }
    expect(obterAjudaModal('Nova Regra de Manutenção', 'modalRegraManutencao')!.mensagem).toContain('intervalos');
    expect(obterAjudaModal('Continuar cadastro do fornecedor', 'modalContinuidadePecaFornecedor')!.mensagem).toContain('quantidade mínima');
  });
});
