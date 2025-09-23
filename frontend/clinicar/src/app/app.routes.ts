import { Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login.component';
import { MenuAdministradorComponent } from './pages/menu-administrador/menu-administrador.component';
import { CadastraClienteComponent } from './pages/menu-administrador/cadastra-cliente/cadastra-cliente.component';
import { CadastroFornecedorComponent } from './pages/menu-administrador/cadastra-fornecedor/cadastra-fornecedor.component';
import { ExibeFornecedorComponent } from './pages/menu-administrador/exibe-fornecedor/exibe-fornecedor.component';

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'menuAdministrador', component: MenuAdministradorComponent,  // precisa ter <router-outlet> no template
    children: [
      { path: 'cadastra-fornecedor', component: CadastroFornecedorComponent }, // filho (NÃO repete o pai)
      { path: 'exibe-fornecedor', component: ExibeFornecedorComponent }, // filho (NÃO repete o pai)
      { path: 'cadastra-cliente', component: CadastraClienteComponent } // filho (NÃO repete o pai)
    ]
  },


];
