import { Directive, ElementRef, HostListener, OnDestroy, inject } from '@angular/core';
import { FieldHelpService } from './field-help.service';
import { obterAjudaCampo } from './field-help-content';

@Directive({
  selector: 'input.form-control, select.form-select, textarea.form-control, input.form-check-input, button[data-help]',
  standalone: true
})
export class FieldHelpDirective implements OnDestroy {
  private readonly elementRef = inject(ElementRef<HTMLElement>);
  private readonly fieldHelpService = inject(FieldHelpService);

  @HostListener('focus')
  @HostListener('click')
  aoReceberFoco(): void {
    const elemento = this.elementRef.nativeElement;
    const titulo = this.obterRotulo(elemento);
    const mensagemEspecifica = elemento.getAttribute('data-help')?.trim();
    const tituloLimpo = titulo.replace(/\s*\*\s*$/, '').trim() || 'Campo em preenchimento';

    const contexto = `${elemento.closest('.modal')?.id || ''} ${elemento.closest('[data-help-scope]')?.getAttribute('data-help-scope') || ''} ${elemento.id}`;
    const mensagem = elemento.getAttribute('data-help-options')?.trim() || mensagemEspecifica || obterAjudaCampo(tituloLimpo, contexto) || 'Informação usada para identificar ou detalhar este registro.';
    this.fieldHelpService.exibir(tituloLimpo, mensagem, elemento);
  }

  @HostListener('change')
  aoAlterarOpcao(): void {
    if (this.elementRef.nativeElement.matches('select[data-help-options]')) {
      this.aoReceberFoco();
    }
  }

  @HostListener('blur')
  aoPerderFoco(): void {
    this.fieldHelpService.limpar(this.elementRef.nativeElement);
  }

  ngOnDestroy(): void {
    this.fieldHelpService.limpar(this.elementRef.nativeElement);
  }

  private obterRotulo(elemento: HTMLElement): string {
    const rotuloEnvolvente = elemento.closest('label')?.textContent?.replace(/\s+/g, ' ').trim();
    if (rotuloEnvolvente) return rotuloEnvolvente;
    const id = elemento.id?.trim();

    if (id) {
      const escopo = elemento.closest('.modal, [data-help-scope]') || document;
      const label = escopo.querySelector(`label[for="${this.escaparSeletor(id)}"]`);
      const texto = label?.textContent?.replace(/\s+/g, ' ').trim();

      if (texto) {
        return texto;
      }
    }

    const container = elemento.closest('[class*="col-"], .mb-3, .form-check, .input-group');
    const labelProximo = container?.querySelector('label');
    const textoProximo = labelProximo?.textContent?.replace(/\s+/g, ' ').trim();

    return textoProximo || elemento.getAttribute('aria-label') || elemento.getAttribute('placeholder') || 'Campo em preenchimento';
  }

  private escaparSeletor(valor: string): string {
    return valor.replace(/([!"#$%&'()*+,./:;<=>?@[\\\]^`{|}~])/g, '\\$1');
  }
}
