import { Directive, ElementRef, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, Renderer2 } from '@angular/core';

export type TipoFeedback = 'sucesso' | 'erro' | 'aviso';

/** Temporiza somente confirmações; fechar a mensagem não altera o estado da operação. */
@Directive({ selector: '[appFeedback]', standalone: true })
export class FeedbackDirective implements OnInit, OnChanges, OnDestroy {
  @Input('appFeedback') mensagem = '';
  @Input() tipoFeedback: TipoFeedback = 'sucesso';
  @Output() feedbackFechado = new EventEmitter<void>();
  private timer?: ReturnType<typeof setTimeout>;
  private restante = 5000;
  private iniciouEm = 0;
  private pausas = new Set<string>();
  private ouvintes: (() => void)[] = [];
  private fechado = false;
  private displayOriginal: string;

  constructor(private elemento: ElementRef<HTMLElement>, private renderer: Renderer2) {
    this.displayOriginal = elemento.nativeElement.style.display;
  }

  ngOnInit(): void {
    const el = this.elemento.nativeElement;
    this.renderer.addClass(el, 'alert-dismissible');
    const botao = this.renderer.createElement('button') as HTMLButtonElement;
    this.renderer.setAttribute(botao, 'type', 'button');
    this.renderer.setAttribute(botao, 'aria-label', 'Fechar mensagem');
    this.renderer.addClass(botao, 'btn-close');
    this.renderer.appendChild(el, botao);
    this.ouvintes.push(this.renderer.listen(botao, 'click', () => this.fechar()));
    this.ouvintes.push(this.renderer.listen(el, 'mouseenter', () => this.pausar('mouse')));
    this.ouvintes.push(this.renderer.listen(el, 'mouseleave', () => this.retomar('mouse')));
    this.ouvintes.push(this.renderer.listen(el, 'focusin', () => this.pausar('foco')));
    this.ouvintes.push(this.renderer.listen(el, 'focusout', (e: FocusEvent) => {
      if (!el.contains(e.relatedTarget as Node | null)) this.retomar('foco');
    }));
  }

  ngOnChanges(): void {
    this.cancelarTimer(); this.fechado = false; this.restante = 5000;
    const el = this.elemento.nativeElement;
    this.renderer.setStyle(el, 'display', this.displayOriginal);
    this.renderer.setAttribute(el, 'role', this.tipoFeedback === 'sucesso' ? 'status' : 'alert');
    this.renderer.setAttribute(el, 'aria-live', this.tipoFeedback === 'sucesso' ? 'polite' : 'assertive');
    this.renderer.setAttribute(el, 'aria-atomic', 'true');
    this.agendar();
  }

  private agendar(): void {
    if (!this.mensagem || this.fechado || this.tipoFeedback !== 'sucesso' || this.pausas.size) return;
    this.iniciouEm = Date.now();
    this.timer = setTimeout(() => this.fechar(), this.restante);
  }
  private pausar(origem: string): void {
    if (this.timer) this.restante = Math.max(0, this.restante - (Date.now() - this.iniciouEm));
    this.cancelarTimer(); this.pausas.add(origem);
  }
  private retomar(origem: string): void { this.pausas.delete(origem); if (!this.timer) this.agendar(); }
  private cancelarTimer(): void { if (this.timer) clearTimeout(this.timer); this.timer = undefined; }
  private fechar(): void {
    if (this.fechado) return;
    this.cancelarTimer(); this.fechado = true;
    this.renderer.setStyle(this.elemento.nativeElement, 'display', 'none');
    this.feedbackFechado.emit();
  }
  ngOnDestroy(): void { this.cancelarTimer(); this.ouvintes.forEach(remover => remover()); }
}
