import { Directive, ElementRef, HostListener, inject } from '@angular/core';
import { FieldHelpService } from './field-help.service';

@Directive({
  selector: 'input.form-control, select.form-select, textarea.form-control',
  standalone: true
})
export class FieldHelpDirective {
  private readonly elementRef = inject(ElementRef<HTMLElement>);
  private readonly fieldHelpService = inject(FieldHelpService);

  @HostListener('focus')
  aoReceberFoco(): void {
    const elemento = this.elementRef.nativeElement;
    const titulo = this.obterRotulo(elemento);
    const mensagemEspecifica = elemento.getAttribute('data-help')?.trim();
    const obrigatorio = titulo.includes('*');
    const tituloLimpo = titulo.replace(/\s*\*\s*$/, '').trim() || 'Campo em preenchimento';

    const mensagem = mensagemEspecifica || this.mensagemPadrao(elemento, tituloLimpo, obrigatorio);
    this.fieldHelpService.exibir(tituloLimpo, mensagem);
  }

  private obterRotulo(elemento: HTMLElement): string {
    const id = elemento.id?.trim();

    if (id) {
      const label = document.querySelector(`label[for="${this.escaparSeletor(id)}"]`);
      const texto = label?.textContent?.replace(/\s+/g, ' ').trim();

      if (texto) {
        return texto;
      }
    }

    const container = elemento.closest('.col-12, .col-md-12, .col-md-9, .col-md-8, .col-md-6, .col-md-4, .col-md-3, .col-md-2, .mb-3');
    const labelProximo = container?.querySelector('label');
    const textoProximo = labelProximo?.textContent?.replace(/\s+/g, ' ').trim();

    return textoProximo || elemento.getAttribute('aria-label') || elemento.getAttribute('placeholder') || 'Campo em preenchimento';
  }

  private mensagemPadrao(elemento: HTMLElement, titulo: string, obrigatorio: boolean): string {
    const acao = elemento.tagName.toLowerCase() === 'select' ? 'Selecione' : 'Informe';
    const obrigatoriedade = obrigatorio
      ? 'Este campo é obrigatório para liberar o salvamento.'
      : 'Este campo é complementar e pode ser usado para detalhar o cadastro.';

    return `${acao} ${titulo.toLowerCase()}. ${obrigatoriedade}`;
  }

  private escaparSeletor(valor: string): string {
    return valor.replace(/([!"#$%&'()*+,./:;<=>?@[\\\]^`{|}~])/g, '\\$1');
  }
}
