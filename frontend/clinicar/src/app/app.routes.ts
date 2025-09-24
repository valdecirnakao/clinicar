import { Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login.component';
import { MenuAdministradorComponent } from './pages/menu-administrador/menu-administrador.component';
import { CadastraUsuarioComponent } from './pages/menu-administrador/cadastra-usuario/cadastra-usuario.component';
import { CadastroFornecedorComponent } from './pages/menu-administrador/cadastra-fornecedor/cadastra-fornecedor.component';
import { ExibeFornecedorComponent } from './pages/menu-administrador/exibe-fornecedor/exibe-fornecedor.component';
import { ExibeUsuarioComponent } from './pages/menu-administrador/exibe-usuario/exibe-usuario.component';

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'menuAdministrador', component: MenuAdministradorComponent,  // precisa ter <router-outlet> no template
    children: [
      { path: 'cadastra-fornecedor', component: CadastroFornecedorComponent }, // filho (NÃO repete o pai)
      { path: 'exibe-fornecedor', component: ExibeFornecedorComponent }, // filho (NÃO repete o pai)
      { path: 'cadastra-usuario', component: CadastraUsuarioComponent }, // filho (NÃO repete o pai)
      { path: 'exibe-usuario', component: ExibeUsuarioComponent } // filho (NÃO repete o pai)

    ]
  },


];
