import { Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login.component';
import { MenuAdministradorComponent } from './pages/menu-administrador/menu-administrador.component';
import { CadastraUsuarioComponent } from './pages/menu-administrador/cadastra-usuario/cadastra-usuario.component';
import { CadastroFornecedorComponent } from './pages/menu-administrador/cadastra-fornecedor/cadastra-fornecedor.component';
import { ExibeFornecedorComponent } from './pages/menu-administrador/exibe-fornecedor/exibe-fornecedor.component';
import { ExibeUsuarioComponent } from './pages/menu-administrador/exibe-usuario/exibe-usuario.component';
import { CadastraClienteComponent } from './pages/login/cadastra-cliente/cadastra-cliente.component';
import { CadastroVeiculoComponent } from './pages/menu-administrador/cadastra-veiculo/cadastra-veiculo.component';
import { ExibeVeiculoComponent } from './pages/menu-administrador/exibe-veiculo/exibe-veiculo.component';
import { CadastraPecaComponent } from './pages/menu-administrador/cadastra-peca/cadastra-peca.component';
import { ExibePecaComponent } from './pages/menu-administrador/exibe-peca/exibe-peca.component';
import { CadastroServicoComponent } from './pages/menu-administrador/cadastra-servico/cadastra-servico.component';
import { CadastraFornecimentoPecasComponent } from './pages/menu-administrador/cadastra-fornecimento-pecas/cadastra-fornecimento-pecas.component';
import { ExibeFornecimentoPecaComponent } from './pages/menu-administrador/exibe-fornecimento-pecas/exibe-fornecimento-pecas.component';
import { RedefinirSenhaComponent } from './pages/login/redefinir-senha/redefinir-senha.component';
import { EsqueciSenhaComponent } from './pages/login/esqueci-senha/esqueci-senha.component';
import { Verificar2faComponent } from './pages/login/verificar-doisfa/verificar-doisfa.component';

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'esqueci-senha', component: EsqueciSenhaComponent },
  { path: 'redefinir-senha', component: RedefinirSenhaComponent },
  { path: 'login', component: LoginComponent },
  { path: 'verificar-2fa', component: Verificar2faComponent },
  { path: 'cadastraCliente', component: CadastraClienteComponent },
  { path: 'menuAdministrador', component: MenuAdministradorComponent,  // precisa ter <router-outlet> no template
    children: [
      { path: 'cadastraFornecedor', component: CadastroFornecedorComponent }, // filho (NÃO repete o pai)
      { path: 'exibeFornecedor', component: ExibeFornecedorComponent }, // filho (NÃO repete o pai)
      { path: 'cadastraUsuario', component: CadastraUsuarioComponent }, // filho (NÃO repete o pai)
      { path: 'exibeUsuario', component: ExibeUsuarioComponent }, // filho (NÃO repete o pai)
      { path: 'cadastraVeiculo', component: CadastroVeiculoComponent }, // filho (NÃO repete o pai)
      { path: 'exibeVeiculo', component: ExibeVeiculoComponent }, // filho (NÃO repete o pai)
      { path: 'cadastraPeca', component: CadastraPecaComponent }, // filho (NÃO repete o pai)
      { path: 'exibePeca', component: ExibePecaComponent }, // filho (NÃO repete o pai)
      { path: 'cadastraServico', component: CadastroServicoComponent }, // filho (NÃO repete o pai)
      { path: 'cadastraFornecimentoPecas', component: CadastraFornecimentoPecasComponent }, // filho (NÃO repete o pai)
      { path: 'exibeFornecimentoPecas', component: ExibeFornecimentoPecaComponent } // filho (NÃO repete o pai)
    ]
  },
];
