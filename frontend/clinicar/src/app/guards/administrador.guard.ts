import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { LoginService } from '../pages/login/login.service';
export const administradorGuard: CanActivateFn = () => {
  const router = inject(Router);
  return inject(LoginService).obterUsuarioLogado().pipe(
    map(usuario => usuario.tipo_do_acesso?.toUpperCase() === 'ADMINISTRADOR'
      ? true : router.createUrlTree(['/login'])),
    catchError(() => of(router.createUrlTree(['/login'])))
  );
};
