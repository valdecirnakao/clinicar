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
    }
  }

  redefinirSenha(): void {
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

    if (this.novaSenha.length < 8) {
      this.mensagemErro = 'A senha deve ter pelo menos 8 caracteres.';
      return;
    }

    if (!this.temLetraENumero(this.novaSenha)) {
      this.mensagemErro = 'A senha deve conter letras e números.';
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
        console.error('Erro ao redefinir senha:', erro);

        this.mensagemErro =
          erro?.error ||
          'Não foi possível redefinir a senha. Solicite um novo link e tente novamente.';

        this.carregando = false;
      }
    });
  }

  alternarMostrarNovaSenha(): void {
    this.mostrarNovaSenha = !this.mostrarNovaSenha;
  }

  alternarMostrarConfirmarSenha(): void {
    this.mostrarConfirmarSenha = !this.mostrarConfirmarSenha;
  }

  private temLetraENumero(senha: string): boolean {
    const temLetra = /[A-Za-zÀ-ÿ]/.test(senha);
    const temNumero = /\d/.test(senha);

    return temLetra && temNumero;
  }
}
