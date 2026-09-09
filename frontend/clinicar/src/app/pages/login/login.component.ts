import { Component, DestroyRef, inject } from '@angular/core';
import { Router, RouterLink, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { SetupService, mensagemSetupErro } from '../../services/setup.service';
import { MfaPendenteService } from '../../services/mfa-pendente.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { LoginService, LoginResponse, UsuarioLogado } from '../login/login.service';



@Component({
  selector: 'app-login',
  standalone: true,
  imports: [RouterModule, RouterLink, FormsModule, CommonModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})

export class LoginComponent {

  private readonly destroyRef = inject(DestroyRef);
  consultandoSetup = false;
  aguardandoAtivacao = false;
  mensagemSetup = '';

  primeiroAcesso(): void {
    if (this.consultandoSetup) return;
    this.consultandoSetup = true;
    this.mensagemSetup = '';
    this.aguardandoAtivacao = false;
    this.setupService.consultarStatus().pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.consultandoSetup = false)).subscribe({
      next: status => {
        if (status.estado === 'NAO_INICIADO') {
          void this.router.navigate(['/primeiro-acesso']);
        } else {
          this.mensagemSetup = status.mensagem;
          this.aguardandoAtivacao = status.estado === 'AGUARDANDO_ATIVACAO';
        }
      },
      error: (erro: unknown) => this.mensagemSetup = mensagemSetupErro(erro, 'Não foi possível consultar o primeiro acesso. Tente novamente.')
    });
  }

  email: string = '';
  senha: string = '';
  erroLogin: boolean = false;
  mensagemErro: string = '';
  mensagemSucesso: string = '';
  carregandoLogin: boolean = false;

  constructor(
    private readonly router: Router,
    private readonly loginService: LoginService,
    private readonly setupService: SetupService,
    private readonly mfaState: MfaPendenteService
  ) {}

  login(): void {
    this.limparMensagens();
    const emailTratado = this.email.trim();
    if (!emailTratado || !this.senha) {
      this.mensagemErro = 'Informe e-mail e senha para acessar o sistema.';
      this.erroLogin = true;
      return;
    }
    if (!this.emailValido(emailTratado)) {
      this.mensagemErro = 'Informe um e-mail válido.';
      this.erroLogin = true;
      return;
    }
    this.carregandoLogin = true;
    this.loginService.login(emailTratado, this.senha).subscribe({
      next: (resposta: LoginResponse) => {
        this.carregandoLogin = false;
        if (resposta.mfaRequerido) {
          if (!resposta.mfaToken) {
            this.erroLogin = true;
            this.mensagemErro = 'Não foi possível iniciar a verificação em duas etapas.';
            return;
          }
          this.senha = '';
          this.mfaState.guardar({
            mfaToken: resposta.mfaToken,
            mfaSetupNecessario: resposta.mfaSetupNecessario ?? false,
            qrCodeDataUrl: resposta.qrCodeDataUrl,
            chaveManual: resposta.chaveManual,
            mensagem: resposta.mensagem,
            email: emailTratado
          });
          this.router.navigate(['/verificar-2fa']);
          return;
        }
        if (resposta.usuario) {
          this.finalizarLogin(resposta.usuario);
          return;
        }
        this.mensagemErro = 'Resposta de login inválida.';
        this.erroLogin = true;
      },
      error: (erro) => {
        this.carregandoLogin = false;
        this.erroLogin = true;
        this.mensagemErro = 'E-mail ou senha inválidos.';
      }
    });
  }

  private finalizarLogin(usuario: UsuarioLogado): void {
    sessionStorage.setItem('usuarioLogado', JSON.stringify(usuario));
    const tipoAcesso = (usuario.tipo_do_acesso || '').toLowerCase().trim();
    if (tipoAcesso === 'administrador') {
      this.router.navigate(['/menuAdministrador']);
      return;
    }
    if (tipoAcesso === 'colaborador') {
      this.router.navigate(['/menuColaborador']);
      return;
    }
    if (tipoAcesso === 'cliente') {
      this.router.navigate(['/menuCliente']);
      return;
    }
    this.mensagemErro = 'Tipo de acesso inválido.';
    this.erroLogin = true;
  }

  private limparMensagens(): void {
    this.erroLogin = false;
    this.mensagemErro = '';
    this.mensagemSucesso = '';
  }

  private emailValido(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }
}
