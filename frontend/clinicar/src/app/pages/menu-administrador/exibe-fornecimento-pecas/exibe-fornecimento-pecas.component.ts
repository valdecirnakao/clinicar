import { Component, ElementRef, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';

import {
  ExibeFornecimentoPecasService,
  FornecimentoPeca,
  FornecimentoPecaRequest
} from './exibe-fornecimento-pecas.service';

import {
  ExibeFornecedorService,
  Fornecedor
} from '../exibe-fornecedor/exibe-fornecedor.service';

import {
  Peca,
  PecaService
} from '../exibe-peca/exibe-peca.service';

declare var bootstrap: any;

type ModoSelecao = 'cadastro' | 'edicao';

@Component({
  selector: 'app-exibe-fornecimento-peca',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './exibe-fornecimento-pecas.component.html',
  styleUrls: ['./exibe-fornecimento-pecas.component.css']
})
export class ExibeFornecimentoPecaComponent implements OnInit {

  fornecimentosPeca: FornecimentoPeca[] = [];
  private todos: FornecimentoPeca[] = [];

  novoFornecimento: Partial<FornecimentoPeca> = {};
  edit: Partial<FornecimentoPeca> = {};
  editId: number | null = null;

  modalCadastro: any;
  modalEdicao: any;
  modalFornecedor: any;
  modalPeca: any;

  loading = false;
  errorMsg = '';
  camposInvalidos: string[] = [];

  fornecedores: Fornecedor[] = [];
  fornecedoresFiltrados: Fornecedor[] = [];
  razaoSocialFiltroEdit = '';

  pecas: Peca[] = [];
  pecasFiltradas: Peca[] = [];
  descricaoFiltroEdit = '';

  private modoSelecaoFornecedor: ModoSelecao = 'cadastro';
  private modoSelecaoPeca: ModoSelecao = 'cadastro';

  constructor(
    private readonly fornecedorService: ExibeFornecedorService,
    private readonly pecaService: PecaService,
    private readonly fornecimentoPecaService: ExibeFornecimentoPecasService,
    private readonly location: Location,
    private readonly host: ElementRef
  ) {}

  ngOnInit(): void {
    this.carregarFornecedores();
    this.carregarPecas();
    this.recarregarFornecimentos();
  }

  recarregarFornecimentos(): void {
    this.loading = true;
    this.errorMsg = '';

    this.fornecimentoPecaService.listarTodosFornecimentos().subscribe({
      next: (lista) => {
        this.todos = lista ?? [];
        this.fornecimentosPeca = [...this.todos];
        this.loading = false;
        this.cancelarEdicao();
      },
      error: (erro) => {
        console.error('Falha ao carregar fornecimentos:', erro);

        this.loading = false;
        this.errorMsg = this.extrairMensagemErro(
          erro,
          'Falha ao carregar fornecimentos.'
        );
      }
    });
  }

  filtrar(term: string): void {
    const t = (term || '').trim().toLowerCase();

    if (!t) {
      this.fornecimentosPeca = [...this.todos];
      return;
    }

    this.fornecimentosPeca = this.todos.filter(f => {
      const fornecedor = (f.fornecedor?.razaoSocial || '').toLowerCase();
      const cnpj = this.onlyDigits(f.fornecedor?.cnpj);
      const peca = (f.peca?.nome || '').toLowerCase();
      const fabricante = (f.peca?.fabricante || '').toLowerCase();
      const modelo = (f.peca?.modelo || '').toLowerCase();
      const status = f.ativo ? 'ativo' : 'inativo';

      return (
        fornecedor.includes(t) ||
        cnpj.includes(this.onlyDigits(t)) ||
        peca.includes(t) ||
        fabricante.includes(t) ||
        modelo.includes(t) ||
        status.includes(t)
      );
    });
  }

  trackByFornecimento(_: number, f: FornecimentoPeca): number {
    return f.id ?? 0;
  }

  abrirModalCadastro(): void {
    this.camposInvalidos = [];

    this.novoFornecimento = {
      fornecedor: undefined,
      peca: undefined,
      valorCusto: '',
      prazoEntregaDias: '',
      quantidadeMinima: '',
      ativo: true,
      dataCadastro: this.hojeInputDate()
    };

    const el = document.getElementById('modalCadastroFornecimento');

    if (!el) {
      console.error('Modal modalCadastroFornecimento não encontrado.');
      return;
    }

    this.modalCadastro = bootstrap.Modal.getOrCreateInstance(el);
    this.modalCadastro.show();
  }

  salvarNovoFornecimento(): void {
    const erroValidacao = this.validarFornecimento(this.novoFornecimento);

    if (erroValidacao) {
      alert(erroValidacao);
      return;
    }

    const payload = this.montarPayload(this.novoFornecimento);

    this.fornecimentoPecaService.cadastrar(payload).subscribe({
      next: () => {
        this.modalCadastro?.hide();
        alert('Fornecimento de peça cadastrado com sucesso.');
        this.recarregarFornecimentos();
      },
      error: (erro) => {
        console.error('Erro ao cadastrar fornecimento:', erro);

        alert(
          this.extrairMensagemErro(
            erro,
            'Erro ao cadastrar fornecimento de peça.'
          )
        );
      }
    });
  }

  abrirModalEdicao(fornecimento: FornecimentoPeca): void {
    this.camposInvalidos = [];
    this.editId = fornecimento.id ?? null;

    this.edit = {
      ...fornecimento,
      fornecedor: fornecimento.fornecedor
        ? { ...fornecimento.fornecedor }
        : undefined,
      peca: fornecimento.peca
        ? { ...fornecimento.peca }
        : undefined,
      valorCusto: this.formatarMoedaBR(fornecimento.valorCusto),
      dataCadastro: this.asInputDateString(fornecimento.dataCadastro)
    };

    const el = document.getElementById('modalEdicaoFornecimento');

    if (!el) {
      console.error('Modal modalEdicaoFornecimento não encontrado.');
      return;
    }

    this.modalEdicao = bootstrap.Modal.getOrCreateInstance(el);
    this.modalEdicao.show();
  }

  salvarEdicaoModal(): void {
    if (!this.editId) {
      return;
    }

    const erroValidacao = this.validarFornecimento(this.edit);

    if (erroValidacao) {
      alert(erroValidacao);
      return;
    }

    const payload = this.montarPayload(this.edit);

    this.fornecimentoPecaService
      .atualizarFornecimentoPeca(this.editId, payload)
      .subscribe({
        next: () => {
          this.modalEdicao?.hide();
          this.cancelarEdicao();
          alert('Fornecimento de peça atualizado com sucesso.');
          this.recarregarFornecimentos();
        },
        error: (erro) => {
          console.error('Erro ao salvar alterações:', erro);

          alert(
            this.extrairMensagemErro(
              erro,
              'Erro ao salvar alterações.'
            )
          );
        }
      });
  }

  cancelarEdicao(): void {
    this.editId = null;
    this.edit = {};
    this.razaoSocialFiltroEdit = '';
    this.descricaoFiltroEdit = '';
  }

  excluir(id?: number): void {
    if (!id) {
      return;
    }

    if (!confirm('Confirma excluir este fornecimento de peça?')) {
      return;
    }

    this.fornecimentoPecaService.removerFornecimentoPeca(id).subscribe({
      next: () => {
        alert('Fornecimento de peça removido com sucesso.');
        this.recarregarFornecimentos();
      },
      error: (erro) => {
        console.error('Erro ao excluir fornecimento:', erro);

        alert(
          this.extrairMensagemErro(
            erro,
            'Erro ao excluir fornecimento.'
          )
        );
      }
    });
  }

  voltar(): void {
    this.location.back();
  }

  // ======================================================
  // FORNECEDORES
  // ======================================================

  private carregarFornecedores(): void {
    this.fornecedorService.listarTodos().subscribe({
      next: (lista) => {
        this.fornecedores = lista ?? [];
        this.fornecedoresFiltrados = [...this.fornecedores];
      },
      error: (erro) => {
        console.error('Falha ao carregar fornecedores:', erro);
      }
    });
  }

  abrirModalFornecedor(modo: ModoSelecao): void {
    this.modoSelecaoFornecedor = modo;
    this.razaoSocialFiltroEdit = '';
    this.aplicarFiltroFornecedorEdit();

    const el = document.getElementById('modalFornecedor');

    if (!el) {
      console.error('Modal modalFornecedor não encontrado.');
      return;
    }

    this.modalFornecedor = bootstrap.Modal.getOrCreateInstance(el);
    this.modalFornecedor.show();
  }

  aplicarFiltroFornecedorEdit(): void {
    const t = this.razaoSocialFiltroEdit.trim().toLowerCase();
    const tNum = this.onlyDigits(t);

    if (!t) {
      this.fornecedoresFiltrados = [...this.fornecedores];
      return;
    }

    this.fornecedoresFiltrados = this.fornecedores.filter(f => {
      const razao = (f.razaoSocial || '').toLowerCase();
      const fantasia = (f.nomeFantasia || '').toLowerCase();
      const cnpj = this.onlyDigits(f.cnpj);

      return (
        razao.includes(t) ||
        fantasia.includes(t) ||
        cnpj.includes(tNum)
      );
    });
  }

  selecionarFornecedorModal(fornecedor: Fornecedor): void {
    if (!fornecedor.id) {
      return;
    }

    const fornecedorResumo = {
      id: fornecedor.id,
      razaoSocial: fornecedor.razaoSocial,
      cnpj: fornecedor.cnpj
    };

    if (this.modoSelecaoFornecedor === 'cadastro') {
      this.novoFornecimento.fornecedor = fornecedorResumo;
    } else {
      this.edit.fornecedor = fornecedorResumo;
    }

    this.modalFornecedor?.hide();
  }

  fornecedorTexto(model: Partial<FornecimentoPeca>): string {
    return model.fornecedor?.razaoSocial || '';
  }

  fornecedorRazaoSocial(fornecimento: FornecimentoPeca): string {
    return this.capitalizar(fornecimento.fornecedor?.razaoSocial) || '—';
  }

  // ======================================================
  // PEÇAS
  // ======================================================

  private carregarPecas(): void {
    this.pecaService.listarTodasPecas().subscribe({
      next: (lista) => {
        this.pecas = lista ?? [];
        this.pecasFiltradas = [...this.pecas];
      },
      error: (erro) => {
        console.error('Falha ao carregar peças:', erro);
      }
    });
  }

  abrirModalPeca(modo: ModoSelecao): void {
    this.modoSelecaoPeca = modo;
    this.descricaoFiltroEdit = '';
    this.aplicarFiltroPecaEdit();

    const el = document.getElementById('modalPeca');

    if (!el) {
      console.error('Modal modalPeca não encontrado.');
      return;
    }

    this.modalPeca = bootstrap.Modal.getOrCreateInstance(el);
    this.modalPeca.show();
  }

  aplicarFiltroPecaEdit(): void {
    const t = this.descricaoFiltroEdit.trim().toLowerCase();

    if (!t) {
      this.pecasFiltradas = [...this.pecas];
      return;
    }

    this.pecasFiltradas = this.pecas.filter(p => {
      const nome = (p.nome || '').toLowerCase();
      const fabricante = (p.fabricante || '').toLowerCase();
      const modelo = (p.modelo || '').toLowerCase();
      const norma = (p.norma || '').toLowerCase();

      return (
        nome.includes(t) ||
        fabricante.includes(t) ||
        modelo.includes(t) ||
        norma.includes(t)
      );
    });
  }

  selecionarPecaModal(peca: Peca): void {
    if (!peca.id) {
      return;
    }

    const pecaResumo = {
      id: peca.id,
      nome: peca.nome ?? '',
      fabricante: peca.fabricante ?? '',
      modelo: peca.modelo ?? ''
    };

    if (this.modoSelecaoPeca === 'cadastro') {
      this.novoFornecimento.peca = pecaResumo;
    } else {
      this.edit.peca = pecaResumo;
    }

    this.modalPeca?.hide();
  }

  pecaTexto(model: Partial<FornecimentoPeca>): string {
    if (!model.peca) {
      return '';
    }

    const nome = this.capitalizar(model.peca.nome);
    const fabricante = this.capitalizar(model.peca.fabricante);
    const modelo = this.capitalizar(model.peca.modelo);

    return [nome, fabricante, modelo].filter(Boolean).join(' - ');
  }

  descricaoPeca(fornecimento: FornecimentoPeca): string {
    return this.capitalizar(fornecimento.peca?.nome) || '—';
  }

  // ======================================================
  // HELPERS
  // ======================================================

  private validarFornecimento(model: Partial<FornecimentoPeca>): string | null {
    if (!model.fornecedor?.id) {
      return 'Selecione um fornecedor.';
    }

    if (!model.peca?.id) {
      return 'Selecione uma peça.';
    }

    if (!String(model.valorCusto ?? '').trim()) {
      return 'Informe o valor de custo.';
    }

    if (!String(model.prazoEntregaDias ?? '').trim()) {
      return 'Informe o prazo de entrega em dias.';
    }

    if (!String(model.quantidadeMinima ?? '').trim()) {
      return 'Informe a quantidade mínima.';
    }

    if (!String(model.dataCadastro ?? '').trim()) {
      return 'Informe a data de cadastro.';
    }

    return null;
  }

  private montarPayload(model: Partial<FornecimentoPeca>): FornecimentoPecaRequest {
    return {
      idFornecedor: model.fornecedor?.id,
      idPeca: model.peca?.id,
      valorCusto: this.converterMoedaParaNumero(model.valorCusto),
      prazoEntregaDias: Number(model.prazoEntregaDias),
      quantidadeMinima: Number(model.quantidadeMinima),
      ativo: Boolean(model.ativo),
      dataCadastro: this.asInputDateString(model.dataCadastro)
    };
  }

  private onlyDigits(v: any): string {
    return (v ?? '').toString().replace(/\D/g, '');
  }

  formatarCNPJ(cnpj?: string): string {
    const d = this.onlyDigits(cnpj);

    if (d.length !== 14) {
      return cnpj ?? '';
    }

    return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12, 14)}`;
  }

  formatarMoedaBR(valor: any): string {
    if (valor === null || valor === undefined || valor === '') {
      return '';
    }
    let numero: number;
    if (typeof valor === 'number') {
      numero = valor;
    } else {
      let texto = valor
      .toString()
      .replace('R$', '')
      .replace(/\s/g, '')
      .trim();

    /*
     * Caso 1:
     * Valor vindo do backend/banco no padrão decimal:
     * 46.50
     * 1234.56
     */
      if (/^\d+\.\d{1,2}$/.test(texto)) {
        numero = Number(texto);
      }

    /*
     * Caso 2:
     * Valor no padrão brasileiro:
     * 46,50
     * 1.234,56
     */
      else if (texto.includes(',')) {
        texto = texto.replace(/\./g, '').replace(',', '.');
        numero = Number(texto);
      }

    /*
     * Caso 3:
     * Valor inteiro:
     * 46
     * 1234
     */
      else {
        numero = Number(texto);
      }
    }

    if (Number.isNaN(numero)) {
      return '';
    }

    return numero.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  formatarValorCustoCadastro(): void {
    this.novoFornecimento.valorCusto = this.formatarMoedaBR(
      this.novoFornecimento.valorCusto
    );
  }

  formatarValorCustoEdicao(): void {
    this.edit.valorCusto = this.formatarMoedaBR(
      this.edit.valorCusto
    );
  }

  converterMoedaParaNumero(valor: any): string {
    if (valor === null || valor === undefined || valor === '') {
      return '0';
    }

    if (typeof valor === 'number') {
      return valor.toFixed(2);
    }

    let texto = valor
      .toString()
      .replace('R$', '')
      .replace(/\s/g, '')
      .trim();

    /*
    * Valor já está no padrão decimal do backend:
    * 46.50
    */
    if (/^\d+\.\d{1,2}$/.test(texto)) {
      return Number(texto).toFixed(2);
    }

    /*
    * Valor brasileiro:
    * 46,50
    * 1.234,56
    */
    if (texto.includes(',')) {
      texto = texto.replace(/\./g, '').replace(',', '.');
      return Number(texto).toFixed(2);
    }

    /*
    * Valor inteiro:
    * 46
    */
    const numero = Number(texto);

    if (Number.isNaN(numero)) {
      return '0';
    }

    return numero.toFixed(2);
  }

  formatarDataBr(data: string | Date | null | undefined): string {
    const input = this.asInputDateString(data);

    if (!input) {
      return '';
    }

    const [ano, mes, dia] = input.split('-');

    return `${dia}/${mes}/${ano}`;
  }

  private asInputDateString(data: any): string {
    if (!data) {
      return '';
    }

    if (typeof data === 'string') {
      if (/^\d{4}-\d{2}-\d{2}$/.test(data)) {
        return data;
      }

      const matchBr = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(data);

      if (matchBr) {
        return `${matchBr[3]}-${matchBr[2]}-${matchBr[1]}`;
      }

      const d = new Date(data);

      return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
    }

    if (data instanceof Date) {
      return data.toISOString().slice(0, 10);
    }

    try {
      const d = new Date(data);

      return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
    } catch {
      return '';
    }
  }

  private hojeInputDate(): string {
    return new Date().toISOString().slice(0, 10);
  }

  capitalizar(texto?: string): string {
    if (!texto) {
      return '';
    }

    return texto
      .trim()
      .split(' ')
      .filter(parte => parte.length > 0)
      .map(parte => parte.charAt(0).toUpperCase() + parte.slice(1).toLowerCase())
      .join(' ');
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
