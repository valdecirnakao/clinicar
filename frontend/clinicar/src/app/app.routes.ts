import { Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login.component';
import { MenuAdministradorComponent } from './pages/menu-administrador/menu-administrador.component';
import { ExibeFornecedorComponent } from './pages/menu-administrador/exibe-fornecedor/exibe-fornecedor.component';
import { ExibeRegrasManutencaoComponent } from './pages/menu-administrador/exibe-regras-manutencao/exibe-regras-manutencao.component';
import { ExibeUsuarioComponent } from './pages/menu-administrador/exibe-usuario/exibe-usuario.component';
import { CadastraClienteComponent } from './pages/login/cadastra-cliente/cadastra-cliente.component';
import { ExibeVeiculoComponent } from './pages/menu-administrador/exibe-veiculo/exibe-veiculo.component';
import { ExibePecaComponent } from './pages/menu-administrador/exibe-peca/exibe-peca.component';
import { ExibeFornecimentoPecaComponent } from './pages/menu-administrador/exibe-fornecimento-pecas/exibe-fornecimento-pecas.component';
import { RedefinirSenhaComponent } from './pages/login/redefinir-senha/redefinir-senha.component';
import { EsqueciSenhaComponent } from './pages/login/esqueci-senha/esqueci-senha.component';
import { Verificar2faComponent } from './pages/login/verificar-doisfa/verificar-doisfa.component';
import { ExibeServicoComponent } from './pages/menu-administrador/exibe-servico/exibe-servico.component';
import { ExibeFornecimentoServicosComponent } from './pages/menu-administrador/exibe-fornecimento-servicos/exibe-fornecimento-servicos.component';
import { ExibeControleEstoquePecasComponent } from './pages/menu-administrador/exibe-controle-estoque-pecas/exibe-controle-estoque-pecas.component';
import { ExibeAgendamentosComponent } from './pages/menu-administrador/exibe-agendamentos/exibe-agendamentos.component';
import { ExibeAtendimentosComponent } from './pages/menu-administrador/exibe-atendimentos/exibe-atendimentos.component';


export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'esqueci-senha', component: EsqueciSenhaComponent },
  { path: 'redefinir-senha', component: RedefinirSenhaComponent },
  { path: 'login', component: LoginComponent },
  { path: 'primeiro-acesso', loadComponent: () => import('./pages/primeiro-acesso/primeiro-acesso.component').then(m => m.PrimeiroAcessoComponent) },
  { path: 'ativar-conta', loadComponent: () => import('./pages/ativar-conta/ativar-conta.component').then(m => m.AtivarContaComponent) },
  { path: 'verificar-2fa', component: Verificar2faComponent },
  { path: 'cadastraCliente', component: CadastraClienteComponent },
  { path: 'menuAdministrador', component: MenuAdministradorComponent,  // precisa ter <router-outlet> no template
    children: [
      { path: 'exibeFornecedor', component: ExibeFornecedorComponent }, // filho (NÃO repete o pai)
      { path: 'exibeUsuario', component: ExibeUsuarioComponent }, // filho (NÃO repete o pai)
      { path: 'exibeRegrasManutencao', component: ExibeRegrasManutencaoComponent }, // filho (NÃO repete o pai)
      { path: 'exibeVeiculo', component: ExibeVeiculoComponent }, // filho (NÃO repete o pai)
      { path: 'exibePeca', component: ExibePecaComponent }, // filho (NÃO repete o pai)
      { path: 'exibeFornecimentoPecas', component: ExibeFornecimentoPecaComponent }, // filho (NÃO repete o pai)
      { path: 'exibeServico', component: ExibeServicoComponent }, // filho (NÃO repete o pai)
      { path: 'exibeFornecimentoServicos', component: ExibeFornecimentoServicosComponent }, // filho (NÃO repete o pai)
      { path: 'exibeControleEstoquePecas', component: ExibeControleEstoquePecasComponent }, // filho (NÃO repete o pai)
      { path: 'exibeAtendimentos', component: ExibeAtendimentosComponent }, // filho (NÃO repete o pai)
      { path: 'exibeAgendamentos', component: ExibeAgendamentosComponent } // filho (NÃO repete o pai)
    ]
  },
];
