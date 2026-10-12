import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface FieldHelpState {
  titulo: string;
  mensagem: string;
}

@Injectable({ providedIn: 'root' })
export class FieldHelpService {
  private readonly stateSubject = new BehaviorSubject<FieldHelpState | null>(null);
  readonly state$ = this.stateSubject.asObservable();

  exibir(titulo: string, mensagem: string): void {
    this.stateSubject.next({ titulo, mensagem });
  }

  limpar(): void {
    this.stateSubject.next(null);
  }
}
