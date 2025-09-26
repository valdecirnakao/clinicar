import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { VeiculoService } from '../exibe-veiculo/exibe-veiculo.service';

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
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './exibe-veiculo.component.html',
  styleUrls: ['./exibe-veiculo.component.css']
})
export class ExibeVeiculoComponent implements OnInit {
  veiculos: Veiculo[] = [];
  private todos: Veiculo[] = [];

  editId: number | null = null;
  edit: Partial<Veiculo> = {};

  loading = false;
  errorMsg = '';

  constructor(
    private veiculoService: VeiculoService,
    private http: HttpClient
  ) {}

  ngOnInit(): void { this.recarregar(); }

  recarregar(): void {
    this.loading = true;
    this.errorMsg = '';
    this.veiculoService.listarTodos().subscribe({
      next: (lista) => {
        this.todos = (lista || []).map(v => ({
          ...v,
          anoModeloCombustivel: v.anoModeloCombustivel,
        }));
        this.veiculos = [...this.todos];
        this.loading = false;
        this.cancelarEdicao();
      },
      error: (err) => {
        console.error(err);
        this.loading = false;
        this.errorMsg = 'Falha ao carregar veiculos.';
      }
    });
  }

  filtrar(term: string): void {
    const t = (term || '').trim().toLowerCase();
    if (!t) { this.veiculos = [...this.todos]; return; }

    this.veiculos = this.todos.filter(v => {
      const placaRaw = (v.placa || '').toLowerCase();
      const placaFmt = this.formatarPlaca(v.placa).toLowerCase();
      return placaRaw.includes(t)
          || placaFmt.includes(t)
          || (v.fabricante || '').toLowerCase().includes(t)
          || (v.modelo || '').toLowerCase().includes(t)
          || (v.cor || '').toLowerCase().includes(t);
    });
  }

  trackByVeiculo = (_: number, v: Veiculo) => v.id ?? v.placa;

  iniciarEdicao(v: Veiculo): void {
    this.editId = v.id ?? null;
    this.edit = { ...v, anoModeloCombustivel: this.asInputDateString(v.anoModeloCombustivel) };
  }

  cancelarEdicao(): void {
    this.editId = null;
    this.edit = {};
  }

  salvarEdicao(id: number): void {
    if (!this.editId || this.editId !== id) return;

    const payload: Partial<Veiculo> = {
      ...this.edit,
      anoModeloCombustivel: this.onlyDigits(this.edit.anoModeloCombustivel),
      cor: (this.edit.cor || '').toString().toUpperCase(),
    };

    this.veiculoService.atualizarVeiculo(id, payload).subscribe({
      next: (atualizado) => {
        const idxTodos = this.todos.findIndex(x => x.id === id);
        if (idxTodos > -1) {
          this.todos[idxTodos] = {
            ...this.todos[idxTodos],
            ...atualizado,
            anoModeloCombustivel: this.asInputDateString(atualizado.anoModeloCombustivel),
          };
        }
        const idxView = this.veiculos.findIndex(x => x.id === id);
        if (idxView > -1) {
          this.veiculos[idxView] = {
            ...this.veiculos[idxView],
            ...atualizado,
            anoModeloCombustivel: this.asInputDateString(atualizado.anoModeloCombustivel),
          };
        }
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
        this.todos = this.todos.filter(f => f.id !== id);
        this.veiculos = this.veiculos.filter(f => f.id !== id);
        if (this.editId === id) this.cancelarEdicao();
      },
      error: (err) => {
        console.error(err);
        alert('Erro ao excluir veículo.');
      }
    });
  }

  // ====== FORMATAÇÕES ======
  formatarPlaca(v: any): string {
    if (!v) return '';
    const s = (v || '').toString().toUpperCase().replace(/\s+/g, '');
    if (s.length <= 3) return s;
    if (s.length <= 6) return `${s.slice(0,3)}-${s.slice(3)}`;
    return `${s.slice(0,3)}-${s.slice(3,6)} ${s.slice(6)}`;
  }

  // ====== Helpers ======
  private onlyDigits(v: any): string {
    return (v ?? '').toString().replace(/\D/g, '');
  }

  private asInputDateString(v: any): string {
    if (!v) return '';
    if (typeof v === 'string') {
      if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
      const m = v.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
      if (m) return `${m[3]}-${m[2]}-${m[1]}`;
      const d = new Date(v);
      return isNaN(d.getTime()) ? '' : d.toISOString().slice(0,10);
    }
    if (v instanceof Date) return v.toISOString().slice(0,10);
    try {
      const d = new Date(v);
      return isNaN(d.getTime()) ? '' : d.toISOString().slice(0,10);
    } catch { return ''; }
  }
}
