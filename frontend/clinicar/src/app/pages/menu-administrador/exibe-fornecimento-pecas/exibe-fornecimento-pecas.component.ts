import { Component, ElementRef, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ExibeFornecimentoPecasService } from '../exibe-fornecimento-pecas/exibe-fornecimento-pecas.service';
import { FornecedorService, Fornecedor } from '../exibe-fornecedor/exibe-fornecedor.service';
import { PecaService, Peca } from '../exibe-peca/exibe-peca.service';

declare var bootstrap: any;
export interface FornecimentoPeca {
  id?: number;
  fornecedor: {
    id: number;
    razaoSocial: string;
  };
  peca: {
    id?: number;
    nome: string;
    fabricante: string;
    modelo: string;
  };
  valorCusto: string;
  prazoEntregaDias: string;
  quantidadeMinima: string;
  ativo: string;
  dataCadastro: string;
}
@Component({
  selector: 'app-exibe-fornecimento-peca',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './exibe-fornecimento-pecas.component.html',
  styleUrls: ['./exibe-fornecimento-pecas.component.css']
})

export class ExibeFornecimentoPecaComponent implements OnInit {
  modalFornecedor: any;
  modalPeca: any;
  private modalEdicao: any;
  fornecimentosPeca: FornecimentoPeca[] = [];
  private todos: FornecimentoPeca[] = [];
  editId: number | null = null;
  edit: Partial<FornecimentoPeca> = {};
  loading = false;
  errorMsg = '';
  // ======================================================
  // FORNECEDORES
  // ======================================================
  fornecedores: Fornecedor[] = [];
  fornecedoresFiltrados: Fornecedor[] = [];
  dropdownOpenIdFornecedor: number | null = null;
  razaoSocialFiltroEdit = '';
  // ======================================================
  // PEÇAS
  // ======================================================
  pecas: Peca[] = [];
  pecasFiltradas: Peca[] = [];
  dropdownOpenIdPeca: number | null = null;
  descricaoFiltroEdit = '';
  constructor(
    private readonly fornecedorService: FornecedorService,
    private readonly pecaService: PecaService,
    private readonly fornecimentoPecaService: ExibeFornecimentoPecasService,
    private readonly host: ElementRef
  ) {}
  ngOnInit(): void {
    this.carregarFornecedores();
    this.carregarPecas();
    this.recarregarFornecimentos();
  }
  // ======================================================
  // FORNECEDORES
  // ======================================================
  abrirModalFornecedor(): void {
    this.razaoSocialFiltroEdit = '';
    this.aplicarFiltroFornecedorEdit();
    const el = document.getElementById('modalFornecedor');
    if (!el) { return;}
    this.modalFornecedor = bootstrap.Modal.getOrCreateInstance(el);
    this.modalFornecedor.show();
  }
  selecionarFornecedorModal(fornecedor: Fornecedor): void {
    this.edit.fornecedor = {
      id: fornecedor.id,
      razaoSocial: fornecedor.razaoSocial
    };
    this.modalFornecedor.hide();
  }
  abrirModalPeca(): void {
    this.descricaoFiltroEdit = '';
    this.aplicarFiltroPecaEdit();
    const el = document.getElementById('modalPeca');
    if (!el) { return;}
    this.modalPeca = bootstrap.Modal.getOrCreateInstance(el);
    this.modalPeca.show();
  }
  selecionarPecaModal(peca: Peca): void {
    this.edit.peca = {
      id: peca.id,
      nome: peca.nome,
      fabricante: peca.fabricante,
      modelo: peca.modelo ?? ''
    };
    this.modalPeca.hide();
  }
  private carregarFornecedores(): void {
    this.fornecedorService.listarTodosFornecedores().subscribe({
      next: (lista) => {
        this.fornecedores = lista ?? [];
        this.fornecedoresFiltrados = [
          ...this.fornecedores
        ];
      },
      error: (e) => {
        console.error('Falha ao carregar fornecedores:', e);
      }
    });
  }
  fornecedorRazaoSocial(fornecimento: FornecimentoPeca): string {
    return this.capitalizar(fornecimento.fornecedor?.razaoSocial) || '—';
  }
  toggleFornecedoresDropdownFor(rowId: number, open?: boolean) {
    const shouldOpen = open ?? (this.dropdownOpenIdFornecedor !== rowId);
    this.dropdownOpenIdFornecedor = shouldOpen ? rowId : null;
    if (this.dropdownOpenIdFornecedor != null) {
      this.razaoSocialFiltroEdit = '';
      this.aplicarFiltroFornecedorEdit();
    }
  }
  //this.fornecedoresFiltrados[1]?.id.toString()
  aplicarFiltroFornecedorEdit(): void {
    const t = this.razaoSocialFiltroEdit.trim().toLowerCase();
      if (!t) {
        this.fornecedoresFiltrados = [
          ...this.fornecedores
        ];
      return;
    }
    this.fornecedoresFiltrados = this.fornecedores.filter((f) => {
      const razao = (f.razaoSocial || '').toLowerCase();
      return (razao.includes(t));
    });
  }
  selecionarFornecedorEdit(fornecedor: Fornecedor): void {
    if (!fornecedor.id) {
      return;
    }
    this.edit.fornecedor = { id: fornecedor.id, razaoSocial: fornecedor.razaoSocial };
    this.dropdownOpenIdFornecedor = null;
  }
  // ======================================================
  // PEÇAS
  // ======================================================
  private carregarPecas(): void {
    this.pecaService.listarTodasPecas().subscribe({
      next: (lista) => {
        this.pecas = lista ?? [];
        this.pecasFiltradas = [
          ...this.pecas
        ];
      },
      error: (e) => {
        console.error('Falha ao carregar peças:', e);
      }
    });
  }
  descricaoPeca(fornecimento: FornecimentoPeca): string {
    return this.capitalizar(fornecimento.peca?.nome) || '—';
  }
  togglePecasDropdownFor(rowId: number, open?: boolean) {
    const shouldOpen = open ?? (this.dropdownOpenIdPeca !== rowId);
    this.dropdownOpenIdPeca = shouldOpen ? rowId : null;
    if (this.dropdownOpenIdPeca != null) {
      this.descricaoFiltroEdit = '';
      this.aplicarFiltroPecaEdit();
    }
  }
  aplicarFiltroPecaEdit(): void {
    const t = this.descricaoFiltroEdit.trim().toLowerCase();
    if (!t) {this.pecasFiltradas = [
        ...this.pecas
      ];
      return;
    }
    this.pecasFiltradas = this.pecas.filter((p) => {
      const nome = (p.nome || '');
      const fabricante = (p.fabricante || '').toLowerCase();
      const modelo = (p.modelo || '').toLowerCase();
      return (nome.includes(t) || fabricante.includes(t) || modelo.includes(t));
    });
  }
  selecionarPecaEdit(peca: Peca): void {
    if (!peca.id) {return;}
    this.edit.peca = {
      id: peca.id,
      nome: peca.nome ?? '',
      fabricante: peca.fabricante ?? '',
      modelo: peca.modelo ?? ''
    };
    this.dropdownOpenIdPeca = null;
  }
  // ======================================================
  // FORNECIMENTOS
  // ======================================================
  recarregarFornecimentos(): void {
    this.loading = true;
    this.errorMsg = '';
    this.fornecimentoPecaService.listarTodosFornecimentos().subscribe({
      next: (lista) => {
        this.todos = (lista ?? []).map((item: any): FornecimentoPeca => ({
          ...item,
          fornecedor: item.fornecedor ?? {
            id: item.idFornecedor ?? 0,
            razaoSocial: item.razaoSocialFornecedor ?? ''
          },
          peca: item.peca ?? {
            id: item.idPeca ?? 0,
            nome: item.nomePeca ?? '',
            fabricante: item.fabricantePeca ?? '',
            modelo: item.modeloPeca ?? ''
          }
        }));
        this.fornecimentosPeca = [
          ...this.todos
        ];
        this.loading = false;
        this.cancelarEdicao();
        if (this.modalEdicao) {
          this.modalEdicao.hide();
        }
      },
      error: (e) => {
        console.error(e);
        this.loading = false;
        this.errorMsg = 'Falha ao carregar fornecimentos.';
      }
    });
  }
  trackByFornecedor = (_: number, f: Fornecedor) => f.id ?? f.razaoSocial;
  trackByPeca = (_: number, p: Peca) => p.id ?? p.nome;
  iniciarEdicao(f: FornecimentoPeca): void {
    this.editId = f.id ?? null;
    this.edit = {
      ...f,
      fornecedor: { ...f.fornecedor },
      peca: {...f.peca },
      valorCusto: this.formatarValorUnitario(f.valorCusto),
    };
    this.razaoSocialFiltroEdit = '';
    this.descricaoFiltroEdit = '';
  }
  cancelarEdicao(): void {
    this.editId = null;
    this.edit = {};
    this.razaoSocialFiltroEdit = '';
    this.descricaoFiltroEdit = '';
  }
  salvarEdicao(id: number): void {
    if (!this.editId || this.editId !== id) {return;}
    const payload = {
      idFornecedor: this.edit.fornecedor?.id,
      idPeca: this.edit.peca?.id,
      valorCusto: this.edit.valorCusto,
      prazoEntregaDias: this.edit.prazoEntregaDias,
      quantidadeMinima: this.edit.quantidadeMinima,
      ativo: this.edit.ativo,
      dataCadastro: this.edit.dataCadastro
    };
    this.fornecimentoPecaService.atualizarFornecimentoPeca(id, payload).subscribe({
      next: (atualizado) => {
        const i = this.fornecimentosPeca.findIndex(
          (x) => x.id === id
        );
        if (i > -1) {
          this.fornecimentosPeca[i] = {
            ...this.fornecimentosPeca[i],
            ...atualizado,
            fornecedor: (atualizado as any).fornecedor ?? this.edit.fornecedor,
            peca: (atualizado as any).peca ?? this.edit.peca
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
    if (!id) {return;}
    if (!confirm('Confirma excluir este fornecimento?')) {return;}
    this.fornecimentoPecaService.removerFornecimentoPeca(id).subscribe({
      next: () => {
        this.fornecimentosPeca = this.fornecimentosPeca.filter((f) => f.id !== id);
        this.todos = this.todos.filter((f) => f.id !== id);
      },
      error: (err) => {
        console.error(err);
        alert('Erro ao excluir fornecimento.');
      }
    });
  }
  // ======================================================
  // CLICK FORA
  // ======================================================
  @HostListener('document:click', ['$event']) onDocClick(e: MouseEvent): void {
  }
  // ======================================================
  // TRACK BY
  // ======================================================
  trackByFornecimento(_: number, f: FornecimentoPeca): number {
    return f.id ?? 0;
  }
  // ======================================================
  // HELPERS
  // ======================================================
  private onlyDigits(v: any): string {
    return (v ?? '').toString().replace(/\D/g, '');
  }
  formatarMoedaBR(valor: any): string {
    if (valor === null || valor === undefined || valor === '') {return '';}
    const numero = Number(valor);
    return numero.toLocaleString(
      'pt-BR',
      {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }
    );
  }
  public formatarValorUnitario(string: string): string {
    return 'R$ ' + this.onlyDigits(string).replace(/^(\d+)(\d{2})$/, '$1,$2');
  }
  public converterValorCusto(): void {
    let valor = this.edit.valorCusto;
    if (!valor) {return;}
    valor = valor.replace('R$', '').trim().replaceAll('.', '').replace(',', '.');
    const numero = Number(valor);
    if (Number.isNaN(numero)) {return;}
    this.edit.valorCusto = numero.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }
  converterMoedaParaNumero(valor: any): string {
    if (!valor) {
      return '0';
    }
    return valor
      .toString()
      .replace('R$', '')
      .replace(/\s/g, '')
      .replaceAll('.', '')
      .replace(',', '.');
  }
  public formatarCNPJ( cnpj?: string): string {
    const d = this.onlyDigits(cnpj);
    if (d.length !== 14) {
      return cnpj ?? '';
    }
    return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12, 14)}`;
  }
  public capitalizar(texto?: string): string {
    if (!texto) {return '';}
    const s = texto.trim();
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
  }
  abrirModalEdicao(f: FornecimentoPeca): void {
    this.editId = f.id ?? null;
    this.edit = {
      ...f,
      fornecedor: { ...f.fornecedor },
      peca: { ...f.peca },
      valorCusto: this.formatarMoedaBR(f.valorCusto),
    };
    const el = document.getElementById('modalEdicaoFornecimento');
    this.modalEdicao = bootstrap.Modal.getOrCreateInstance(el);
    this.modalEdicao.show();
  }
  public salvarEdicaoModal(): void {
    this.edit = {
      ...this.edit,
      valorCusto: this.converterMoedaParaNumero(
        this.edit.valorCusto
      )
    };
    if (!this.editId) {return;}
    this.salvarEdicao(this.editId);
    if (this.modalEdicao) {this.modalEdicao.hide();}
  }
  public formatarValorCusto(): void {
    let valor = this.edit.valorCusto;
    if (!valor) {return;}
    valor = valor.replace('R$', '').trim().replace(/\s/g, '');
    // Se existir vírgula, assume padrão brasileiro
    if (valor.includes(',')) {valor = valor.replaceAll(/\./g, '').replace(',', '.');}
    const numero = Number(valor);
    if(Number.isNaN(numero)) {return;}
    this.edit.valorCusto =  numero.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }
}
