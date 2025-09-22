import { Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login.component';
import { MenuAdministradorComponent } from './pages/menu-administrador/menu-administrador.component';

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'menuAdministrador', component: MenuAdministradorComponent }
];
