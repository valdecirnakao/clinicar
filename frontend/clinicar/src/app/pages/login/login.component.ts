import { Component } from '@angular/core';
import { Router, RouterLink, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { LoginService } from '../login/login.service';
import { ViewEncapsulation } from '@angular/core';


@Component({
  selector: 'app-login',
  standalone: true,
  imports: [RouterModule, RouterLink, FormsModule, CommonModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})

export class LoginComponent {

  email: string = '';
  senha: string = '';
  erroLogin: boolean = false;
  isAdmin: boolean = false;

  constructor(
    private router: Router,
    private loginService: LoginService,
    private http: HttpClient
  ) {}

  login() {
    this.loginService.login(this.email, this.senha).subscribe({
      next: (usuario: any) => {
        sessionStorage.setItem('usuarioLogado', JSON.stringify(usuario));
        if (usuario.tipo_do_acesso === 'administrador') {
          alert(`Bem-vindo, administrador ${usuario.nome}!`);
          this.router.navigate(['/menuAdministrador']);
        } else if (usuario.tipo_do_acesso === 'colaborador') {
          alert(`Bem-vindo, ${usuario.nome}!`);
          this.router.navigate(['/menuColaborador']);
        } else if (usuario.tipo_do_acesso === 'cliente') {
          alert(`Bem-vindo, ${usuario.nome}!`);
          this.router.navigate(['/menuCliente']);
        }
      },
      error: () => {
        this.erroLogin = true;
      }
    });
  }

  irParaMenu() {
    const usuario = sessionStorage.getItem('usuarioLogado');
    if (!usuario) {
      alert('Por favor, faça login para visualizar os detalhes do produto.');
      return;
    }
    this.router.navigate(['/vitrine']);
  }

  recuperarSenha() {
    if (!this.email || this.email.trim() === '') {
      alert('Por favor, insira um e-mail válido para recuperar a senha.');
      return;
    }

    this.loginService.recuperarSenha(this.email.trim()).subscribe({
      next: (usuario) => {
        if (!usuario || !usuario.nome || !usuario.senha || !usuario.whatsapp || !usuario.whatsappapikey) {
          alert('Usuário encontrado, mas dados incompletos para envio de mensagem.');
          return;
        }

        const hoje = new Date();
        const dia = String(hoje.getDate()).padStart(2, '0');
        const mes = String(hoje.getMonth() + 1).padStart(2, '0');
        const ano = hoje.getFullYear();
        const dataatual = `${dia}/${mes}/${ano}`;
        const hora = String(hoje.getHours()).padStart(2, '0');
        const minutos = String(hoje.getMinutes()).padStart(2, '0');
        const horaatual = `${hora}:${minutos}`;

        const mensagem =
          `Olá ${usuario.nome}!\n` +
          `Conforme solicitação de recuperação de senha recebida em ${dataatual} às ${horaatual}, sua senha é:\n` +
          `${usuario.senha}\n` +
          `Atenciosamente,\nCliniCar`;

        const whatsappLimpo = usuario.whatsapp.replace(/\D/g, '');
        const whatsappFinal = `+${whatsappLimpo}`;

        const api =
          `https://api.callmebot.com/whatsapp.php?` +
          `phone=${whatsappFinal}` +
          `&text=${encodeURIComponent(mensagem)}` +
          `&apikey=${usuario.whatsappapikey}`;

        this.http.get(api, { responseType: 'text' }).subscribe({
          next: (resposta: string) => {
            if (resposta.toLowerCase().includes("message sent")) {
              alert('Senha enviada com sucesso para o WhatsApp cadastrado!');
            } else {
              alert('Erro ao enviar mensagem via WhatsApp: ' + resposta);
            }
          },
          error: (erro) => {
            if (erro.status === 0) {
              alert('Senha enviada com sucesso para o WhatsApp cadastrado!');
              console.warn('A mensagem foi provavelmente enviada, mas houve erro de CORS ou formato.');
            } else {
              alert('Não foi possível se comunicar com o servidor de envio de mensagem. Tente novamente mais tarde.');
              console.error('Erro ao enviar mensagem:', erro);
            }
          }
        });
      },
      error: () => {
        alert('E-mail não cadastrado no sistema.');
      }
    });
  }
}
