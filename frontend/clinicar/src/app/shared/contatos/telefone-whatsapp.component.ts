import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { exibirTelefoneFormatado, telefoneWhatsappValido } from './telefone-whatsapp';

@Component({
    selector: 'app-telefone-whatsapp', imports: [CommonModule],
    template: `<div class="telefone">{{ formatar(telefone) || 'Não informado' }}</div>
    <span class="badge whatsapp-badge" [ngClass]="valido(telefone)
      ? 'bg-success-subtle text-success border border-success-subtle'
      : 'bg-warning-subtle text-warning border border-warning-subtle'">
      <i class="bi bi-whatsapp me-1" aria-hidden="true"></i>{{ valido(telefone) ? 'WhatsApp' : 'Verificar telefone' }}
    </span>`,
    styles: [':host{display:block}.telefone{white-space:nowrap}.whatsapp-badge{margin-top:.2rem;font-weight:600;white-space:nowrap}']
})
export class TelefoneWhatsappComponent {
  @Input() telefone: string | null | undefined;
  readonly formatar = exibirTelefoneFormatado;
  readonly valido = telefoneWhatsappValido;
}
