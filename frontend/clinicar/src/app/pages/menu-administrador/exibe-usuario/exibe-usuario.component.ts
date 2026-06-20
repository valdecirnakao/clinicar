import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { UsuarioService } from '../exibe-usuario/exibe-usuario.service';
import { WhatsappCloudService } from '../../../services/whatsapp-cloud.service';

declare var bootstrap: any;

export interface Usuario {
  id?: number;
  cpf: string;
  nome: string;
  nome_social: string;
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
  status: string;
}
@Component({
  selector: 'app-exibe-usuario', standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './exibe-usuario.component.html',
  styleUrls: ['./exibe-usuario.component.css']
})
export class ExibeUsuarioComponent implements OnInit {
  modalEdicao: any;
  usuarios: Usuario[] = [];
  private todos: Usuario[] = [];
  editId: number | null = null;
  edit: Partial<Usuario> = {};
  loading = false;
  errorMsg = '';
  constructor(
    private readonly usuarioService: UsuarioService,
    private readonly whatsappCloudService: WhatsappCloudService,
    private readonly http: HttpClient
  ) { }
  ngOnInit(): void {
    this.recarregar();
  }
  recarregar(): void {
    this.loading = true;
    this.errorMsg = '';
    this.usuarioService.listarTodos().subscribe({
      next: (lista) => {
        this.todos = (lista || []).map(u => ({
          ...u,
          status: (u as any).status ?? '',
          cpf: this.formatarCPF(u.cpf),
          cep: this.formatarCEP(u.cep),
          telefone: this.exibirTelefoneFormatado(u.telefone),
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
    if (!t) {
      this.usuarios = [...this.todos];
      return;
    }
    this.usuarios = this.todos.filter(u => {
      const cpfRaw = (u.cpf || '').toLowerCase();
      const cpfFmt = this.formatarCPF(u.cpf).toLowerCase();
      return cpfRaw.includes(t) || cpfFmt.includes(t) ||
      (u.nome || '').toLowerCase().includes(t) || (u.nome_social || '').toLowerCase().includes(t) ||
      (u.email || '').toLowerCase().includes(t);
    });
  }
  trackByUsuario = (_: number, u: Usuario) => u.id ?? u.cpf;
  iniciarEdicao(u: Usuario): void {
    this.editId = u.id ?? null; this.edit = {
      ...u, nascimento: this.asInputDateString(u.nascimento)
    };
  }
  cancelarEdicao(): void {
    this.editId = null;
    this.edit = {};
  }
  salvarEdicao(id: number): void {
    if (!this.editId || this.editId !== id)
      return;
    const payload: Partial<Usuario> = {
      ...this.edit, cpf: this.onlyDigits(this.edit.cpf),
      cep: this.onlyDigits(this.edit.cep),
      telefone: this.onlyDigits(this.edit.telefone),
      // recomendado
      estado: (this.edit.estado || '').toString().toUpperCase(),
      tipo_do_acesso: (this.edit.tipo_do_acesso || '').toString().toLowerCase(),
    };
    this.usuarioService.atualizarUsuario(id, payload).subscribe({
      next: (atualizado) => {
        const idxTodos = this.todos.findIndex(x => x.id === id);
        if (idxTodos > -1) {
          this.todos[idxTodos] = {
            ...this.todos[idxTodos],
            ...atualizado,
            ...{
              tipo_do_acesso: (atualizado.tipo_do_acesso || '').toLowerCase()
            },
            nascimento: this.asInputDateString(atualizado.nascimento),
          };
        }
        const idxView = this.usuarios.findIndex(x => x.id === id);
        if (idxView > -1) {
          this.usuarios[idxView] = {
            ...this.usuarios[idxView],
            ...atualizado,
            ...{
              tipo_do_acesso: (atualizado.tipo_do_acesso || '').toLowerCase()
            },
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
  inativar(id?: number): void {
    if (!id) {
      return;
    }
    if (!confirm('Confirma inativar este usuário?')) {
      return;
    }
    const usuarioAtual = this.todos.find(u => u.id === id) ?? this.usuarios.find(u => u.id === id);
    if (!usuarioAtual) {
      alert('Usuário não encontrado para inativação.');
      return;
    }
    const payload: Partial<Usuario> = {
      ...usuarioAtual,
      status: 'inativo'
    };
    this.usuarioService.atualizarUsuario(id, payload).subscribe({
      next: (atualizado) => {
        const usuarioAtualizado: Usuario = {
          ...usuarioAtual,
          ...atualizado,
          status: 'inativo',
          nascimento: this.asInputDateString(atualizado.nascimento ?? usuarioAtual.nascimento)
        };
        const idxTodos = this.todos.findIndex(u => u.id === id);
        if (idxTodos > -1) {
          this.todos[idxTodos] = usuarioAtualizado;
        }
        const idxView = this.usuarios.findIndex(u => u.id === id);
        if (idxView > -1) {
          this.usuarios[idxView] = usuarioAtualizado;
        }
        this.cancelarEdicao();
        alert('Usuário inativado com sucesso.');
      },
      error: (err) => {
        console.error(err);
        alert('Erro ao inativar usuário.');
      }
    });
  }
  // ====== FORMATAÇÕES ======
  formatarCPF(cpf: string | null | undefined): string {
    const d = this.onlyDigits(cpf);
    if (d.length !== 11) return cpf ?? '';    // CORRIGIDO: xxx.xxx.xxx-xx
    return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9, 11)}`;
  }
  formatarCEP(cep: string | null | undefined): string {
    const d = this.onlyDigits(cep);
    if (d.length !== 8)
      return cep ?? '';
    return `${d.slice(0, 5)}-${d.slice(5, 8)}`;
  }
  // ====== VIA CEP (na linha em edição) ======
  onCepBlurRow(model: Partial<Usuario>): void {
    const cepNums = this.onlyDigits(model.cep);
    if (cepNums.length !== 8) {
      alert('CEP deve conter 8 dígitos.');
      return;
    }
    model.cep = this.formatarCEP(cepNums);
    this.http.get<any>(`https://viacep.com.br/ws/${cepNums}/json/`).subscribe({
      next: (resp) => {
        if (resp?.erro) {
          alert('CEP não encontrado.');
          return;
        }
        model.logradouro = resp.logradouro || '';
        model.bairro = resp.bairro || '';
        model.cidade = resp.localidade || '';
        model.estado = (resp.uf || '').toUpperCase();
        if (!model.complemento_endereco && resp.complemento) {
          model.complemento_endereco = resp.complemento;
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
    return (v ?? '').toString().replaceAll(/\D/g, '');
  }

  private asInputDateString(v: any): string {
    if (!v) return '';
    if (typeof v === 'string') {
      if (/^\d{4}-\d{2}-\d{2}$/.test(v))
        return v;
      const re = /^(\d{2})\/(\d{2})\/(\d{4})$/;
      const m = re.exec(v);
      if (m) return `${m[3]}-${m[2]}-${m[1]}`;
      const d = new Date(v); return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
    }
    if (v instanceof Date)
      return v.toISOString().slice(0, 10);
    try {
      const d = new Date(v);
      return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
    }
    catch {
      return '';
    }
  }
  exibirTelefoneFormatado(telefone: string): string {
    if (!telefone) return '';
    const n = this.onlyDigits(telefone);
    const codigoPais = '55';
    if (n.length >= 11) {
      const ddd = n.slice(-11, -9);
      const parte1 = n.slice(-9, -4);
      const parte2 = n.slice(-4);
      telefone = `+${codigoPais} (${ddd}) ${parte1}-${parte2}`;
    }
    else if (n.length >= 10) {
      const ddd = n.slice(0, 2);
      const parte1 = n.slice(2, 6);
      const parte2 = n.slice(6, 10);
      telefone = `+${codigoPais} (${ddd}) ${parte1}-${parte2}`;
    }
    else if (n.length >= 8) {
      const ddd = '11';
      const parte1 = n.slice(0, -4);
      const parte2 = n.slice(-4);
      telefone = `+${codigoPais} (${ddd}) ${parte1}-${parte2}`;
    } else {
      telefone = n;
    }
    return telefone;
  }
  formatarTelefone(usuario: Usuario): void {
    if(!usuario.telefone) return;
    const numero = usuario.telefone.replaceAll(/\D/g, '');
    const codigoPais = '55';
    if(numero.length >= 11) {
      const ddd = numero.slice(-11, -9);
      const parte1 = numero.slice(-9, -4);
      const parte2 = numero.slice(-4);
      usuario.telefone = `+${ codigoPais } (${ ddd }) ${ parte1 } -${ parte2 }`;
  }
  else if (numero.length >= 10) {
    const ddd = numero.slice(0, 2);
    const parte1 = numero.slice(2, 6);
    const parte2 = numero.slice(6, 10);
    usuario.telefone = `+${ codigoPais } (${ ddd }) ${ parte1 } -${ parte2 }`;
  }
  else if (numero.length >= 8) {
    const ddd = '11';
    const parte1 = numero.slice(0, -4);
    const parte2 = numero.slice(-4);
    usuario.telefone = `+${ codigoPais } (${ ddd }) ${ parte1 } -${ parte2 }`;
  }
}

capitalizar(s: string | null | undefined): string {
  if (!s) return '';
  return s.split(' ').map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join(' ');
}
enviarWhatsappUsuario(usuario: Usuario): void {
  if(!usuario.telefone) {
    alert('Este usuário não possui telefone cadastrado.');
    return;
  }
  if (!confirm(`Enviar mensagem de WhatsApp para ${ usuario.nome } ?`)) {
    return;
  }
  this.whatsappCloudService.enviarMensagem({
    telefone: usuario.telefone
  }).subscribe({
    next: () => { alert('Mensagem enviada com sucesso.'); },
    error: (err) => {
      console.error(err);
      alert('Erro ao enviar mensagem pelo WhatsApp.');
    }
  });
}
abrirModalEdicao(usuario: Usuario): void {
  this.editId = usuario.id ?? null; this.edit = {
    ...usuario,
    nascimento: this.asInputDateString(usuario.nascimento)
  };
  const el = document.getElementById('modalEdicaoUsuario');
  if(!el) {
    console.error('Modal modalEdicaoUsuario não encontrado.');
    return;
  }
  this.modalEdicao = bootstrap.Modal.getOrCreateInstance(el);
  this.modalEdicao.show();
}
salvarEdicaoModal(): void {
  if(!this.editId) {
  return;
}
const payload: Partial<Usuario> = {
  ...this.edit,
  cpf: this.onlyDigits(this.edit.cpf),
  cep: this.onlyDigits(this.edit.cep),
  telefone: this.onlyDigits(this.edit.telefone),
  estado: (this.edit.estado || '').toString().toUpperCase()
};
this.usuarioService.atualizarUsuario(this.editId, payload).subscribe({
  next: (atualizado) => {
    const usuarioAtualizado = {
      ...payload,
      ...atualizado,
      cpf: this.onlyDigits(payload.cpf ?? ''),
      cep: this.onlyDigits(payload.cep ?? ''),
      telefone: this.onlyDigits(payload.telefone ?? ''),
      nascimento: this.asInputDateString(atualizado.nascimento)
    } as Usuario;
    const idxTodos = this.todos.findIndex(u => u.id === this.editId);
    if (idxTodos > -1) {
      this.todos[idxTodos] = usuarioAtualizado;
    }
    const idxView = this.usuarios.findIndex(u => u.id === this.editId);
    if (idxView > -1) {
      this.usuarios[idxView] = usuarioAtualizado;
    } this.modalEdicao?.hide();
    this.cancelarEdicao();
    alert('Usuário atualizado com sucesso.');
    this.recarregar();
  },
  error: (err) => {
    console.error(err);
    alert('Erro ao salvar alterações do usuário.');
  }
});
          }
        }
