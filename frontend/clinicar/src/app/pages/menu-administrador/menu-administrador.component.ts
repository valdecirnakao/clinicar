import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { LoginService, UsuarioLogado } from '../login/login.service';
import { FormulariosPendentesService } from '../../services/formularios-pendentes.service';
import { NotificacaoService } from '../../shared/feedback/notificacao.service';

declare const bootstrap: { Collapse: { getOrCreateInstance(elemento: HTMLElement, opcoes: { toggle: boolean }): { hide(): void } } };

@Component({
    selector: 'app-menu-administrador',
    imports: [RouterLink, RouterLinkActive, RouterOutlet],
    templateUrl: './menu-administrador.component.html',
    styleUrl: './menu-administrador.component.css'
})
export class MenuAdministradorComponent implements OnInit {
  private readonly destroy = inject(DestroyRef);
  private readonly formularios = inject(FormulariosPendentesService);
  private readonly notificacoes = inject(NotificacaoService);
  encerrando = false;
  constructor(
    private readonly router: Router,
    private readonly loginService: LoginService
  ) {}

  usuarioLogado: UsuarioLogado | null = null;

  ngOnInit(): void {
    this.router.events.pipe(
      filter(evento => evento instanceof NavigationEnd),
      takeUntilDestroyed(this.destroy)
    ).subscribe(() => {
      const menu = document.getElementById('topNav');
      if (menu?.classList.contains('show')) {
        bootstrap.Collapse.getOrCreateInstance(menu, { toggle: false }).hide();
      }
    });

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
    if (this.encerrando || !this.formularios.podeSair()) return;
    this.encerrando = true;
    this.loginService.logout().pipe(takeUntilDestroyed(this.destroy)).subscribe({
      next: () => {
        sessionStorage.clear();
        void this.router.navigate(['/login'], { replaceUrl: true });
      },
      error: () => {
        this.encerrando = false;
        this.notificacoes.erro('Não foi possível encerrar a sessão. Tente novamente.');
      }
    });
  }
}
