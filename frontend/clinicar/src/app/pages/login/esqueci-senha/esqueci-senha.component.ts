import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../services/auth.service.ts.service';

@Component({
  selector: 'app-esqueci-senha',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule
  ],
  templateUrl: './esqueci-senha.component.html',
  styleUrl: './esqueci-senha.component.css'
})
export class EsqueciSenhaComponent {

  email = '';
  carregando = false;
  mensagemSucesso = '';
  mensagemErro = '';

  constructor(private readonly authService: AuthService) {}

  solicitarRedefinicao(): void {
    this.mensagemSucesso = '';
    this.mensagemErro = '';

    const emailTratado = this.email.trim();

    if (!emailTratado) {
      this.mensagemErro = 'Informe seu e-mail.';
      return;
    }

    if (!this.emailValido(emailTratado)) {
      this.mensagemErro = 'Informe um e-mail válido.';
      return;
    }

    this.carregando = true;

    this.authService.esqueciSenha({ email: emailTratado }).subscribe({
      next: (resposta) => {
        this.mensagemSucesso = resposta;
        this.mensagemErro = '';
        this.carregando = false;
      },
      error: (erro) => {
        console.error('Erro ao solicitar recuperação de senha:', erro);

        this.mensagemErro =
          erro?.error ||
          'Não foi possível solicitar a recuperação de senha. Tente novamente.';

        this.carregando = false;
      }
    });
  }

  private emailValido(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }
}
