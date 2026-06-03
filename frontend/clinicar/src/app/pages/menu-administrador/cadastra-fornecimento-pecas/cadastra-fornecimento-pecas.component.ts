import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import {FornecedorService, Fornecedor} from '../exibe-fornecedor/exibe-fornecedor.service';
import {PecaService, Peca} from '../exibe-peca/exibe-peca.service';
import { FornecimentoPecasService } from './cadastra-fornecimento-pecas.service';
declare var bootstrap: any;
/** ===== Payload enviado ao BACKEND ===== */
type FornecimentoPecasPayload = {
  idFornecedor: string;
  idPeca: string;
  valorCusto: string;
  prazoEntregaDias: string;
  quantidadeMinima: string;
  ativo: string;
  dataCadastro: string;
};

@Component({
  selector: 'app-cadastra-fornecimento-pecas',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './cadastra-fornecimento-pecas.component.html',
  styleUrls: ['./cadastra-fornecimento-pecas.component.css']
})

export class CadastraFornecimentoPecasComponent implements OnInit {

  /** ===== Modelo do formulário ===== */

  fornecimentoPeca: FornecimentoPecasPayload = {
    idFornecedor: '',
    idPeca: '',
    valorCusto: '',
    prazoEntregaDias: '',
    quantidadeMinima: '',
    ativo: '',
    dataCadastro: ''
  };

  /** ===== Fornecedor ===== */
  modalFornecedor: any;
  modalPeca: any;
  fornecedores: Fornecedor[] = [];
  fornecedoresFiltrados: Fornecedor[] = [];
  cnpjFiltro = '';
  cnpjDisplay = '';
  cnpjRazaoSocialDisplay = '';
  cnpjErro = '';
  nomeFornecedorSelecionado = '';

  /** ===== Peça ===== */
  pecas: Peca[] = [];
  pecasFiltradas: Peca[] = [];
  idFiltro = '';
  idDisplay = '';
  idErro = '';
  nomePecaSelecionada = '';

  constructor(
    private readonly http: HttpClient,
    private readonly fornecedorService: FornecedorService,
    private readonly pecaService: PecaService,
    private readonly fornecimentoPecasService: FornecimentoPecasService
  ) {}

  ngOnInit(): void {
    this.recarregarFornecedores();
    this.recarregarPecas();
  }

  // ======================================================
  // FORNECEDORES
  // ======================================================

  recarregarFornecedores(): void {
    this.fornecedorService.listarTodosFornecedores().subscribe({
      next: lista => {
        this.fornecedores = lista?.filter(f => f.itemFornecido.startsWith('Peças')) ?? [];
        this.fornecedoresFiltrados = [...this.fornecedores];
      },
      error: e => console.error('Falha ao carregar fornecedores:', e)
    });
  }

  aplicarFiltroFornecedor(): void {
    const t = (this.cnpjFiltro || '').trim().toLowerCase();
    if (!t) {
      this.fornecedoresFiltrados = [...this.fornecedores];
      return;
    }
    const tDigits = this.onlyDigits(t);
    this.fornecedoresFiltrados = this.fornecedores.filter(f => {
      const cnpjFmt = this.formatarCNPJ(f.cnpj).toLowerCase();
      const cnpjDigits = this.onlyDigits(f.cnpj);
      return (cnpjFmt.includes(t) ||
        cnpjDigits.includes(tDigits) ||
        (f.razaoSocial || '').toLowerCase().includes(t) ||
        (f.email || '').toLowerCase().includes(t)
      );
    });
  }

  selecionarFornecedor(f: Fornecedor): void {
    if (!f?.id) {
      this.cnpjErro = 'Fornecedor inválido.';
      return;
    }
    this.fornecimentoPeca.idFornecedor = String(f.id);
    this.cnpjDisplay = this.formatarCNPJ(f.cnpj);
    this.cnpjRazaoSocialDisplay = f.razaoSocial ?? '';
    this.nomeFornecedorSelecionado = f.razaoSocial ?? '';
    this.cnpjErro = '';
  }

  // ======================================================
  // PEÇAS
  // ======================================================

  recarregarPecas(): void {
    this.pecaService.listarTodasPecas().subscribe({
      next: lista => {
        this.pecas = lista ?? [];
        this.pecasFiltradas = [...this.pecas];
      },
      error: e => console.error('Falha ao carregar peças:', e)
    });
  }

  aplicarFiltroPeca(): void {
    const t = (this.idFiltro || '').trim().toLowerCase();
    if (!t) {
      this.pecasFiltradas = [...this.pecas];
      return;
    }
    const tDigits = this.onlyDigits(t);
    this.pecasFiltradas = this.pecas.filter(p => {
      const idTexto = String(p.id);
      return (idTexto.includes(tDigits) || (p.nome || '').toLowerCase().includes(t));
    });
  }

  selecionarPeca(p: Peca): void {
    if (!p?.id) {this.idErro = 'Peça inválida.'; return;}

    this.fornecimentoPeca.idPeca = String(p.id);

    this.idDisplay = String(p.id);

    this.nomePecaSelecionada = `${this.capitalizar(p.nome)} - ${this.capitalizar(p.fabricante)} - ${(p.modelo ?? '').toUpperCase()}`;

    this.idErro = '';
  }

  // ======================================================
  // SUBMIT
  // ======================================================

  cadastrar(form: NgForm): void {
    if (!this.fornecimentoPeca.idFornecedor) {
      this.cnpjErro = 'Selecione um fornecedor.';
      return;
    }
    const payload: FornecimentoPecasPayload = {
      ...this.fornecimentoPeca
      ,dataCadastro: this.converterDataParaISO(
        this.fornecimentoPeca.dataCadastro
      )
    };

    // Ajusta tipos esperados pelo backend (ids como números)
    const dto: any = {
      ...payload,
      idFornecedor: Number(payload.idFornecedor),
      idPeca: Number(payload.idPeca),
      valorCusto: payload.valorCusto.replaceAll('R$', '').trim().replaceAll('.', '').replaceAll(',', '.'),
    };

    this.fornecimentoPecasService.criar(dto).subscribe({
      next: () => {
        alert('Fornecimento de peça cadastrado com sucesso!');
        form.resetForm();
        this.resetarModelo();
      },
      error: (e: any) => {
        console.error('Erro ao cadastrar fornecimento de peça:', e);
        alert('Erro ao cadastrar fornecimento de peça.');
      }
    });
  }
  resetarModelo(): void {
    this.fornecimentoPeca = {
      idFornecedor: '',
      idPeca: '',
      valorCusto: '',
      prazoEntregaDias: '',
      quantidadeMinima: '',
      ativo: '',
      dataCadastro: ''
    };
    this.cnpjDisplay = '';
    this.cnpjRazaoSocialDisplay = '';
    this.nomeFornecedorSelecionado = '';
    this.idDisplay = '';
    this.nomePecaSelecionada = '';
    this.cnpjErro = '';
    this.idErro = '';
  }

  // ======================================================
  // HELPERS
  // ======================================================
  formatarCNPJ(cnpj: string | null | undefined): string {
    const d = this.onlyDigits(cnpj);
    if (d.length !== 14) {return cnpj ?? '';}
    return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8,12)}-${d.slice(12,14)}`;
  }

  private onlyDigits(v: any): string {
    return (v ?? '').toString().replace(/\D/g, '');
  }
  trackByFornecedor = (_: number, f: Fornecedor) => f.id ?? f.cnpj;

  trackByPeca = (_: number, p: Peca) => p.id ?? p.nome;

  // ======================================================
  // FORMATAÇÕES
  // ======================================================

  public formatarValorCusto(): void {
    let valor = this.fornecimentoPeca.valorCusto;
    if (!valor) {return;}
    valor = valor.replace('R$', '').trim().replace(/\s/g, '');
    // Se existir vírgula, assume padrão brasileiro
    if (valor.includes(',')) {
      valor = valor.replace(/\./g, '').replace(',', '.');
    }
    const numero = Number(valor);
    if(isNaN(numero)) {return;}
    this.fornecimentoPeca.valorCusto =  numero.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  public converterValorCusto(): void {
    let valor = this.fornecimentoPeca.valorCusto;
    if (!valor) {return;}
    valor = valor.replace('R$', '').trim().replaceAll('.', '').replace(',', '.');
    const numero = Number(valor);
    if (Number.isNaN(numero)) {return;}
    this.fornecimentoPeca.valorCusto = numero.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  formatarDataCadastro(): void {
    let valor = this.fornecimentoPeca.dataCadastro || '';
    valor = valor.replace(/\D/g, '');
    if (valor.length > 2) { valor = valor.substring(0, 2) + '/' + valor.substring(2);}
    if (valor.length > 5) {valor = valor.substring(0, 5) + '/' + valor.substring(5, 9);}
    this.fornecimentoPeca.dataCadastro = valor;
  }

  converterDataParaISO(dataBR: string): string {
    if (!dataBR) return '';
    const partes = dataBR.split('/');
    if (partes.length !== 3) return '';
    const [dia, mes, ano] = partes;
    return `${ano}-${mes}-${dia}`;
  }

  public capitalizar(texto: string | undefined): string {
    if (!texto) {return '';}
    return texto.toLowerCase().split(' ').map(palavra => palavra.charAt(0).toUpperCase() + palavra.slice(1)).join(' ');
  }

  abrirModalFornecedor(): void {
    this.cnpjFiltro = '';
    this.aplicarFiltroFornecedor();
    const el = document.getElementById('modalFornecedorCadastro');
    if (!el) {return;}
    this.modalFornecedor = bootstrap.Modal.getOrCreateInstance(el);
    this.modalFornecedor.show();
  }

  selecionarFornecedorModal(fornecedor: Fornecedor): void {
    this.selecionarFornecedor(fornecedor);
    this.modalFornecedor?.hide();
  }

  abrirModalPeca(): void {
    this.idFiltro = '';
    this.aplicarFiltroPeca();
    const el = document.getElementById('modalPecaCadastro');
    if (!el) {return;}
    this.modalPeca = bootstrap.Modal.getOrCreateInstance(el);
    this.modalPeca.show();
  }

  selecionarPecaModal(peca: Peca): void {
    this.selecionarPeca(peca);
    this.modalPeca?.hide();
  }
}
