import { provideZoneChangeDetection } from '@angular/core';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, Routes } from '@angular/router';
import { routes } from './app.routes';
import { administradorGuard } from './guards/administrador.guard';

@Component({ standalone: true, template: '' })
class PaginaTesteComponent {}

describe('Compatibilidade das rotas renomeadas', () => {
  const administrador = routes.find(route => route.path === 'menuAdministrador')!;
  const aliases = administrador.children!.filter(route => route.path?.startsWith('exibe'));
  const destinos = [
    'usuario', 'fornecedor', 'veiculo', 'peca', 'servico', 'agendamento',
    'atendimento', 'fornecimentoPecas', 'fornecimentoServico',
    'controleEstoquePecas', 'regraManutencao',
  ];

  beforeEach(() => {
    const rotasTeste: Routes = [{
      path: 'menuAdministrador',
      children: [
        ...aliases,
        ...destinos.map(path => ({ path, component: PaginaTesteComponent })),
      ],
    }];
    TestBed.configureTestingModule({ providers: [provideZoneChangeDetection(), provideRouter(rotasTeste)] });
  });

  aliases.forEach((alias, index) => {
    it(`redireciona ${alias.path} preservando parâmetros e fragmento`, async () => {
      const router = TestBed.inject(Router);
      await router.navigateByUrl(`/menuAdministrador/${alias.path}?continuarCadastro=1&fornecedorId=7&servicoId=12#revisao`);
      const url = router.parseUrl(router.url);
      expect(url.root.children['primary'].segments.map(segment => segment.path))
        .toEqual(['menuAdministrador', destinos[index]]);
      expect(url.queryParams).toEqual({ continuarCadastro: '1', fornecedorId: '7', servicoId: '12' });
      expect(url.fragment).toBe('revisao');
      expect(administrador.children!.find(route => route.path === destinos[index])?.loadComponent).toBeDefined();
    });
  });

  it('mantém a proteção de acesso do administrador e das páginas filhas', () => {
    expect(administrador.canActivate).toContain(administradorGuard);
    expect(administrador.canActivateChild).toContain(administradorGuard);
    expect(aliases.length).toBe(11);
  });
});
