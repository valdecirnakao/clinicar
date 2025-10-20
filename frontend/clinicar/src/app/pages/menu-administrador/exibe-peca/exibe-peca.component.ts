import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { PecaService } from '../exibe-peca/exibe-peca.service';

export interface Peca {
  id?: number;
  nome: string;
  tipo?: string;
  especificacao?: string;
  fabricante: string;
  modelo?: string;
  norma?: string;
  unidade: string;
}

@Component({
  selector: 'app-exibe-peca',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './exibe-peca.component.html',
  styleUrls: ['./exibe-peca.component.css']
})
export class ExibePecaComponent implements OnInit {
  pecas: Peca[] = [];
  private todos: Peca[] = [];

  editId: number | null = null;
  edit: Partial<Peca> = {};

  loading = false;
  errorMsg = '';

  constructor(
    private pecaService: PecaService,
    private http: HttpClient
  ) {}

  ngOnInit(): void { this.recarregar(); }

  recarregar(): void {
    this.loading = true;
    this.errorMsg = '';
    this.pecaService.listarTodos().subscribe({
      next: (lista) => {
        this.todos = (lista || []).map(u => ({
          ...u,
        }));
        this.pecas = [...this.todos];
        this.loading = false;
        this.cancelarEdicao();
      },
      error: (err) => {
        console.error(err);
        this.loading = false;
        this.errorMsg = 'Falha ao carregar peças.';
      }
    });
  }

  filtrar(term: string): void {
    const t = (term || '').trim().toLowerCase();
    if (!t) { this.pecas = [...this.todos]; return; }

    this.pecas = this.todos.filter(u => {
      return (u.nome || '').toLowerCase().includes(t)
        || (u.fabricante || '').toLowerCase().includes(t)
        || (u.modelo || '').toLowerCase().includes(t)
        || (u.norma || '').toLowerCase().includes(t)
        || (u.unidade || '').toLowerCase().includes(t);
    });
  }

  trackByPeca = (_: number, p: Peca) => p.id ?? p.nome;


  iniciarEdicao(u: Peca): void {
    this.editId = u.id ?? null;
    this.edit = { ...u };
  }

  cancelarEdicao(): void {
    this.editId = null;
    this.edit = {};
  }

  salvarEdicao(id: number): void {
    if (!this.editId || this.editId !== id) return;

    const payload: Partial<Peca> = {
      ...this.edit,
    };

    this.pecaService.atualizarPeca(id, payload).subscribe({
      next: (atualizado) => {
        const idxTodos = this.todos.findIndex(x => x.id === id);
        if (idxTodos > -1) {
          this.todos[idxTodos] = {
            ...this.todos[idxTodos],
            ...atualizado
          };
        }
        const idxView = this.pecas.findIndex(x => x.id === id);
        if (idxView > -1) {
          this.pecas[idxView] = {
            ...this.pecas[idxView],
            ...atualizado
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
    if (!confirm('Confirma excluir esta peça?')) return;

    this.pecaService.removerPeca(id).subscribe({
      next: () => {
        this.todos = this.todos.filter(f => f.id !== id);
        this.pecas = this.pecas.filter(f => f.id !== id);
        if (this.editId === id) this.cancelarEdicao();
      },
      error: (err) => {
        console.error(err);
        alert('Erro ao excluir peça.');
      }
    });
  }

  capitalizar(campo: keyof Peca): string {
    const raw = this.edit[campo];
    const s = typeof raw === 'string' ? raw.trim() : '';
    const result = s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : s;
    (this.edit as any)[campo] = result;
    return result;
  }

  caixaAlta(campo: keyof Peca): string {
    const raw = this.edit[campo];
    const s = typeof raw === 'string' ? raw.trim() : '';
    (this.edit as any)[campo] = s.toUpperCase();
    return s.toUpperCase();
  }
}
