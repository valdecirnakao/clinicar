import { Component, ElementRef, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { VeiculoService } from '../exibe-veiculo/exibe-veiculo.service';
import { UsuarioService, Usuario } from '../exibe-usuario/exibe-usuario.service';

export interface Veiculo {
  id?: number;
  placa: string;
  fabricante: string;
  cor: string;
  modelo: string;
  anoModeloCombustivel: string;
  idProprietario?: number;
}

@Component({
  selector: 'app-exibe-veiculo',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './exibe-veiculo.component.html',
  styleUrls: ['./exibe-veiculo.component.css']
})
export class ExibeVeiculoComponent implements OnInit {
  // lista exibida e cópia para filtro
  veiculos: Veiculo[] = [];
  private todos: Veiculo[] = [];

  // cache id -> usuário (para resolver CPF/nome rapidamente)
  private readonly usuariosById = new Map<number, Usuario>();

  // estado de edição
  editId: number | null = null;
  edit: Partial<Veiculo> = {};
  loading = false;
  errorMsg = '';

  // picker de CPF (apenas na linha em edição)
  usuarios: Usuario[] = [];
  usuariosFiltrados: Usuario[] = [];
  dropdownOpenId: number | null = null; // controla qual linha tem dropdown aberto
  cpfFiltroEdit = '';

  constructor(
    private readonly usuarioService: UsuarioService,
    private readonly veiculoService: VeiculoService,
    private readonly host: ElementRef
  ) {}

  ngOnInit(): void {
    this.carregarUsuarios();
    this.recarregar();
  }

  // ---------- Usuários / CPF ----------

  private carregarUsuarios(): void {
    this.usuarioService.listarTodos().subscribe({
      next: (lista) => {
        this.usuarios = lista ?? [];
        this.usuariosFiltrados = [...this.usuarios];
        this.usuariosById.clear();
        for (const u of this.usuarios) {
          if (u?.id != null) this.usuariosById.set(u.id, u);
        }
      },
      error: (e) => console.error('Falha ao carregar usuários:', e)
    });
  }

  /** Visualização: mostra CPF formatado a partir do idProprietario */
  proprietarioCpf(v: Veiculo): string {
    const u = v.idProprietario != null ? this.usuariosById.get(v.idProprietario) : undefined;
    return this.formatarCPF(u?.cpf) || '—';
  }

  /** Edição: mostra o CPF atual (do ID selecionado) no input readonly da linha */
  cpfSelecionadoPara(v: Veiculo): string {
    const chosenId =
      this.editId === v.id && this.edit.idProprietario != null
        ? this.edit.idProprietario
        : v.idProprietario;
    const u = chosenId != null ? this.usuariosById.get(chosenId) : undefined;
    return this.formatarCPF(u?.cpf) || '';
  }

  toggleUsersDropdownFor(rowId: number, open?: boolean) {
    const shouldOpen = open ?? (this.dropdownOpenId !== rowId);
    this.dropdownOpenId = shouldOpen ? rowId : null;
    if (this.dropdownOpenId != null) {
      this.cpfFiltroEdit = '';
      this.aplicarFiltroEdit();
    }
  }

  aplicarFiltroEdit(): void {
    const t = (this.cpfFiltroEdit || '').trim().toLowerCase();
    if (!t) {
      this.usuariosFiltrados = [...this.usuarios];
      return;
    }

    const tDigits = this.onlyDigits(t);
    this.usuariosFiltrados = this.usuarios.filter((u) => {
      const cpfFmt = this.formatarCPF(u.cpf).toLowerCase();
      const cpfDigits = this.onlyDigits(u.cpf);
      return (
        cpfFmt.includes(t) ||
        cpfDigits.includes(tDigits) ||
        (u.nome || '').toLowerCase().includes(t) ||
        (u.email || '').toLowerCase().includes(t)
      );
    });
  }

  selecionarProprietarioEdit(u: Usuario): void {
    if (!u?.id) return;
    this.edit.idProprietario = u.id; // mantém o ID numérico para salvar
    this.dropdownOpenId = null; // fecha dropdown
  }

  // Fecha o dropdown ao clicar fora do componente
  @HostListener('document:click', ['$event'])
  onDocClick(e: MouseEvent) {
    if (!this.host.nativeElement.contains(e.target)) {
      this.dropdownOpenId = null;
    }
  }

  // ---------- Veículos ----------

  recarregar(): void {
    this.loading = true;
    this.errorMsg = '';
    this.veiculoService.listarTodos().subscribe({
      next: (lista) => {
        this.todos = lista || [];
        this.veiculos = [...this.todos];
        this.loading = false;
        this.cancelarEdicao();
      },
      error: (err) => {
        console.error(err);
        this.loading = false;
        this.errorMsg = 'Falha ao carregar veículos.';
      }
    });
  }

  filtrar(term: string): void {
    const t = (term || '').trim().toLowerCase();
    if (!t) {
      this.veiculos = [...this.todos];
      return;
    }

    this.veiculos = this.todos.filter((v) => {
      const placaRaw = (v.placa || '').toLowerCase();
      const placaFmt = this.formatarPlaca(v.placa).toLowerCase();
      return (
        placaRaw.includes(t) ||
        placaFmt.includes(t) ||
        (v.fabricante || '').toLowerCase().includes(t) ||
        (v.modelo || '').toLowerCase().includes(t) ||
        (v.cor || '').toLowerCase().includes(t)
      );
    });
  }

  trackByVeiculo = (_: number, v: Veiculo) => v.id ?? v.placa;
  trackByUsuario = (_: number, u: Usuario) => u.id ?? u.cpf;

  iniciarEdicao(v: Veiculo): void {
    this.editId = v.id ?? null;
    this.edit = { ...v }; // traz idProprietario para edição
    this.dropdownOpenId = null;
    this.cpfFiltroEdit = '';
  }

  cancelarEdicao(): void {
    this.editId = null;
    this.edit = {};
    this.dropdownOpenId = null;
    this.cpfFiltroEdit = '';
  }

  salvarEdicao(id: number): void {
    if (!this.editId || this.editId !== id) return;

    // payload no formato da UI; o service faz o mapeamento para a API
    const payload: Partial<Veiculo> = {
      ...this.edit,
      placa: ((this.edit.placa ?? '') as string).toUpperCase().replace(/\s+/g, ''),
      cor: ((this.edit.cor ?? '') as string).trim()
    };

    if (payload.idProprietario != null) {
      payload.idProprietario = Number(payload.idProprietario);
    }

    this.veiculoService.atualizarVeiculo(id, payload as any).subscribe({
      next: (atualizado) => {
        const i1 = this.todos.findIndex((x) => x.id === id);
        if (i1 > -1) this.todos[i1] = { ...this.todos[i1], ...atualizado };
        const i2 = this.veiculos.findIndex((x) => x.id === id);
        if (i2 > -1) this.veiculos[i2] = { ...this.veiculos[i2], ...atualizado };
        this.cancelarEdicao();
      },
      error: (err) => {
        console.error(err);
        alert('Erro ao salvar alterações.');
      }
    });
  }

  excluir(id?: number): void {
    if (!id) return;
    if (!confirm('Confirma excluir este veículo?')) return;

    this.veiculoService.removerVeiculo(id).subscribe({
      next: () => {
        this.todos = this.todos.filter((f) => f.id !== id);
        this.veiculos = this.veiculos.filter((f) => f.id !== id);
        if (this.editId === id) this.cancelarEdicao();
      },
      error: (err) => {
        console.error(err);
        alert('Erro ao excluir veículo.');
      }
    });
  }

  // ---------- Helpers ----------

  formatarPlaca(v: any): string {
    if (!v) return '';
    const s = (v || '').toString().toUpperCase().replace(/\s+/g, '');
    if (s.length <= 3) return s;
    if (s.length <= 6) return `${s.slice(0, 3)}-${s.slice(3)}`;
    return `${s.slice(0, 3)}-${s.slice(3, 6)}${s.slice(6)}`;
  }

  private onlyDigits(v: any): string {
    return (v ?? '').toString().replace(/\D/g, '');
  }

  public formatarCPF(cpf?: string): string {
    const d = this.onlyDigits(cpf);
    if (d.length !== 11) return cpf ?? '';
    return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9, 11)}`;
  }
}
