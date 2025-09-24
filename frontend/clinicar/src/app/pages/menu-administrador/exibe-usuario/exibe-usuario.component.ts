import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { UsuarioService } from '../exibe-usuario/exibe-usuario.service';

export interface Usuario {
  id?: number;
  cpf: string;
  nome: string;
  nome_social: string;
  whatsappapikey: string;
  senha: string;
  telefone: string;
  email: string;
  nascimento: string | Date;
  cep: string;
  logradouro: string;
  numero_endereco: string;
  complemento_endereco?: string;
  bairro: string;
  cidade: string;
  estado: string;
  tipo_do_acesso: string;
}

@Component({
  selector: 'app-exibe-usuario',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './exibe-usuario.component.html',
  styleUrls: ['./exibe-usuario.component.css']
})
export class ExibeUsuarioComponent implements OnInit {
  usuarios: Usuario[] = [];
  private todos: Usuario[] = [];

  editId: number | null = null;
  edit: Partial<Usuario> = {};

  loading = false;
  errorMsg = '';

  constructor(
    private usuarioService: UsuarioService,
    private http: HttpClient
  ) {}

  ngOnInit(): void { this.recarregar(); }

  recarregar(): void {
    this.loading = true;
    this.errorMsg = '';
    this.usuarioService.listarTodos().subscribe({
      next: (lista) => {
        this.todos = (lista || []).map(u => ({
          ...u,
          nascimento: this.asInputDateString(u.nascimento),
        }));
        this.usuarios = [...this.todos];
        this.loading = false;
        this.cancelarEdicao();
      },
      error: (err) => {
        console.error(err);
        this.loading = false;
        this.errorMsg = 'Falha ao carregar usuários.';
      }
    });
  }

  filtrar(term: string): void {
    const t = (term || '').trim().toLowerCase();
    if (!t) { this.usuarios = [...this.todos]; return; }

    this.usuarios = this.todos.filter(u => {
      const cpfRaw = (u.cpf || '').toLowerCase();
      const cpfFmt = this.formatarCPF(u.cpf).toLowerCase();
      return cpfRaw.includes(t)
          || cpfFmt.includes(t)
          || (u.nome || '').toLowerCase().includes(t)
          || (u.nome_social || '').toLowerCase().includes(t)
          || (u.email || '').toLowerCase().includes(t);
    });
  }

  trackByUsuario = (_: number, u: Usuario) => u.id ?? u.cpf;

  iniciarEdicao(u: Usuario): void {
    this.editId = u.id ?? null;
    this.edit = { ...u, nascimento: this.asInputDateString(u.nascimento) };
  }

  cancelarEdicao(): void {
    this.editId = null;
    this.edit = {};
  }

  salvarEdicao(id: number): void {
    if (!this.editId || this.editId !== id) return;

    const payload: Partial<Usuario> = {
      ...this.edit,
      cpf: this.onlyDigits(this.edit.cpf),
      cep: this.onlyDigits(this.edit.cep),
      telefone: this.onlyDigits(this.edit.telefone), // recomendado
      estado: (this.edit.estado || '').toString().toUpperCase(),
    };

    this.usuarioService.atualizarUsuario(id, payload).subscribe({
      next: (atualizado) => {
        const idxTodos = this.todos.findIndex(x => x.id === id);
        if (idxTodos > -1) {
          this.todos[idxTodos] = {
            ...this.todos[idxTodos],
            ...atualizado,
            nascimento: this.asInputDateString(atualizado.nascimento),
          };
        }
        const idxView = this.usuarios.findIndex(x => x.id === id);
        if (idxView > -1) {
          this.usuarios[idxView] = {
            ...this.usuarios[idxView],
            ...atualizado,
            nascimento: this.asInputDateString(atualizado.nascimento),
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
    if (!confirm('Confirma excluir este usuário?')) return;

    this.usuarioService.removerUsuario(id).subscribe({
      next: () => {
        this.todos = this.todos.filter(f => f.id !== id);
        this.usuarios = this.usuarios.filter(f => f.id !== id);
        if (this.editId === id) this.cancelarEdicao();
      },
      error: (err) => {
        console.error(err);
        alert('Erro ao excluir usuário.');
      }
    });
  }

  // ====== FORMATAÇÕES ======
  formatarCPF(cpf: string | null | undefined): string {
    const d = this.onlyDigits(cpf);
    if (d.length !== 11) return cpf ?? '';
    // CORRIGIDO: xxx.xxx.xxx-xx
    return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6,9)}-${d.slice(9,11)}`;
  }

  formatarCEP(cep: string | null | undefined): string {
    const d = this.onlyDigits(cep);
    if (d.length !== 8) return cep ?? '';
    return `${d.slice(0,5)}-${d.slice(5,8)}`;
  }

  // ====== VIA CEP (na linha em edição) ======
  onCepBlurRow(model: Partial<Usuario>): void {
    const cepNums = this.onlyDigits(model.cep);
    if (!cepNums || cepNums.length !== 8) return;

    this.http.get<any>(`https://viacep.com.br/ws/${cepNums}/json/`).subscribe({
      next: (resp) => {
        if (resp?.erro) { alert('CEP não encontrado.'); return; }
        this.edit.logradouro = resp.logradouro || this.edit.logradouro || '';
        this.edit.bairro     = resp.bairro     || this.edit.bairro     || '';
        this.edit.cidade     = resp.localidade || this.edit.cidade     || '';
        this.edit.estado     = (resp.uf || this.edit.estado || '').toUpperCase();
        if (!this.edit.complemento_endereco && resp.complemento) {
          this.edit.complemento_endereco = resp.complemento;
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
