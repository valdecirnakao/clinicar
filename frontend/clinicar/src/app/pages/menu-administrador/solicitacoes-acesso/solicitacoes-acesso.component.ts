import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { PaginaSolicitacoes, SolicitacaoAcesso, SolicitacoesAcessoService, mensagemSolicitacao } from '../../../services/solicitacoes-acesso.service';
declare const bootstrap: any;

@Component({ selector: 'app-solicitacoes-acesso', standalone: true, imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './solicitacoes-acesso.component.html', styleUrl: './solicitacoes-acesso.component.css' })
export class SolicitacoesAcessoComponent implements OnInit {
  private readonly service = inject(SolicitacoesAcessoService);
  pagina: PaginaSolicitacoes | null = null;
  status = 'PENDENTE'; tamanho = 10; carregando = false; salvando = false;
  erro = ''; sucesso = ''; erroDecisao = ''; bloqueada = false;
  selecionada: SolicitacaoAcesso | null = null;
  decisao = ''; justificativa = ''; private modal: any;
  get podeConfirmar(): boolean {
    const tamanho = this.justificativa.trim().length;
    return !!this.selecionada && ['APROVAR', 'RECUSAR'].includes(this.decisao)
      && tamanho >= 10 && tamanho <= 1000 && !this.salvando && !this.bloqueada;
  }
  ngOnInit(): void { this.carregar(); }
  carregar(numero = 0): void {
    if (this.carregando) return;
    this.carregando = true; this.erro = '';
    this.service.listar(this.status, numero, this.tamanho).subscribe({
      next: pagina => { this.pagina = pagina; this.carregando = false; },
      error: erro => { this.carregando = false; this.pagina = null; this.erro = mensagemSolicitacao(erro, 'Não foi possível consultar as solicitações.'); }
    });
  }
  avaliar(item: SolicitacaoAcesso): void {
    if (this.salvando || item.status !== 'PENDENTE') return;
    this.selecionada = item; this.decisao = ''; this.justificativa = ''; this.erroDecisao = ''; this.bloqueada = false;
    const elemento = document.getElementById('modalDecisaoSolicitacao');
    if (elemento) { this.modal = bootstrap.Modal.getOrCreateInstance(elemento, { backdrop: 'static', keyboard: false }); this.modal.show(); }
  }
  confirmar(): void {
    if (!this.podeConfirmar || !this.selecionada) return;
    this.salvando = true; this.erroDecisao = '';
    this.service.decidir(this.selecionada.id, this.decisao, this.justificativa.trim()).subscribe({
      next: resposta => {
        this.salvando = false; this.modal?.hide(); this.selecionada = null;
        this.sucesso = resposta.status !== 'APROVADA' ? 'Solicitação recusada. A decisão foi registrada.' : resposta.tipo === 'TEMPORARIA' ? (resposta.situacaoPeriodo === 'EM_CURSO' ? 'Suspensão temporária aprovada e iniciada. O retorno seguirá o período aprovado.' : 'Suspensão temporária aprovada e agendada para o período solicitado.') : 'Solicitação aprovada. O acesso foi inativado e as sessões foram encerradas.';
        this.carregar();
      },
      error: erro => {
        this.salvando = false; this.erroDecisao = mensagemSolicitacao(erro, 'Não foi possível registrar a decisão.');
        if ([403, 404, 409].includes(erro.status)) { this.bloqueada = true; this.carregar(); }
      }
    });
  }
}
