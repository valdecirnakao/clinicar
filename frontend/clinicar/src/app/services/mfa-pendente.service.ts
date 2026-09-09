import { Injectable } from '@angular/core';

export interface MfaPendente {
  mfaToken: string; mfaSetupNecessario: boolean;
  qrCodeDataUrl?: string; chaveManual?: string; mensagem?: string; email?: string;
}

@Injectable({ providedIn: 'root' })
export class MfaPendenteService {
  private pendente: MfaPendente | null = null;
  constructor() {
    // Limpeza de dados deixados pela versão anterior; nenhum segredo novo é persistido.
    sessionStorage.removeItem('mfaPendente');
  }
  guardar(dados: MfaPendente): void { this.pendente = dados; }
  retirar(): MfaPendente | null { const dados = this.pendente; this.pendente = null; return dados; }
  limpar(): void { this.pendente = null; }
}
