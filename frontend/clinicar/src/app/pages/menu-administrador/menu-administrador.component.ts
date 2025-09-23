import { Component } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-menu-administrador',
  standalone: true,
  imports: [RouterLink, RouterOutlet],
  templateUrl: './menu-administrador.component.html',
  styleUrl: './menu-administrador.component.css'
})
export class MenuAdministradorComponent {

}
