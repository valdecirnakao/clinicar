import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LoginService, UsuarioLogado } from '../login/login.service';
import { PaginaSolicitacoes, SolicitacoesAcessoService, mensagemSolicitacao } from '../../services/solicitacoes-acesso.service';

@Component({ selector: 'app-minha-conta', standalone: true, imports: [CommonModule, FormsModule],
  templateUrl: './minha-conta.component.html', styleUrl: './minha-conta.component.css' })
export class MinhaContaComponent implements OnInit {
  private readonly login = inject(LoginService);
  private readonly service = inject(SolicitacoesAcessoService);
  private readonly router = inject(Router);
  usuario: UsuarioLogado | null = null;
  pagina: PaginaSolicitacoes | null = null;
  tipo = 'INATIVACAO'; justificativa = ''; confirmo = false; inicioPeriodo = ''; fimPeriodo = '';
  get hoje(): string {
    const partes = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
    const valor = (tipo: string) => partes.find(p => p.type === tipo)?.value;
    return `${valor('year')}-${valor('month')}-${valor('day')}`;
  }
  get periodoValido(): boolean { return this.tipo !== 'TEMPORARIA' || (this.usuario?.tipo_do_acesso === 'COLABORADOR' && !!this.inicioPeriodo && !!this.fimPeriodo && this.inicioPeriodo >= this.hoje && this.fimPeriodo >= this.inicioPeriodo && this.fimPeriodo <= '9999-12-30'); }
  carregando = false; enviando = false; erro = ''; sucesso = ''; erroHistorico = '';
  get podeEnviar(): boolean {
    const tamanho = this.justificativa.trim().length;
    return !!this.usuario && !!this.pagina && this.pagina.pendentes === 0 && !this.enviando && !this.carregando
      && this.periodoValido && this.confirmo && tamanho >= 10 && tamanho <= 1000;
  }
  ngOnInit(): void {
    this.login.obterUsuarioLogado().subscribe({ next: usuario => { this.usuario = usuario; this.carregar(); },
      error: () => void this.router.navigate(['/login']) });
  }
  carregar(numero = 0): void {
    if (this.carregando) return;
    this.carregando = true; this.erroHistorico = '';
    this.service.minhas(numero).subscribe({
      next: pagina => { this.pagina = pagina; this.carregando = false; },
      error: erro => {
        this.carregando = false; this.pagina = null;
        this.erroHistorico = mensagemSolicitacao(erro, 'Não foi possível consultar suas solicitações. Tente atualizar.');
        if (erro.status === 401 || erro.status === 403) void this.router.navigate(['/login']);
      }
    });
  }
  enviar(): void {
    if (!this.podeEnviar) return;
    this.enviando = true; this.erro = ''; this.sucesso = '';
    this.service.criar(this.tipo, this.justificativa.trim(), this.inicioPeriodo, this.fimPeriodo).subscribe({
      next: () => {
        this.enviando = false; this.justificativa = ''; this.confirmo = false; this.inicioPeriodo = ''; this.fimPeriodo = '';
        this.sucesso = this.tipo === 'TEMPORARIA' ? 'Solicitação enviada. Aguarde a aprovação administrativa; a suspensão seguirá o período solicitado.' : 'Solicitação enviada. Seu acesso continuará ativo até a aprovação do administrador.';
        this.carregar();
      },
      error: erro => {
        this.enviando = false; this.erro = mensagemSolicitacao(erro, 'Não foi possível enviar a solicitação. Tente novamente.');
        if (erro.status === 409) this.carregar();
        if (erro.status === 401 || erro.status === 403) void this.router.navigate(['/login']);
      }
    });
  }
  sair(): void {
    this.login.logout().subscribe({ next: () => void this.router.navigate(['/login']), error: () => void this.router.navigate(['/login']) });
  }
}
