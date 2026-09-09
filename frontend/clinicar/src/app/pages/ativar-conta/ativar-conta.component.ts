import { CommonModule } from '@angular/common';
import {
  Component,
  DestroyRef,
  OnInit,
  inject
} from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import {
  ActivatedRoute,
  Router,
  RouterLink
} from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';

import {
  SetupService,
  mensagemSetupErro
} from '../../services/setup.service';

@Component({
  selector: 'app-ativar-conta',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink
  ],
  templateUrl: './ativar-conta.component.html',
  styleUrls: ['./ativar-conta.component.css']
})
export class AtivarContaComponent implements OnInit {

  private readonly destroyRef = inject(DestroyRef);
  private readonly setup = inject(SetupService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  token = '';

  emailMascarado = '';

  senha = '';
  confirmarSenha = '';

  carregandoToken = false;
  enviando = false;

  tokenValido = false;
  sucesso = false;

  mostrarSenha = false;
  mostrarConfirmacao = false;

  erroToken = '';
  erroFormulario = '';

  mensagemToken = '';
  mensagemSucesso = '';

  ngOnInit(): void {

    this.token =
      this.route.snapshot.queryParamMap
        .get('token')
        ?.trim() ?? '';

    if (!this.token) {

      this.erroToken =
        'O link de ativação não contém um token válido. Solicite um novo link de ativação.';

      return;
    }

    this.validarToken();
  }

  validarToken(): void {

    if (!this.token || this.carregandoToken) {
      return;
    }

    this.carregandoToken = true;

    this.tokenValido = false;

    this.erroToken = '';
    this.erroFormulario = '';
    this.mensagemToken = '';

    this.setup
      .validarToken(this.token)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.carregandoToken = false;
        })
      )
      .subscribe({

        next: resposta => {

          const dados = resposta as {
            emailMascarado?: string;
            mensagem?: string;
          };

          this.tokenValido = true;

          this.emailMascarado =
            dados.emailMascarado ?? '';

          this.mensagemToken =
            dados.mensagem ??
            'Link de ativação válido. Defina sua senha para continuar.';
        },

        error: (erro: unknown) => {

          this.tokenValido = false;

          this.erroToken = mensagemSetupErro(
            erro,
            'Não foi possível validar o link de ativação. Ele pode estar inválido, expirado ou já ter sido utilizado.'
          );
        }
      });
  }

  definirSenha(form: NgForm): void {

    if (
      this.enviando ||
      !this.tokenValido
    ) {
      return;
    }

    this.erroFormulario = '';

    if (!this.senhaValida) {

      form.control.markAllAsTouched();

      this.erroFormulario =
        'A nova senha ainda não atende a todos os requisitos de segurança.';

      return;
    }

    if (!this.senhasCoincidem) {

      form.control.markAllAsTouched();

      this.erroFormulario =
        'A confirmação da senha não corresponde à nova senha.';

      return;
    }

    this.enviando = true;

    this.setup
      .definirSenha({
        token: this.token,
        senha: this.senha,
        confirmarSenha: this.confirmarSenha
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.enviando = false;
        })
      )
      .subscribe({

        next: resposta => {

          const dados = resposta as {
            mensagem?: string;
          };

          this.mensagemSucesso =
            dados.mensagem ??
            'Senha definida com sucesso. Sua conta está pronta para o primeiro login.';

          /*
           * Limpa os dados sensíveis mantidos em memória.
           */
          this.senha = '';
          this.confirmarSenha = '';
          this.token = '';

          this.tokenValido = false;
          this.sucesso = true;

          /*
           * Remove o token da barra de endereço depois
           * que ele já foi consumido com sucesso.
           */
          void this.router.navigate(
            [],
            {
              relativeTo: this.route,
              queryParams: {},
              replaceUrl: true
            }
          );
        },

        error: (erro: unknown) => {

          this.erroFormulario = mensagemSetupErro(
            erro,
            'Não foi possível definir a senha. Confira os dados ou solicite um novo link de ativação.'
          );
        }
      });
  }

  alternarSenha(): void {
    this.mostrarSenha = !this.mostrarSenha;
  }

  alternarConfirmacao(): void {
    this.mostrarConfirmacao =
      !this.mostrarConfirmacao;
  }

  get regraTamanho(): boolean {
    return (
      this.senha.length >= 8 &&
      this.senha.length <= 128
    );
  }

  get regraMaiuscula(): boolean {
    return /[A-Z]/.test(this.senha);
  }

  get regraMinuscula(): boolean {
    return /[a-z]/.test(this.senha);
  }

  get regraNumero(): boolean {
    return /\d/.test(this.senha);
  }

  get regraEspecial(): boolean {
    return /[^A-Za-z0-9]/.test(this.senha);
  }

  get senhaValida(): boolean {

    return (
      this.regraTamanho &&
      this.regraMaiuscula &&
      this.regraMinuscula &&
      this.regraNumero &&
      this.regraEspecial
    );
  }

  get senhasCoincidem(): boolean {

    return (
      this.confirmarSenha.length > 0 &&
      this.senha === this.confirmarSenha
    );
  }

  get confirmacaoInvalida(): boolean {

    return (
      this.confirmarSenha.length > 0 &&
      !this.senhasCoincidem
    );
  }

  get regrasAtendidas(): number {

    return [
      this.regraTamanho,
      this.regraMaiuscula,
      this.regraMinuscula,
      this.regraNumero,
      this.regraEspecial
    ]
      .filter(Boolean)
      .length;
  }

  get percentualSeguranca(): number {
    return this.regrasAtendidas * 20;
  }

  get textoSeguranca(): string {

    if (!this.senha) {
      return 'Informe uma nova senha';
    }

    if (this.regrasAtendidas <= 2) {
      return 'Senha ainda incompleta';
    }

    if (this.regrasAtendidas <= 4) {
      return 'Quase lá';
    }

    return 'Todos os requisitos atendidos';
  }

  get podeEnviar(): boolean {

    return (
      this.tokenValido &&
      this.senhaValida &&
      this.senhasCoincidem &&
      !this.enviando
    );
  }
}
