import { inject } from '@angular/core';
import { Routes, Router } from '@angular/router';
import { administradorGuard } from './guards/administrador.guard';
import { formularioPendenteGuard } from './services/formularios-pendentes.service';
import { contaGuard } from './guards/conta.guard';

import { MenuAdministradorComponent } from './pages/menu-administrador/menu-administrador.component';

















export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'esqueci-senha', canDeactivate: [formularioPendenteGuard], loadComponent: () => import('./pages/login/esqueci-senha/esqueci-senha.component').then(m => m.EsqueciSenhaComponent) },
  { path: 'redefinir-senha', canDeactivate: [formularioPendenteGuard], loadComponent: () => import('./pages/login/redefinir-senha/redefinir-senha.component').then(m => m.RedefinirSenhaComponent) },
  { path: 'login', canDeactivate: [formularioPendenteGuard], loadComponent: () => import('./pages/login/login.component').then(m => m.LoginComponent) },
  { path: 'primeiro-acesso', canDeactivate: [formularioPendenteGuard], loadComponent: () => import('./pages/primeiro-acesso/primeiro-acesso.component').then(m => m.PrimeiroAcessoComponent) },
  { path: 'ativar-conta', canDeactivate: [formularioPendenteGuard], loadComponent: () => import('./pages/ativar-conta/ativar-conta.component').then(m => m.AtivarContaComponent) },
  { path: 'verificar-2fa', canDeactivate: [formularioPendenteGuard], loadComponent: () => import('./pages/login/verificar-doisfa/verificar-doisfa.component').then(m => m.Verificar2faComponent) },
  { path: 'cadastraCliente', canDeactivate: [formularioPendenteGuard], loadComponent: () => import('./pages/login/cadastra-cliente/cadastra-cliente.component').then(m => m.CadastraClienteComponent) },
  { path: 'menuCliente', canActivate: [contaGuard], data: { perfil: 'CLIENTE' }, canDeactivate: [formularioPendenteGuard], loadComponent: () => import('./pages/minha-conta/minha-conta.component').then(m => m.MinhaContaComponent) },
  { path: 'menuColaborador', canActivate: [contaGuard], data: { perfil: 'COLABORADOR' }, canDeactivate: [formularioPendenteGuard], loadComponent: () => import('./pages/minha-conta/minha-conta.component').then(m => m.MinhaContaComponent) },
  { path: 'menuAdministrador', component: MenuAdministradorComponent, canActivate: [administradorGuard], canActivateChild: [administradorGuard],  // precisa ter <router-outlet> no template
    children: [
      { path: "", pathMatch: "full", redirectTo: "painel" },
      { path: "painel", canDeactivate: [formularioPendenteGuard], loadComponent: () => import("./pages/menu-administrador/painel-operacional/painel-operacional.component").then(m=>m.PainelOperacionalComponent) },
      { path: 'auditoria', canDeactivate: [formularioPendenteGuard], loadComponent: () => import('./pages/menu-administrador/auditoria/auditoria.component').then(m => m.AuditoriaComponent) },

      // Compatibility redirects preserve saved URLs, query parameters and fragments.
      { path: 'exibeUsuario', pathMatch: 'full', redirectTo: ({ queryParams, fragment }) => inject(Router).createUrlTree(['/menuAdministrador', 'usuario'], { queryParams, fragment: fragment ?? undefined }) },
      { path: 'exibeFornecedor', pathMatch: 'full', redirectTo: ({ queryParams, fragment }) => inject(Router).createUrlTree(['/menuAdministrador', 'fornecedor'], { queryParams, fragment: fragment ?? undefined }) },
      { path: 'exibeVeiculo', pathMatch: 'full', redirectTo: ({ queryParams, fragment }) => inject(Router).createUrlTree(['/menuAdministrador', 'veiculo'], { queryParams, fragment: fragment ?? undefined }) },
      { path: 'exibePeca', pathMatch: 'full', redirectTo: ({ queryParams, fragment }) => inject(Router).createUrlTree(['/menuAdministrador', 'peca'], { queryParams, fragment: fragment ?? undefined }) },
      { path: 'exibeServico', pathMatch: 'full', redirectTo: ({ queryParams, fragment }) => inject(Router).createUrlTree(['/menuAdministrador', 'servico'], { queryParams, fragment: fragment ?? undefined }) },
      { path: 'exibeAgendamentos', pathMatch: 'full', redirectTo: ({ queryParams, fragment }) => inject(Router).createUrlTree(['/menuAdministrador', 'agendamento'], { queryParams, fragment: fragment ?? undefined }) },
      { path: 'exibeAtendimentos', pathMatch: 'full', redirectTo: ({ queryParams, fragment }) => inject(Router).createUrlTree(['/menuAdministrador', 'atendimento'], { queryParams, fragment: fragment ?? undefined }) },
      { path: 'exibeFornecimentoPecas', pathMatch: 'full', redirectTo: ({ queryParams, fragment }) => inject(Router).createUrlTree(['/menuAdministrador', 'fornecimentoPecas'], { queryParams, fragment: fragment ?? undefined }) },
      { path: 'exibeFornecimentoServicos', pathMatch: 'full', redirectTo: ({ queryParams, fragment }) => inject(Router).createUrlTree(['/menuAdministrador', 'fornecimentoServico'], { queryParams, fragment: fragment ?? undefined }) },
      { path: 'exibeControleEstoquePecas', pathMatch: 'full', redirectTo: ({ queryParams, fragment }) => inject(Router).createUrlTree(['/menuAdministrador', 'controleEstoquePecas'], { queryParams, fragment: fragment ?? undefined }) },
      { path: 'exibeRegrasManutencao', pathMatch: 'full', redirectTo: ({ queryParams, fragment }) => inject(Router).createUrlTree(['/menuAdministrador', 'regraManutencao'], { queryParams, fragment: fragment ?? undefined }) },
      { path: 'solicitacoesAcesso', canDeactivate: [formularioPendenteGuard], loadComponent: () => import('./pages/menu-administrador/solicitacoes-acesso/solicitacoes-acesso.component').then(m => m.SolicitacoesAcessoComponent) },
      { path: 'historicoVeicular', canDeactivate: [formularioPendenteGuard], loadComponent: () => import('./pages/menu-administrador/historico-veicular/historico-veicular.component').then(m => m.HistoricoVeicularComponent) },
      { path: 'configuracaoAlertas', pathMatch:'full', redirectTo: ({fragment}) => inject(Router).createUrlTree(['/menuAdministrador', fragment==='configuracao-estoque'?'alertasColaboradores':'alertasClientes']) },
      { path: 'alertasClientes', canDeactivate: [formularioPendenteGuard], loadComponent: () => import('./pages/menu-administrador/configuracao-alertas/alertas-clientes.component').then(m => m.AlertasClientesComponent) },
      { path: 'alertasColaboradores', canDeactivate: [formularioPendenteGuard], loadComponent: () => import('./pages/menu-administrador/configuracao-alertas/alertas-colaboradores.component').then(m => m.AlertasColaboradoresComponent) },
      { path: 'fornecedor', canDeactivate: [formularioPendenteGuard], loadComponent: () => import('./pages/menu-administrador/fornecedor/fornecedor.component').then(m => m.FornecedorComponent) }, // filho (NÃO repete o pai)
      { path: 'usuario', canDeactivate: [formularioPendenteGuard], loadComponent: () => import('./pages/menu-administrador/usuario/usuario.component').then(m => m.UsuarioComponent) }, // filho (NÃO repete o pai)
      { path: 'regraManutencao', canDeactivate: [formularioPendenteGuard], loadComponent: () => import('./pages/menu-administrador/regra-manutencao/regra-manutencao.component').then(m => m.RegraManutencaoComponent) }, // filho (NÃO repete o pai)
      { path: 'veiculo', canDeactivate: [formularioPendenteGuard], loadComponent: () => import('./pages/menu-administrador/veiculo/veiculo.component').then(m => m.VeiculoComponent) }, // filho (NÃO repete o pai)
      { path: 'peca', canDeactivate: [formularioPendenteGuard], loadComponent: () => import('./pages/menu-administrador/peca/peca.component').then(m => m.PecaComponent) }, // filho (NÃO repete o pai)
      { path: 'fornecimentoPecas', canDeactivate: [formularioPendenteGuard], loadComponent: () => import('./pages/menu-administrador/fornecimento-pecas/fornecimento-pecas.component').then(m => m.FornecimentoPecasComponent) }, // filho (NÃO repete o pai)
      { path: 'servico', canDeactivate: [formularioPendenteGuard], loadComponent: () => import('./pages/menu-administrador/servico/servico.component').then(m => m.ServicoComponent) }, // filho (NÃO repete o pai)
      { path: 'fornecimentoServico', canDeactivate: [formularioPendenteGuard], loadComponent: () => import('./pages/menu-administrador/fornecimento-servico/fornecimento-servico.component').then(m => m.FornecimentoServicoComponent) }, // filho (NÃO repete o pai)
      { path: 'controleEstoquePecas', canDeactivate: [formularioPendenteGuard], loadComponent: () => import('./pages/menu-administrador/controle-estoque-pecas/controle-estoque-pecas.component').then(m => m.ControleEstoquePecasComponent) }, // filho (NÃO repete o pai)
      { path: 'atendimento', canDeactivate: [formularioPendenteGuard], loadComponent: () => import('./pages/menu-administrador/atendimento/atendimento.component').then(m => m.AtendimentoComponent) }, // filho (NÃO repete o pai)
      { path: 'agendamento', canDeactivate: [formularioPendenteGuard], loadComponent: () => import('./pages/menu-administrador/agendamento/agendamento.component').then(m => m.AgendamentoComponent) } // filho (NÃO repete o pai)
    ]
  },
];
