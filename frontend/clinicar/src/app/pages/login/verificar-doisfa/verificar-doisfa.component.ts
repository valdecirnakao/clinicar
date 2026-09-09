import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { LoginService, UsuarioLogado } from '../login.service';

import { MfaPendente, MfaPendenteService } from '../../../services/mfa-pendente.service';

@Component({
  selector: 'app-verificar-doisfa',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule
  ],
  templateUrl: './verificar-doisfa.component.html',
  styleUrls: ['./verificar-doisfa.component.css']
})
export class Verificar2faComponent implements OnInit, OnDestroy {

  mfaPendente: MfaPendente | null = null;
  codigo = '';
  carregando = false;
  mensagemErro = '';
  mensagemSucesso = '';

  constructor(
    private readonly router: Router,
    private readonly loginService: LoginService,
    private readonly mfaState: MfaPendenteService
  ) {}

  ngOnInit(): void {
    this.mfaPendente = this.mfaState.retirar();
    if (!this.mfaPendente) {
      this.mensagemErro = 'Nenhuma verificação em duas etapas foi iniciada. Faça login novamente.';
    }
  }

  ngOnDestroy(): void {
    this.mfaPendente = null;
    this.codigo = '';
    this.mfaState.limpar();
  }

  validarCodigo(): void {
    this.mensagemErro = '';
    this.mensagemSucesso = '';
    if (!this.mfaPendente?.mfaToken) {
      this.mensagemErro = 'Token de verificação não encontrado. Faça login novamente.';
      return;
    }
    const codigoTratado = this.codigo.replace(/\D/g, '');

    if (!codigoTratado || codigoTratado.length !== 6) {
      this.mensagemErro = 'Informe o código de 6 dígitos do aplicativo autenticador.';
      return;
    }
    this.carregando = true;
    this.loginService.validarMfa({
      mfaToken: this.mfaPendente.mfaToken,
      codigo: codigoTratado
    }).subscribe({
      next: (usuario) => {
        this.carregando = false;
        this.mensagemSucesso = 'Verificação concluída com sucesso.';
        this.mfaState.limpar();
        this.mfaPendente = null;
        this.codigo = '';
        this.finalizarLogin(usuario);
      },
      error: (erro) => {
        this.carregando = false;
        this.mensagemErro = this.extrairMensagemErro(
          erro,
          'Código inválido ou expirado. Faça login novamente.'
        );
      }
    });
  }

  cancelar(): void {
    this.mfaState.limpar();
        this.mfaPendente = null;
        this.codigo = '';
    this.router.navigate(['/login']);
  }

  formatarCodigo(): void {
    this.codigo = this.codigo.replace(/\D/g, '').slice(0, 6);
  }

  private finalizarLogin(usuario: UsuarioLogado): void {
    /*
    * Não salvamos mais o usuário no sessionStorage como prova de autenticação.
    * A sessão real agora está no cookie HttpOnly criado pelo backend.
    */
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

    this.mensagemErro = 'Usuário autenticado, porém o tipo de acesso não foi reconhecido.';
  }

  private extrairMensagemErro(erro: any, mensagemPadrao: string): string {
    if (typeof erro?.error === 'string') {
      return erro.error;
    }
    if (typeof erro?.error?.mensagem === 'string') {
      return erro.error.mensagem;
    }
    if (typeof erro?.message === 'string') {
      return erro.message;
    }
    return mensagemPadrao;
  }
}
