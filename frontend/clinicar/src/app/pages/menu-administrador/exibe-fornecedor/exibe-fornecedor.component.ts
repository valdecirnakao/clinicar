import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { FornecedorService } from '../exibe-fornecedor/exibe-fornecedor.service';

export interface Fornecedor {
  id?: number;
  cnpj: string;
  razaoSocial: string;
  nomeFantasia: string;
  itemFornecido: string;
  telefone: string;
  email: string;
  fundacao: string | Date;
  cep: string;
  logradouro: string;
  numeroEndereco: string;
  complementoEndereco?: string;
  bairro: string;
  cidade: string;
  estado: string;
}

@Component({
  selector: 'app-exibe-fornecedor',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './exibe-fornecedor.component.html',
  styleUrls: ['./exibe-fornecedor.component.css']
})
export class ExibeFornecedorComponent implements OnInit {
  fornecedores: Fornecedor[] = [];
  private todos: Fornecedor[] = [];

  editId: number | null = null;
  edit: Partial<Fornecedor> = {};

  loading = false;
  errorMsg = '';

  constructor(
    private fornecedorService: FornecedorService,
    private http: HttpClient
  ) {}

  ngOnInit(): void { this.recarregar(); }

  recarregar(): void {
    this.loading = true;
    this.errorMsg = '';
    this.fornecedorService.listarTodos().subscribe({
      next: (lista) => {
        this.todos = (lista || []).map(f => ({
          ...f,
          fundacao: this.asInputDateString(f.fundacao),
        }));
        this.fornecedores = [...this.todos];
        this.loading = false;
        this.cancelarEdicao();
      },
      error: (err) => {
        console.error(err);
        this.loading = false;
        this.errorMsg = 'Falha ao carregar fornecedores.';
      }
    });
  }

  filtrar(term: string): void {
    const t = (term || '').trim().toLowerCase();
    if (!t) { this.fornecedores = [...this.todos]; return; }

    this.fornecedores = this.todos.filter(f => {
      const cnpjRaw = (f.cnpj || '').toLowerCase();
      const cnpjFmt = this.formatarCNPJ(f.cnpj).toLowerCase();
      return cnpjRaw.includes(t)
          || cnpjFmt.includes(t)
          || (f.razaoSocial || '').toLowerCase().includes(t)
          || (f.nomeFantasia || '').toLowerCase().includes(t);
    });
  }

  trackByFornecedor = (_: number, f: Fornecedor) => f.id ?? f.cnpj;

  iniciarEdicao(f: Fornecedor): void {
    this.editId = f.id ?? null;
    this.edit = { ...f, fundacao: this.asInputDateString(f.fundacao) };
  }

  cancelarEdicao(): void {
    this.editId = null;
    this.edit = {};
  }

  salvarEdicao(id: number): void {
    if (!this.editId || this.editId !== id) return;

    const payload: Partial<Fornecedor> = {
      ...this.edit,
      cnpj: this.onlyDigits(this.edit.cnpj),   // << envia 14 dígitos
      cep:  this.onlyDigits(this.edit.cep),
      estado: (this.edit.estado || '').toString().toUpperCase(),
    };

    this.fornecedorService.atualizarFornecedor(id, payload).subscribe({
      next: (atualizado) => {
        const idxTodos = this.todos.findIndex(x => x.id === id);
        if (idxTodos > -1) {
          this.todos[idxTodos] = {
            ...this.todos[idxTodos],
            ...atualizado,
            fundacao: this.asInputDateString(atualizado.fundacao),
          };
        }
        const idxView = this.fornecedores.findIndex(x => x.id === id);
        if (idxView > -1) {
          this.fornecedores[idxView] = {
            ...this.fornecedores[idxView],
            ...atualizado,
            fundacao: this.asInputDateString(atualizado.fundacao),
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
    if (!confirm('Confirma excluir este fornecedor?')) return;

    this.fornecedorService.removerFornecedor(id).subscribe({
      next: () => {
        this.todos = this.todos.filter(f => f.id !== id);
        this.fornecedores = this.fornecedores.filter(f => f.id !== id);
        if (this.editId === id) this.cancelarEdicao();
      },
      error: (err) => {
        console.error(err);
        alert('Erro ao excluir fornecedor.');
      }
    });
  }

  // ====== FORMATAÇÕES ======
  formatarCNPJ(cnpj: string | null | undefined): string {
    const d = this.onlyDigits(cnpj);
    if (d.length !== 14) return cnpj ?? '';
    return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8,12)}-${d.slice(12,14)}`;
  }

  // ====== VIA CEP (na linha em edição) ======
  onCepBlurRow(model: Partial<Fornecedor>): void {
    const cepNums = this.onlyDigits(model.cep);
    if (!cepNums || cepNums.length !== 8) return;

    this.http.get<any>(`https://viacep.com.br/ws/${cepNums}/json/`).subscribe({
      next: (resp) => {
        if (resp?.erro) { alert('CEP não encontrado.'); return; }
        this.edit.logradouro = resp.logradouro || this.edit.logradouro || '';
        this.edit.bairro     = resp.bairro     || this.edit.bairro     || '';
        this.edit.cidade     = resp.localidade || this.edit.cidade     || '';
        this.edit.estado     = (resp.uf || this.edit.estado || '').toUpperCase();
        if (!this.edit.complementoEndereco && resp.complemento) {
          this.edit.complementoEndereco = resp.complemento;
        }
      },
      error: (e) => {
        console.error(e);
        alert('Falha ao consultar o CEP.');
      }
    });
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
