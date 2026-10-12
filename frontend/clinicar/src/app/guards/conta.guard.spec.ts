import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { contaGuard } from './conta.guard';

describe('contaGuard', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])] }));
  it('libera somente o perfil ativo correspondente à área de conta', () => {
    for (const perfil of ['CLIENTE', 'COLABORADOR']) {
      const resultado: any = TestBed.runInInjectionContext(() => contaGuard({ data: { perfil } } as any, {} as any));
      resultado.subscribe((valor: any) => expect(valor).toBeTrue());
      TestBed.inject(HttpTestingController).expectOne('/api/auth/me').flush({ status: 'ATIVO', tipo_do_acesso: perfil });
    }
  });
  it('recusa outro perfil e conta inativa mesmo com cookie', () => {
    for (const usuario of [{ status: 'ATIVO', tipo_do_acesso: 'ADMINISTRADOR' }, { status: 'INATIVO', tipo_do_acesso: 'CLIENTE' }]) {
      const resultado: any = TestBed.runInInjectionContext(() => contaGuard({ data: { perfil: 'CLIENTE' } } as any, {} as any));
      resultado.subscribe((valor: any) => expect(TestBed.inject(Router).serializeUrl(valor)).toBe('/login'));
      TestBed.inject(HttpTestingController).expectOne('/api/auth/me').flush(usuario);
    }
  });
});
