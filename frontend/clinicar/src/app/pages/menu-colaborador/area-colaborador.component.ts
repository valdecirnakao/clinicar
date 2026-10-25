import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { LoginService, UsuarioLogado } from '../login/login.service';
import { FormulariosPendentesService } from '../../services/formularios-pendentes.service';
import { NotificacaoService } from '../../shared/feedback/notificacao.service';

declare const bootstrap: { Collapse: { getOrCreateInstance(elemento: HTMLElement, opcoes: { toggle: boolean }): { hide(): void } } };

@Component({
  selector: 'app-area-colaborador',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './area-colaborador.component.html',
  styleUrl: './area-colaborador.component.css'
})
export class AreaColaboradorComponent implements OnInit {
  private readonly destroy = inject(DestroyRef);
  private readonly formularios = inject(FormulariosPendentesService);
  private readonly notificacoes = inject(NotificacaoService);
  private readonly login = inject(LoginService);
  private readonly router = inject(Router);
  usuario: UsuarioLogado | null = null;
  encerrando = false;

  ngOnInit(): void {
    this.router.events.pipe(filter(evento => evento instanceof NavigationEnd), takeUntilDestroyed(this.destroy)).subscribe(() => {
      const menu = document.getElementById('navColaborador');
      if (menu?.classList.contains('show')) bootstrap.Collapse.getOrCreateInstance(menu, { toggle: false }).hide();
    });
    this.login.obterUsuarioLogado().pipe(takeUntilDestroyed(this.destroy)).subscribe({
      next: usuario => this.usuario = usuario,
      error: () => void this.router.navigate(['/login'])
    });
  }

  logout(): void {
    if (this.encerrando || !this.formularios.podeSair()) return;
    this.encerrando = true;
    this.login.logout().pipe(takeUntilDestroyed(this.destroy)).subscribe({
      next: () => { sessionStorage.clear(); void this.router.navigate(['/login'], { replaceUrl: true }); },
      error: () => { this.encerrando = false; this.notificacoes.erro('Não foi possível encerrar a sessão. Tente novamente.'); }
    });
  }
}
