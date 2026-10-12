import { CommonModule } from '@angular/common';
import { Component, Input, inject } from '@angular/core';
import { FieldHelpService } from './field-help.service';

@Component({
  selector: 'app-field-help-panel',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="field-help-panel" *ngIf="fieldHelpService.state$ | async as ajuda; else ajudaPadrao" role="status" aria-live="polite">
      <i class="bi bi-info-circle field-help-icon" aria-hidden="true"></i>
      <div>
        <div class="field-help-title">{{ ajuda.titulo }}</div>
        <div class="field-help-text">{{ ajuda.mensagem }}</div>
      </div>
    </div>

    <ng-template #ajudaPadrao>
      <div class="field-help-panel field-help-default" role="status" aria-live="polite">
        <i class="bi bi-info-circle field-help-icon" aria-hidden="true"></i>
        <div>
          <div class="field-help-title">Ajuda de preenchimento</div>
          <div class="field-help-text">{{ defaultText }}</div>
        </div>
      </div>
    </ng-template>
  `,
  styles: [`
    .field-help-panel {
      display: flex;
      gap: .65rem;
      align-items: flex-start;
      padding: .7rem .85rem;
      margin-bottom: .85rem;
      border: 1px solid #d0e2f2;
      border-radius: 10px;
      background: #eef6ff;
      color: #35689b;
    }

    .field-help-default {
      color: #557898;
    }

    .field-help-icon {
      margin-top: .1rem;
      font-size: 1rem;
    }

    .field-help-title {
      font-weight: 700;
      line-height: 1.2;
      margin-bottom: .15rem;
    }

    .field-help-text {
      font-size: .9rem;
      line-height: 1.35;
    }
  `]
})
export class FieldHelpPanelComponent {
  readonly fieldHelpService = inject(FieldHelpService);

  @Input() defaultText = 'Selecione ou preencha um campo para visualizar uma orientação contextual.';
}
