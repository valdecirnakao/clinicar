import { Component, OnInit } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { LoginService, UsuarioLogado } from '../login/login.service';

@Component({
  selector: 'app-menu-administrador',
  standalone: true,
  imports: [RouterLink, RouterOutlet],
  templateUrl: './menu-administrador.component.html',
  styleUrl: './menu-administrador.component.css'
})
export class MenuAdministradorComponent implements OnInit {
  constructor(
    private readonly router: Router,
    private readonly loginService: LoginService
  ) {}

  usuarioLogado: UsuarioLogado | null = null;

  ngOnInit(): void {
    this.loginService.obterUsuarioLogado().subscribe({
      next: (usuario) => {
        this.usuarioLogado = usuario;
      },
      error: () => {
        this.router.navigate(['/login']);
      }
    });
  }

  logout(): void {
    this.loginService.logout().subscribe({
      next: () => {
        sessionStorage.clear();
        this.router.navigate(['/login']);
      },
      error: (erro) => {
        console.error('Erro ao fazer logout:', erro);
        /*
        * Mesmo se o backend falhar, limpamos dados locais e voltamos ao login.
        */
        sessionStorage.clear();
        this.router.navigate(['/login']);
      }
    });
  }
}
