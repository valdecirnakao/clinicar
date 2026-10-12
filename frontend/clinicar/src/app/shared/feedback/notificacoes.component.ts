import { Component, inject } from '@angular/core';
import { FeedbackDirective } from './feedback.directive';
import { NotificacaoService } from './notificacao.service';

@Component({
    selector: 'app-notificacoes', imports: [FeedbackDirective],
    template: `
    <div class="notificacoes">
      @for (n of notificacoes.mensagens(); track n.id) {
        <div class="alert shadow-sm" [class.alert-success]="n.tipo === 'sucesso'"
          [class.alert-danger]="n.tipo === 'erro'" [class.alert-warning]="n.tipo === 'aviso'"
          [appFeedback]="n.mensagem" [tipoFeedback]="n.tipo" (feedbackFechado)="notificacoes.fechar(n.id)">
          <i class="bi me-2" [class.bi-check-circle]="n.tipo === 'sucesso'"
            [class.bi-exclamation-triangle]="n.tipo !== 'sucesso'" aria-hidden="true"></i>{{ n.mensagem }}
        </div>
      }
    </div>`,
    styles: [`
    .notificacoes { position:fixed; top:1rem; right:1rem; z-index:3000; width:min(480px, calc(100vw - 2rem)); max-height:calc(100dvh - 2rem); overflow-y:auto; pointer-events:none; }
    .alert { pointer-events:auto; white-space:pre-line; overflow-wrap:anywhere; border-radius:10px; margin-bottom:.5rem; }
  `]
})
export class NotificacoesComponent { readonly notificacoes = inject(NotificacaoService); }
