import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

interface CorrecaoVeiculo {
  id: number; veiculoId: number; clienteId: number; placaAnterior: string; fabricanteAnterior: string;
  modeloAnterior: string; anoModeloCombustivelAnterior: string; placaSolicitada: string;
  fabricanteSolicitado: string; modeloSolicitado: string; anoModeloCombustivelSolicitado: string;
  justificativa: string; solicitadoEm: string; status: string;
}
interface PaginaCorrecao { content: CorrecaoVeiculo[]; number: number; totalElements: number; totalPages: number }

@Component({
  selector: 'app-correcoes-veiculos', standalone: true, imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './correcoes-veiculos.component.html', styleUrl: './correcoes-veiculos.component.css'
})
export class CorrecoesVeiculosComponent implements OnInit {
  private readonly http = inject(HttpClient);
  pagina: PaginaCorrecao | null = null;
  selecionada: CorrecaoVeiculo | null = null;
  decisao: 'APROVAR' | 'RECUSAR' = 'APROVAR';
  justificativa = ''; carregando = false; salvando = false; erro = ''; mensagem = '';
  ngOnInit(): void { this.carregar(); }
  carregar(numero = 0): void {
    this.carregando = true; this.erro = '';
    this.http.get<PaginaCorrecao>('/api/veiculo/solicitacoes-correcao', {
      withCredentials: true, params: { pagina: numero, tamanho: 10 }
    }).subscribe({
      next: pagina => { this.pagina = pagina; this.carregando = false; },
      error: () => { this.carregando = false; this.erro = 'Não foi possível consultar as correções solicitadas.'; }
    });
  }
  avaliar(item: CorrecaoVeiculo): void {
    this.selecionada = item; this.decisao = 'APROVAR'; this.justificativa = ''; this.erro = ''; this.mensagem = '';
  }
  confirmar(): void {
    if (!this.selecionada || !this.justificativa.trim() || this.salvando) return;
    this.salvando = true; this.erro = '';
    this.http.post(`/api/veiculo/solicitacoes-correcao/${this.selecionada.id}/decisao`,
      { decisao: this.decisao, justificativa: this.justificativa.trim() }, { withCredentials: true }).subscribe({
      next: () => { this.salvando = false; this.selecionada = null; this.mensagem = 'Decisão registrada com sucesso.'; this.carregar(this.pagina?.number || 0); },
      error: erro => { this.salvando = false; this.erro = erro?.error?.mensagem || 'Não foi possível registrar a decisão.'; }
    });
  }
}
