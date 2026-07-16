import { Component, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Peca, PecaService } from './exibe-peca.service';

declare var bootstrap: any;

@Component({
  selector: 'app-exibe-peca',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './exibe-peca.component.html',
  styleUrls: ['./exibe-peca.component.css']
})
export class ExibePecaComponent implements OnInit {

  pecas: Peca[] = [];
  private todos: Peca[] = [];

  novaPeca: Partial<Peca> = {};
  edit: Partial<Peca> = {};
  editId: number | null = null;

  modalCadastro: any;
  modalEdicao: any;

  loading = false;
  errorMsg = '';
  camposInvalidos: string[] = [];

  constructor(
    private readonly pecaService: PecaService,
    private readonly location: Location
  ) {}

  ngOnInit(): void {
    this.recarregar();
  }

  recarregar(): void {
    this.loading = true;
    this.errorMsg = '';

    this.pecaService.listarTodasPecas().subscribe({
      next: (lista) => {
        this.todos = (lista || []).map(p => ({
          ...p,
          nome: this.capitalizarTexto(p.nome),
          tipo: this.capitalizarTexto(p.tipo),
          especificacao: this.caixaAltaTexto(p.especificacao),
          fabricante: this.capitalizarTexto(p.fabricante),
          modelo: this.capitalizarTexto(p.modelo),
          norma: this.caixaAltaTexto(p.norma),
          unidade: this.capitalizarTexto(p.unidade)
        }));

        this.pecas = [...this.todos];
        this.loading = false;
        this.cancelarEdicao();
      },
      error: (erro) => {
        console.error('Erro ao carregar peças:', erro);

        this.loading = false;
        this.errorMsg = this.extrairMensagemErro(
          erro,
          'Falha ao carregar peças.'
        );
      }
    });
  }

  filtrar(term: string): void {
    const t = (term || '').trim().toLowerCase();

    if (!t) {
      this.pecas = [...this.todos];
      return;
    }

    this.pecas = this.todos.filter(p => {
      return (
        (p.nome || '').toLowerCase().includes(t) ||
        (p.tipo || '').toLowerCase().includes(t) ||
        (p.especificacao || '').toLowerCase().includes(t) ||
        (p.fabricante || '').toLowerCase().includes(t) ||
        (p.modelo || '').toLowerCase().includes(t) ||
        (p.norma || '').toLowerCase().includes(t) ||
        (p.unidade || '').toLowerCase().includes(t)
      );
    });
  }

  trackByPeca = (_: number, p: Peca) => p.id ?? p.nome;

  abrirModalCadastro(): void {
    this.camposInvalidos = [];

    this.novaPeca = {
      nome: '',
      tipo: '',
      especificacao: '',
      fabricante: '',
      modelo: '',
      norma: '',
      unidade: ''
    };

    const el = document.getElementById('modalCadastroPeca');

    if (!el) {
      console.error('Modal modalCadastroPeca não encontrado.');
      return;
    }

    this.modalCadastro = bootstrap.Modal.getOrCreateInstance(el);
    this.modalCadastro.show();
  }

  salvarNovaPeca(): void {
    const camposObrigatorios = [
      'nome',
      'fabricante',
      'unidade'
    ] as const;

    const faltando = camposObrigatorios.filter(campo =>
      !String(this.novaPeca[campo] ?? '').trim()
    );

    if (faltando.length) {
      this.camposInvalidos = [...faltando];
      alert('Por favor, preencha os campos obrigatórios: nome, fabricante e unidade.');
      return;
    }

    const payload = this.montarPayloadCadastro(this.novaPeca);

    this.pecaService.cadastrar(payload).subscribe({
      next: () => {
        this.modalCadastro?.hide();
        alert('Peça cadastrada com sucesso.');
        this.recarregar();
      },
      error: (erro) => {
        console.error('Erro ao cadastrar peça:', erro);

        alert(
          this.extrairMensagemErro(
            erro,
            'Erro ao cadastrar peça.'
          )
        );
      }
    });
  }

  abrirModalEdicao(peca: Peca): void {
    this.camposInvalidos = [];
    this.editId = peca.id ?? null;

    this.edit = {
      ...peca
    };

    const el = document.getElementById('modalEdicaoPeca');

    if (!el) {
      console.error('Modal modalEdicaoPeca não encontrado.');
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
      'nome',
      'fabricante',
      'unidade'
    ] as const;

    const faltando = camposObrigatorios.filter(campo =>
      !String(this.edit[campo] ?? '').trim()
    );

    if (faltando.length) {
      this.camposInvalidos = [...faltando];
      alert('Por favor, preencha os campos obrigatórios: nome, fabricante e unidade.');
      return;
    }

    const payload = this.montarPayloadEdicao(this.edit);

    this.pecaService.atualizarPeca(this.editId, payload).subscribe({
      next: () => {
        this.modalEdicao?.hide();
        this.cancelarEdicao();
        alert('Peça atualizada com sucesso.');
        this.recarregar();
      },
      error: (erro) => {
        console.error('Erro ao salvar alterações da peça:', erro);

        alert(
          this.extrairMensagemErro(
            erro,
            'Erro ao salvar alterações da peça.'
          )
        );
      }
    });
  }

  cancelarEdicao(): void {
    this.editId = null;
    this.edit = {};
  }

  excluir(id?: number): void {
    if (!id) {
      return;
    }

    if (!confirm('Confirma a exclusão desta peça?')) {
      return;
    }

    this.pecaService.removerPeca(id).subscribe({
      next: () => {
        alert('Peça removida com sucesso.');
        this.recarregar();
      },
      error: (erro) => {
        console.error('Erro ao excluir peça:', erro);

        alert(
          this.extrairMensagemErro(
            erro,
            'Erro ao excluir peça.'
          )
        );
      }
    });
  }

  voltar(): void {
    this.location.back();
  }

  aoSairCampoCapitalizar(model: Partial<Peca>, campo: keyof Peca): void {
    const valor = model[campo];

    if (typeof valor === 'string') {
      (model as any)[campo] = this.capitalizarTexto(valor);
    }
  }

  aoSairCampoCaixaAlta(model: Partial<Peca>, campo: keyof Peca): void {
    const valor = model[campo];

    if (typeof valor === 'string') {
      (model as any)[campo] = this.caixaAltaTexto(valor);
    }
  }

  exibirCapitalizado(valor: string | null | undefined): string {
    return this.capitalizarTexto(valor);
  }

  exibirCaixaAlta(valor: string | null | undefined): string {
    return this.caixaAltaTexto(valor);
  }

  private montarPayloadCadastro(model: Partial<Peca>): Omit<Peca, 'id'> {
    return {
      nome: this.capitalizarTexto(model.nome),
      tipo: this.capitalizarTexto(model.tipo),
      especificacao: this.caixaAltaTexto(model.especificacao),
      fabricante: this.capitalizarTexto(model.fabricante),
      modelo: this.capitalizarTexto(model.modelo),
      norma: this.caixaAltaTexto(model.norma),
      unidade: this.capitalizarTexto(model.unidade)
    };
  }

  private montarPayloadEdicao(model: Partial<Peca>): Partial<Peca> {
    return {
      nome: this.capitalizarTexto(model.nome),
      tipo: this.capitalizarTexto(model.tipo),
      especificacao: this.caixaAltaTexto(model.especificacao),
      fabricante: this.capitalizarTexto(model.fabricante),
      modelo: this.capitalizarTexto(model.modelo),
      norma: this.caixaAltaTexto(model.norma),
      unidade: this.capitalizarTexto(model.unidade)
    };
  }

  private capitalizarTexto(valor: string | null | undefined): string {
    if (!valor) {
      return '';
    }

    return valor
      .trim()
      .split(' ')
      .filter(parte => parte.length > 0)
      .map(parte => parte.charAt(0).toUpperCase() + parte.slice(1).toLowerCase())
      .join(' ');
  }

  private caixaAltaTexto(valor: string | null | undefined): string {
    if (!valor) {
      return '';
    }

    return valor.trim().toUpperCase();
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
