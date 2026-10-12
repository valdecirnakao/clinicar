
import { DestroyRef, Injectable, inject, DOCUMENT } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BehaviorSubject, fromEvent } from 'rxjs';
import { obterAjudaGuia, obterAjudaModal } from './tab-help-content';

export interface FieldHelpState {
  titulo: string;
  mensagem: string;
  modal?: HTMLElement | null;
  escopo?: HTMLElement | null;
}

@Injectable({ providedIn: 'root' })
export class FieldHelpService {
  private readonly documento = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);
  private origem: HTMLElement | null = null;
  private navegacaoPendente?: ReturnType<typeof setTimeout>;
  private readonly seletorCampo = 'input.form-control, select.form-select, textarea.form-control, input.form-check-input, button[data-help]';
  private readonly stateSubject = new BehaviorSubject<FieldHelpState | null>(null);
  readonly state$ = this.stateSubject.asObservable();

  constructor() {
    fromEvent(this.documento, 'click').pipe(takeUntilDestroyed(this.destroyRef)).subscribe(evento => {
      const alvo = evento.target;
      if (!(alvo instanceof Element)) { this.limpar(); return; }
      const guia = alvo.closest<HTMLButtonElement>('button[data-help-guia]');
      if (guia && !guia.disabled) { this.exibirGuia(guia); return; }
      const navegacao = alvo.closest<HTMLButtonElement>('button[data-help-navegacao]');
      const modal = navegacao?.closest<HTMLElement>('.modal, [data-help-scope]');
      if (modal && navegacao && !navegacao.disabled) {
        this.limpar();
        this.navegacaoPendente = setTimeout(() => {
          this.navegacaoPendente = undefined;
          const ativa = Array.from(modal.querySelectorAll<HTMLElement>('button[data-help-guia].active')).find(botao => botao.closest('.modal, [data-help-scope]') === modal);
          if (modal.isConnected && ativa) this.exibirGuia(ativa);
        }, 0);
        return;
      }
      const rotulo = alvo.closest('label');
      const campo = alvo.closest(this.seletorCampo) || rotulo?.control;
      if (!campo?.matches(this.seletorCampo)) this.limpar();
    });
    fromEvent(this.documento, 'focusin').pipe(takeUntilDestroyed(this.destroyRef)).subscribe(evento => {
      if (!(evento.target instanceof Element) || !evento.target.matches(this.seletorCampo)) this.limpar();
    });
    fromEvent(this.documento, 'show.bs.modal').pipe(takeUntilDestroyed(this.destroyRef)).subscribe(evento => {
      if (evento.target instanceof HTMLElement && evento.target.matches('.modal')) this.limpar();
    });
    fromEvent(this.documento, 'shown.bs.modal').pipe(takeUntilDestroyed(this.destroyRef)).subscribe(evento => {
      const modal = evento.target;
      if (!(modal instanceof HTMLElement) || !modal.matches('.modal')) return;
      if (this.origem?.matches(this.seletorCampo) && this.origem.closest('.modal') === modal && this.documento.activeElement === this.origem) return;
      this.limpar();
      if (!Array.from(modal.querySelectorAll('app-field-help-panel')).some(painel => painel.closest('.modal') === modal)) return;
      const titulo = Array.from(modal.querySelectorAll('.modal-title')).find(elemento => elemento.closest('.modal') === modal)?.textContent?.replace(/\s+/g, ' ').trim() || '';
      const ajuda = obterAjudaModal(titulo, modal.id);
      if (ajuda) this.exibir(ajuda.titulo, ajuda.mensagem, modal);
      else {
        const guia = Array.from(modal.querySelectorAll<HTMLElement>('button[data-help-guia].active')).find(botao => botao.closest('.modal') === modal);
        if (guia) this.exibirGuia(guia);
      }
    });
    fromEvent(this.documento, 'hidden.bs.modal').pipe(takeUntilDestroyed(this.destroyRef)).subscribe(evento => {
      if (evento.target instanceof HTMLElement && this.origem?.closest('.modal') === evento.target) this.limpar();
    });
    this.destroyRef.onDestroy(() => clearTimeout(this.navegacaoPendente));
  }

  private exibirGuia(botao: HTMLElement): void {
    const ajuda = obterAjudaGuia(botao.dataset['helpGuia'] || '', botao.closest('.modal')?.id || botao.closest('[data-help-scope]')?.getAttribute('data-help-scope') || '');
    if (ajuda) this.exibir(ajuda.titulo, ajuda.mensagem, botao);
    else this.limpar();
  }

  exibir(titulo: string, mensagem: string, origem?: HTMLElement): void {
    clearTimeout(this.navegacaoPendente);
    this.origem = origem ?? null;
    this.stateSubject.next({ titulo, mensagem, modal: origem?.closest<HTMLElement>('.modal') ?? null,
      escopo: origem?.closest<HTMLElement>('[data-help-scope]') ?? null });
  }

  limpar(origem?: HTMLElement): void {
    if (origem && origem !== this.origem) return;
    clearTimeout(this.navegacaoPendente);
    this.origem = null;
    this.stateSubject.next(null);
  }
}
