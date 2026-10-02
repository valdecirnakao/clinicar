import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { LoginService } from '../pages/login/login.service';

export const contaGuard: CanActivateFn = route => {
  const router = inject(Router);
  return inject(LoginService).obterUsuarioLogado().pipe(
    map(usuario => usuario.status?.toUpperCase() === 'ATIVO'
      && usuario.tipo_do_acesso?.toUpperCase() === route.data['perfil']
      ? true : router.createUrlTree(['/login'])),
    catchError(() => of(router.createUrlTree(['/login'])))
  );
};
