import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { LoginService, UsuarioLogado } from '../login.service';

interface MfaPendente {
  mfaToken: string;
  mfaSetupNecessario: boolean;
  qrCodeDataUrl?: string;
  chaveManual?: string;
  mensagem?: string;
  email?: string;
}

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
export class Verificar2faComponent implements OnInit {

  mfaPendente: MfaPendente | null = null;

  codigo = '';
  carregando = false;
  mensagemErro = '';
  mensagemSucesso = '';

  constructor(
    private readonly router: Router,
    private readonly loginService: LoginService
  ) {}

  ngOnInit(): void {
    const bruto = sessionStorage.getItem('mfaPendente');

    if (!bruto) {
      this.mensagemErro = 'Nenhuma verificação em duas etapas foi iniciada. Faça login novamente.';
      return;
    }

    try {
      this.mfaPendente = JSON.parse(bruto);
    } catch {
      this.mensagemErro = 'Dados de verificação inválidos. Faça login novamente.';
      sessionStorage.removeItem('mfaPendente');
    }
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

        sessionStorage.removeItem('mfaPendente');

        this.finalizarLogin(usuario);
      },
      error: (erro) => {
        console.error('Erro ao validar MFA:', erro);
        this.carregando = false;
        this.mensagemErro = erro?.error?.mensagem || erro?.error || 'Código inválido ou expirado. Faça login novamente.';
      }
    });
  }

  cancelar(): void {
    sessionStorage.removeItem('mfaPendente');
    this.router.navigate(['/login']);
  }

  formatarCodigo(): void {
    this.codigo = this.codigo.replace(/\D/g, '').slice(0, 6);
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

    this.mensagemErro = 'Usuário autenticado, porém o tipo de acesso não foi reconhecido.';
  }
}
