import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { NavigationStart, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TipoFeedback } from './feedback.directive';

export interface Notificacao { id: number; mensagem: string; tipo: TipoFeedback; }

@Injectable({ providedIn: 'root' })
export class NotificacaoService {
  private readonly lista = signal<Notificacao[]>([]);
  readonly mensagens = this.lista.asReadonly();
  private proximoId = 0;
  constructor() {
    const router = inject(Router, { optional: true });
    const destroyRef = inject(DestroyRef);
    router?.events.pipe(takeUntilDestroyed(destroyRef)).subscribe(evento => {
      if (evento instanceof NavigationStart) this.limpar();
    });
  }
  sucesso(mensagem: string): void { this.adicionar(mensagem, 'sucesso'); }
  erro(mensagem: string): void { this.adicionar(mensagem, 'erro'); }
  aviso(mensagem: string): void { this.adicionar(mensagem, 'aviso'); }
  private adicionar(mensagem: string, tipo: TipoFeedback): void {
    if (mensagem?.trim()) this.lista.update(lista => [...lista, { id: ++this.proximoId, mensagem, tipo }]);
  }
  fechar(id: number): void { this.lista.update(lista => lista.filter(mensagem => mensagem.id !== id)); }
  limpar(): void { this.lista.set([]); }
}
