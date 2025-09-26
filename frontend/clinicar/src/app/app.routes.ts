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

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'cadastraCliente', component: CadastraClienteComponent },
  { path: 'menuAdministrador', component: MenuAdministradorComponent,  // precisa ter <router-outlet> no template
    children: [
      { path: 'cadastraFornecedor', component: CadastroFornecedorComponent }, // filho (NÃO repete o pai)
      { path: 'exibeFornecedor', component: ExibeFornecedorComponent }, // filho (NÃO repete o pai)
      { path: 'cadastraUsuario', component: CadastraUsuarioComponent }, // filho (NÃO repete o pai)
      { path: 'exibeUsuario', component: ExibeUsuarioComponent }, // filho (NÃO repete o pai)
      { path: 'exibeUsuario', component: ExibeUsuarioComponent }, // filho (NÃO repete o pai)
      { path: 'cadastraVeiculo', component: CadastroVeiculoComponent }, // filho (NÃO repete o pai)
      { path: 'exibeVeiculo', component: ExibeVeiculoComponent } // filho (NÃO repete o pai)

    ]
  },


];
