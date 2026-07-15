import { Component, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import {
  ExibeFornecedorService,
  Fornecedor
} from './exibe-fornecedor.service';

declare var bootstrap: any;

@Component({
  selector: 'app-exibe-fornecedor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './exibe-fornecedor.component.html',
  styleUrls: ['./exibe-fornecedor.component.css']
})
export class ExibeFornecedorComponent implements OnInit {

  fornecedores: Fornecedor[] = [];
  private todos: Fornecedor[] = [];

  novoFornecedor: Partial<Fornecedor> = {};
  edit: Partial<Fornecedor> = {};
  editId: number | null = null;

  modalCadastro: any;
  modalEdicao: any;

  loading = false;
  errorMsg = '';
  camposInvalidos: string[] = [];

  constructor(
    private readonly fornecedorService: ExibeFornecedorService,
    private readonly http: HttpClient,
    private readonly location: Location
  ) {}

  ngOnInit(): void {
    this.recarregar();
  }

  recarregar(): void {
    this.loading = true;
    this.errorMsg = '';

    this.fornecedorService.listarTodos().subscribe({
      next: (lista) => {
        this.todos = (lista || []).map(f => ({
          ...f,
          cnpj: this.formatarCNPJ(f.cnpj),
          cep: this.formatarCEP(f.cep),
          telefone: this.exibirTelefoneFormatado(f.telefone),
          fundacao: this.asInputDateString(f.fundacao),
          estado: (f.estado || '').toUpperCase()
        }));

        this.fornecedores = [...this.todos];
        this.loading = false;
        this.cancelarEdicao();
      },
      error: (err) => {
        console.error(err);
        this.loading = false;
        this.errorMsg = this.extrairMensagemErro(
          err,
          'Falha ao carregar fornecedores.'
        );
      }
    });
  }

  filtrar(term: string): void {
    const t = (term || '').trim().toLowerCase();

    if (!t) {
      this.fornecedores = [...this.todos];
      return;
    }

    const termoNumerico = this.onlyDigits(t);

    this.fornecedores = this.todos.filter(f => {
      const cnpjRaw = this.onlyDigits(f.cnpj);
      const cnpjFmt = this.formatarCNPJ(f.cnpj).toLowerCase();

      return (
        cnpjRaw.includes(termoNumerico) ||
        cnpjFmt.includes(t) ||
        (f.razaoSocial || '').toLowerCase().includes(t) ||
        (f.nomeFantasia || '').toLowerCase().includes(t) ||
        (f.itemFornecido || '').toLowerCase().includes(t) ||
        (f.email || '').toLowerCase().includes(t) ||
        (f.telefone || '').toLowerCase().includes(t) ||
        (f.cidade || '').toLowerCase().includes(t) ||
        (f.estado || '').toLowerCase().includes(t)
      );
    });
  }

  trackByFornecedor = (_: number, f: Fornecedor) => f.id ?? f.cnpj;

  abrirModalCadastro(): void {
    this.camposInvalidos = [];

    this.novoFornecedor = {
      cnpj: '',
      razaoSocial: '',
      nomeFantasia: '',
      itemFornecido: '',
      telefone: '',
      email: '',
      fundacao: '',
      cep: '',
      logradouro: '',
      bairro: '',
      cidade: '',
      estado: '',
      complementoEndereco: '',
      numeroEndereco: ''
    };

    const el = document.getElementById('modalCadastroFornecedor');

    if (!el) {
      console.error('Modal modalCadastroFornecedor não encontrado.');
      return;
    }

    this.modalCadastro = bootstrap.Modal.getOrCreateInstance(el);
    this.modalCadastro.show();
  }

  salvarNovoFornecedor(): void {
    const camposObrigatorios = [
      'cnpj',
      'razaoSocial',
      'nomeFantasia',
      'itemFornecido',
      'telefone',
      'email',
      'fundacao',
      'cep',
      'logradouro',
      'bairro',
      'cidade',
      'estado',
      'numeroEndereco'
    ] as const;

    const faltando = camposObrigatorios.filter(campo =>
      !String(this.novoFornecedor[campo] ?? '').trim()
    );

    if (faltando.length) {
      this.camposInvalidos = [...faltando];
      alert('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    const payload = this.montarPayloadFornecedor(this.novoFornecedor);

    this.fornecedorService.cadastrarFornecedor(payload).subscribe({
      next: () => {
        this.modalCadastro?.hide();
        alert('Fornecedor cadastrado com sucesso.');
        this.recarregar();
      },
      error: (err) => {
        console.error(err);
        alert(
          this.extrairMensagemErro(
            err,
            'Erro ao cadastrar fornecedor.'
          )
        );
      }
    });
  }

  abrirModalEdicao(fornecedor: Fornecedor): void {
    this.camposInvalidos = [];
    this.editId = fornecedor.id ?? null;

    this.edit = {
      ...fornecedor,
      fundacao: this.asInputDateString(fornecedor.fundacao),
      cnpj: this.formatarCNPJ(fornecedor.cnpj),
      cep: this.formatarCEP(fornecedor.cep),
      telefone: this.exibirTelefoneFormatado(fornecedor.telefone),
      estado: (fornecedor.estado || '').toUpperCase()
    };

    const el = document.getElementById('modalEdicaoFornecedor');

    if (!el) {
      console.error('Modal modalEdicaoFornecedor não encontrado.');
      return;
    }

    this.modalEdicao = bootstrap.Modal.getOrCreateInstance(el);
    this.modalEdicao.show();
  }

  salvarEdicaoModal(): void {
    if (!this.editId) {
      return;
    }
    const camposObrigatorios = [
      'cnpj',
      'razaoSocial',
      'nomeFantasia',
      'itemFornecido',
      'telefone',
      'email',
      'fundacao',
      'cep',
      'logradouro',
      'bairro',
      'cidade',
      'estado',
      'numeroEndereco'
    ] as const;
    const faltando = camposObrigatorios.filter(campo =>
      !String(this.edit[campo] ?? '').trim()
    );
    if (faltando.length) {
      this.camposInvalidos = [...faltando];
      alert('Por favor, preencha todos os campos obrigatórios.');
      return;
    }
    const payload = this.montarPayloadFornecedor(this.edit);
    this.fornecedorService.atualizarFornecedor(this.editId, payload).subscribe({
      next: () => {
        this.modalEdicao?.hide();
        this.cancelarEdicao();
        alert('Fornecedor atualizado com sucesso.');
        this.recarregar();
      },
      error: (err) => {
        console.error(err);
        alert(
          this.extrairMensagemErro(
            err,
            'Erro ao salvar alterações do fornecedor.'
          )
        );
      }
    });
  }

  cancelarEdicao(): void {
    this.editId = null;
    this.edit = {};
  }

  remover(id?: number): void {
    if (!id) {
      return;
    }

    if (!confirm('Confirma a exclusão deste fornecedor?')) {
      return;
    }

    this.fornecedorService.removerFornecedor(id).subscribe({
      next: () => {
        alert('Fornecedor removido com sucesso.');
        this.recarregar();
      },
      error: (err) => {
        console.error(err);
        alert(
          this.extrairMensagemErro(
            err,
            'Erro ao remover fornecedor.'
          )
        );
      }
    });
  }

  onCepBlurCadastro(): void {
    this.consultarCep(this.novoFornecedor);
  }

  onCepBlurEdicao(): void {
    this.consultarCep(this.edit);
  }

  private consultarCep(model: Partial<Fornecedor>): void {
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

        if (!model.complementoEndereco && resp.complemento) {
          model.complementoEndereco = resp.complemento;
        }
      },
      error: (err) => {
        console.error(err);
        alert('Falha ao consultar o CEP.');
      }
    });
  }

  private montarPayloadFornecedor(model: Partial<Fornecedor>): Partial<Fornecedor> {
    return {
      ...model,
      cnpj: this.onlyDigits(model.cnpj),
      cep: this.onlyDigits(model.cep),
      telefone: this.onlyDigits(model.telefone),
      estado: (model.estado || '').toString().toUpperCase(),
      fundacao: this.inputDateToBr(model.fundacao)
    };
  }

  formatarCNPJ(cnpj: string | null | undefined): string {
    const d = this.onlyDigits(cnpj);

    if (d.length !== 14) {
      return cnpj ?? '';
    }

    return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12, 14)}`;
  }

  formatarCEP(cep: string | null | undefined): string {
    const d = this.onlyDigits(cep);

    if (d.length !== 8) {
      return cep ?? '';
    }

    return `${d.slice(0, 5)}-${d.slice(5, 8)}`;
  }

  exibirTelefoneFormatado(telefone: string | null | undefined): string {
    if (!telefone) {
      return '';
    }

    const n = this.onlyDigits(telefone);
    const codigoPais = '55';

    if (n.length >= 11) {
      const ddd = n.slice(-11, -9);
      const parte1 = n.slice(-9, -4);
      const parte2 = n.slice(-4);

      return `+${codigoPais} (${ddd}) ${parte1}-${parte2}`;
    }

    if (n.length >= 10) {
      const ddd = n.slice(0, 2);
      const parte1 = n.slice(2, 6);
      const parte2 = n.slice(6, 10);

      return `+${codigoPais} (${ddd}) ${parte1}-${parte2}`;
    }

    if (n.length >= 8) {
      const ddd = '11';
      const parte1 = n.slice(0, -4);
      const parte2 = n.slice(-4);

      return `+${codigoPais} (${ddd}) ${parte1}-${parte2}`;
    }

    return n;
  }

  formatarDataBr(data: string | Date | null | undefined): string {
    const input = this.asInputDateString(data);

    if (!input) {
      return '';
    }

    const [ano, mes, dia] = input.split('-');

    return `${dia}/${mes}/${ano}`;
  }

  voltar(): void {
    this.location.back();
  }

  capitalizar(s: string | null | undefined): string {
    if (!s) {
      return '';
    }

    return s
      .split(' ')
      .map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
      .join(' ');
  }

  private onlyDigits(v: any): string {
    return (v ?? '').toString().replace(/\D/g, '');
  }

  private asInputDateString(v: any): string {
    if (!v) {
      return '';
    }

    if (typeof v === 'string') {
      if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
        return v;
      }

      const re = /^(\d{2})\/(\d{2})\/(\d{4})$/;
      const m = re.exec(v);

      if (m) {
        return `${m[3]}-${m[2]}-${m[1]}`;
      }

      const d = new Date(v);

      return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
    }

    if (v instanceof Date) {
      return v.toISOString().slice(0, 10);
    }

    try {
      const d = new Date(v);

      return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
    } catch {
      return '';
    }
  }

  private inputDateToBr(v: any): string {
    const input = this.asInputDateString(v);

    if (!input) {
      return '';
    }

    const [ano, mes, dia] = input.split('-');

    return `${dia}/${mes}/${ano}`;
  }

  private extrairMensagemErro(erro: any, mensagemPadrao: string): string {
    if (typeof erro?.error === 'string') {
      return erro.error;
    }

    if (typeof erro?.error?.mensagem === 'string') {
      return erro.error.mensagem;
    }

    if (typeof erro?.message === 'string') {
      return erro.message;
    }

    return mensagemPadrao;
  }
}
