import { Component } from '@angular/core';
import { Router, RouterLink, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { LoginService } from '../login/login.service';



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

  constructor(
    private readonly router: Router,
    private readonly loginService: LoginService,
    private readonly http: HttpClient
  ) {}

  login() {
    this.loginService.login(this.email, this.senha).subscribe({
      next: (usuario: any) => {
        sessionStorage.setItem('usuarioLogado', JSON.stringify(usuario));
        if (usuario.tipo_do_acesso === 'administrador') {
          alert(`Bem-vindo, ${usuario.nome}!`);
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
}
