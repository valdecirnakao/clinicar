import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../services/auth.service.ts.service';

@Component({
  selector: 'app-redefinir-senha',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule
  ],
  templateUrl: './redefinir-senha.component.html',
  styleUrl: './redefinir-senha.component.css'
})
export class RedefinirSenhaComponent implements OnInit {

  token = '';
  novaSenha = '';
  confirmarSenha = '';
  mostrarNovaSenha = false;
  mostrarConfirmarSenha = false;
  carregando = false;
  verificandoLink = false;
  linkIndisponivel = false;
  mensagemSucesso = '';
  mensagemErro = '';

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly authService: AuthService
  ) {}

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get('token') || '';

    if (!this.token) {
      this.mensagemErro = 'Token de redefinição não encontrado. Solicite um novo link de recuperação.';
      this.linkIndisponivel = true;
      return;
    }
    this.verificandoLink = true;
    this.authService.validarLinkRedefinicao(this.token).subscribe({
      next: () => { this.verificandoLink = false; },
      error: erro => {
        this.verificandoLink = false;
        this.linkIndisponivel = true;
        this.mensagemErro = this.formatarErro(erro?.error);
      }
    });
  }

  redefinirSenha(): void {
    if (this.carregando || this.verificandoLink || this.linkIndisponivel) return;
    this.mensagemSucesso = '';
    this.mensagemErro = '';

    if (!this.token) {
      this.mensagemErro = 'Token de redefinição não encontrado.';
      return;
    }

    if (!this.novaSenha || !this.confirmarSenha) {
      this.mensagemErro = 'Informe e confirme a nova senha.';
      return;
    }

    if (!this.senhaValida) {
      this.mensagemErro = 'A nova senha deve atender a todos os requisitos indicados.';
      return;
    }

    if (this.novaSenha !== this.confirmarSenha) {
      this.mensagemErro = 'A confirmação de senha não confere.';
      return;
    }

    this.carregando = true;

    this.authService.redefinirSenha({
      token: this.token,
      novaSenha: this.novaSenha,
      confirmarSenha: this.confirmarSenha
    }).subscribe({
      next: (resposta) => {
        this.mensagemSucesso = resposta;
        this.mensagemErro = '';
        this.carregando = false;

        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 2500);
      },
      error: (erro) => {
        this.mensagemErro = this.formatarErro(erro?.error);
        if (/^Token (já utilizado|expirado|inválido|não informado)/.test(this.mensagemErro)) this.linkIndisponivel = true;
        this.carregando = false;
      }
    });
  }

  alternarMostrarNovaSenha(): void {
    this.mostrarNovaSenha = !this.mostrarNovaSenha;
  }

  private formatarErro(corpo: unknown): string {
    const padrao = 'Não foi possível redefinir a senha. Solicite um novo link e tente novamente.';
    if (typeof corpo === 'string') {
      const texto = corpo.trim();
      if (!texto || texto.startsWith('<')) return padrao;
      if (!texto.startsWith('{') && !texto.startsWith('[')) return texto;
      try { corpo = JSON.parse(texto); } catch { return padrao; }
    }
    if (typeof corpo !== 'object' || corpo === null || !('mensagem' in corpo) || typeof corpo.mensagem !== 'string') return padrao;
    let mensagem = corpo.mensagem;
    if ('dataHoraUtilizacao' in corpo && typeof corpo.dataHoraUtilizacao === 'string') {
      const data = corpo.dataHoraUtilizacao.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?$/);
      if (data && mensagem === 'Token já utilizado.') mensagem = `Token já utilizado em ${data[3]}/${data[2]}/${data[1]} às ${data[4]}:${data[5]}:${data[6]}.`;
    }
    return mensagem;
  }

  alternarMostrarConfirmarSenha(): void {
    this.mostrarConfirmarSenha = !this.mostrarConfirmarSenha;
  }

  get requisitosSenha() {
    return [
      { texto: '8 a 128 caracteres', atendido: this.novaSenha.length >= 8 && this.novaSenha.length <= 128 },
      { texto: 'Uma letra maiúscula', atendido: /\p{Lu}/u.test(this.novaSenha) },
      { texto: 'Uma letra minúscula', atendido: /\p{Ll}/u.test(this.novaSenha) },
      { texto: 'Um número', atendido: /\p{Nd}/u.test(this.novaSenha) },
      { texto: 'Um caractere especial', atendido: /[^\p{L}\p{N}\s]/u.test(this.novaSenha) }
    ];
  }
  get regrasAtendidas(): number { return this.requisitosSenha.filter(regra => regra.atendido).length; }
  get percentualSeguranca(): number { return this.regrasAtendidas * 20; }
  get senhaValida(): boolean { return this.regrasAtendidas === 5; }
  get senhasCoincidem(): boolean { return !!this.confirmarSenha && this.novaSenha === this.confirmarSenha; }
  get textoSeguranca(): string {
    if (!this.novaSenha) return 'Informe uma nova senha';
    return this.senhaValida ? 'Todos os requisitos atendidos' : 'Complete os requisitos abaixo';
  }
}
