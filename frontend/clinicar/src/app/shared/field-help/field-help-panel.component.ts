import { CommonModule } from '@angular/common';
import { Component, ElementRef, Input, inject } from '@angular/core';
import { map } from 'rxjs';
import { FieldHelpService } from './field-help.service';
import { obterAjudaModal } from './tab-help-content';

@Component({
    selector: 'app-field-help-panel',
    imports: [CommonModule],
    template: `
    @if (ajuda$ | async; as ajuda) {
      <div class="field-help-panel" role="status" aria-live="polite">
        <i class="bi bi-info-circle field-help-icon" aria-hidden="true"></i>
        <div class="field-help-content">
          <div class="field-help-title">{{ ajuda.titulo }}</div>
          <div class="field-help-text">{{ ajuda.mensagem }}</div>
        </div>
      </div>
    }

    `,
    styles: [`
    :host {
      display: block;
      height: var(--clinicar-help-height, 6.25rem);
      min-height: var(--clinicar-help-height, 6.25rem);
      flex: 0 0 var(--clinicar-help-height, 6.25rem);
      margin-bottom: .85rem;
    }

    .field-help-panel {
      display: flex;
      gap: .65rem;
      align-items: flex-start;
      padding: .7rem .85rem;
      height: 100%;
      box-sizing: border-box;
      overflow-y: auto;
      overflow-wrap: anywhere;
      border: 1px solid #d0e2f2;
      border-radius: 10px;
      background: #eef6ff;
      color: #35689b;
    }

    .field-help-default {
      color: #557898;
    }

    .field-help-icon {
      margin-block: auto;
      flex-shrink: 0;
      font-size: 1rem;
    }

    .field-help-content {
      margin-block: auto;
      min-width: 0;
    }

    .field-help-title {
      font-weight: 700;
      line-height: 1.2;
      margin-bottom: .15rem;
    }

    .field-help-text {
      white-space: pre-line;
      font-size: .9rem;
      line-height: 1.35;
    }

    @media (max-width: 575.98px) {
      :host { --clinicar-help-height: 8.25rem; }
    }
  `]
})
export class FieldHelpPanelComponent {
  readonly fieldHelpService = inject(FieldHelpService);
  private readonly elemento: ElementRef<HTMLElement> = inject(ElementRef);
  readonly ajuda$ = this.fieldHelpService.state$.pipe(map(ajuda => {
    const modal = this.elemento.nativeElement.closest('.modal');
    const escopo = this.elemento.nativeElement.closest('[data-help-scope]');
    if (modal) {
      if (ajuda?.modal === modal) return ajuda;
      const modais = Array.from(modal.ownerDocument.querySelectorAll<HTMLElement>('.modal.show'));
      if (!modal.classList.contains('show') || modais.at(-1) !== modal) return null;
      const titulo = Array.from(modal.querySelectorAll('.modal-title')).find(elemento => elemento.closest('.modal') === modal)?.textContent?.replace(/\s+/g, ' ').trim() || '';
      return obterAjudaModal(titulo, modal.id) || {
        titulo: titulo || 'Informações do modal',
        mensagem: 'Confira as informações do registro e as opções disponíveis neste modal antes de continuar.'
      };
    }
    if (!ajuda) return null;
    return !ajuda.modal && (escopo ? ajuda.escopo === escopo : !ajuda.escopo) ? ajuda : null;
  }));

  @Input() defaultText = 'Selecione ou preencha um campo para visualizar uma orientação contextual.';
}
