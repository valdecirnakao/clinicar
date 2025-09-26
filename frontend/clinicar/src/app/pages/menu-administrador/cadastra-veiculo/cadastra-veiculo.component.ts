import { Component, ElementRef, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { UsuarioService, Usuario } from '../exibe-usuario/exibe-usuario.service';
import { VeiculoService } from '../cadastra-veiculo/cadastra-veiculo.service';

type VeiculoPayload = {
  placa: string;
  fabricante: string;
  cor: string;
  modelo: string;
  anoModeloCombustivel: string; // snake_case para casar com o DTO
  idProprietario?: number; // ID do usuário (FK)
};

@Component({
  selector: 'app-cadastra-veiculo',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './cadastra-veiculo.component.html',
  styleUrls: ['./cadastra-veiculo.component.css']
})
export class CadastroVeiculoComponent implements OnInit {

  veiculo: VeiculoPayload = {
    placa: '',
    fabricante: '',
    cor: '',
    modelo: '',
    anoModeloCombustivel: '',
    idProprietario: 0
  };

  usuarios: Usuario[] = [];
  usuariosFiltrados: Usuario[] = [];

  // Dropdown/Busca (CPF)
  dropdownOpen = false;
  cpfFiltro = '';
  cpfDisplay = '';     // exibe o CPF formatado do usuário selecionado
  cpfErro = '';
  nomeProprietarioSelecionado: any;

  constructor(
    private readonly usuarioService: UsuarioService,
    private readonly veiculoService: VeiculoService,
    private readonly host: ElementRef
  ) {}

  ngOnInit(): void {
    this.recarregarUsuarios();
  }

  // --------- Usuários (lista/seleção) ----------
  recarregarUsuarios(): void {
    this.usuarioService.listarTodos().subscribe({
      next: lista => {
        this.usuarios = lista ?? [];
        this.usuariosFiltrados = [...this.usuarios];
      },
      error: e => console.error('Falha ao carregar usuários:', e)
    });
  }

  aplicarFiltro(): void {
    const t = (this.cpfFiltro || '').trim().toLowerCase();
    if (!t) {
      this.usuariosFiltrados = [...this.usuarios];
      return;
    }

    const tDigits = this.onlyDigits(t);
    this.usuariosFiltrados = this.usuarios.filter(u => {
      const cpfFmt = this.formatarCPF(u.cpf).toLowerCase();
      const cpfDigits = this.onlyDigits(u.cpf);
      return cpfFmt.includes(t)
          || cpfDigits.includes(tDigits)
          || (u.nome || '').toLowerCase().includes(t)
          || (u.email || '').toLowerCase().includes(t);
    });
  }

  toggleDropdown(open?: boolean): void {
    this.dropdownOpen = open ?? !this.dropdownOpen;
    if (this.dropdownOpen) {
      this.cpfFiltro = '';
      this.aplicarFiltro();
    }
  }

  selecionarProprietario(u: Usuario): void {
    if (!u?.id) {
      this.cpfErro = 'Usuário inválido.';
      return;
    }
    this.veiculo.idProprietario = Number(u.id);
    this.cpfDisplay = this.formatarCPF(u.cpf);
    this.cpfErro = '';
    this.dropdownOpen = false;
  }

  // --------- Submit ----------
  cadastrar(form: NgForm): void {
    if (!this.veiculo.idProprietario) {
      this.cpfErro = 'Selecione um CPF válido.';
      return;
    }

    const payload: VeiculoPayload = {
      placa: (this.veiculo.placa || '').toUpperCase().replace(/\s+/g, ''),
      fabricante: this.veiculo.fabricante,
      cor: this.veiculo.cor,
      modelo: this.veiculo.modelo,
      anoModeloCombustivel: this.veiculo.anoModeloCombustivel,
      idProprietario: this.veiculo.idProprietario
    };

    // Ajuste aqui para o nome REAL do método do serviço: criar() ou cadastrar()
    this.veiculoService.criar(payload as any).subscribe({
      next: () => {
        alert('Veículo cadastrado com sucesso!');
        form.resetForm();
        this.resetarModelo();
      },
      error: (e) => {
        console.error('Erro ao cadastrar veículo:', e);
        if (e?.status === 409) {
          alert('Placa já cadastrada.');
        } else if (e?.status === 400) {
          alert('Dados inválidos. Verifique os campos.');
        } else if (e?.status === 404) {
          alert('Proprietário não encontrado.');
        } else {
          alert('Erro no servidor ao cadastrar o veículo.');
        }
      }
    });
  }

  resetarModelo(): void {
    this.veiculo = {
      placa: '',
      fabricante: '',
      cor: '',
      modelo: '',
      anoModeloCombustivel: '',
      idProprietario: 0
    };
    this.cpfDisplay = '';
    this.cpfFiltro = '';
    this.cpfErro = '';
    this.dropdownOpen = false;
  }

  // ---------- Helpers ----------
  formatarPlaca(): void {
    if (!this.veiculo.placa) return;
    this.veiculo.placa = this.veiculo.placa.toUpperCase().replace(/\s+/g, '');
  }

  formatarCPF(cpf: string | null | undefined): string {
    const d = this.onlyDigits(cpf);
    if (d.length !== 11) return cpf ?? '';
    return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6,9)}-${d.slice(9,11)}`;
  }

  private onlyDigits(v: any): string {
    return (v ?? '').toString().replace(/\D/g, '');
  }

  // Fecha o dropdown ao clicar fora do componente
  @HostListener('document:click', ['$event'])
  onDocClick(e: MouseEvent) {
    if (!this.host.nativeElement.contains(e.target)) {
      this.dropdownOpen = false;
    }
  }

  trackByUsuario = (_: number, u: Usuario) => u.id ?? u.cpf;
}
