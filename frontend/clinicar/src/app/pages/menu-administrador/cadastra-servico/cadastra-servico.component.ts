import { Component, ElementRef, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { FornecedorService, Fornecedor } from '../exibe-fornecedor/exibe-fornecedor.service';
import { ServicoService } from '../cadastra-servico/cadastra-servico.service';


/** ===== Payload enviado ao BACKEND ===== */
type ServicoPayload = {
  descricao: string;
  tipoDoPrestador: string;
  duracao: number | null;
  unidade: string;
  idFornecedor?: number | null;  // FK do fornecedor do servico selecionado pelo Nome Fantasia
};

@Component({
  selector: 'app-cadastra-servico',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './cadastra-servico.component.html',
  styleUrls: ['./cadastra-servico.component.css']
})
export class CadastroServicoComponent implements OnInit {

  /** ===== Modelo do formulário (enviado ao backend) ===== */
  servico: ServicoPayload = {
    descricao: '',
    tipoDoPrestador: '',
    duracao: null,
    unidade: '',
    idFornecedor: null
  };

  /** ===== CNPJ / Fornecedor (dropdown com busca) ===== */
  fornecedores: Fornecedor[] = [];
  fornecedoresFiltrados: Fornecedor[] = [];
  dropdownOpen = false;
  cnpjFiltro = '';
  cnpjDisplay = '';
  cnpjErro = '';
  nomeFornecedorSelecionado = '';

  constructor(
    private readonly fornecedorService: FornecedorService,
    private readonly servicoService: ServicoService,
    private readonly host: ElementRef
  ) {}

  ngOnInit(): void {
    this.recarregarFornecedores();
    }

  // ========= CNPJ / Fornecedor =========

  recarregarFornecedores(): void {
    this.fornecedorService.listarTodosFornecedores().subscribe({
      next: lista => {
        this.fornecedores = lista ?? [];
        this.fornecedoresFiltrados = [...this.fornecedores];
      },
      error: e => console.error('Falha ao carregar fornecedores:', e)
    });
  }

  aplicarFiltro(): void {
    const t = (this.cnpjFiltro || '').trim().toLowerCase();
    if (!t) { this.fornecedoresFiltrados = [...this.fornecedores]; return; }

    const tDigits = this.onlyDigits(t);
    this.fornecedoresFiltrados = this.fornecedores.filter(f => {
      const cnpjFmt = (this.formatarCNPJ(f.cnpj) || '').toLowerCase();
      const cnpjDigits = this.onlyDigits(f.cnpj);
      return cnpjFmt.includes(t)
          || cnpjDigits.includes(tDigits)
          || (f.razaoSocial || '').toLowerCase().includes(t)
          || (f.email || '').toLowerCase().includes(t);
    });
  }

  toggleDropdown(open?: boolean): void {
    this.dropdownOpen = open ?? !this.dropdownOpen;
    if (this.dropdownOpen) {
      this.cnpjFiltro = '';
      this.aplicarFiltro();
    }
  }

  selecionarFornecedor(f: Fornecedor): void {
    if (!f?.id) {
      this.cnpjErro = 'Fornecedor inválido.';
      return;
    }
    this.servico.idFornecedor = Number(f.id);
    this.cnpjDisplay = this.formatarCNPJ(f.cnpj) ?? '';
    this.nomeFornecedorSelecionado = f.nomeFantasia ?? '';
    this.cnpjErro = '';
    this.dropdownOpen = false;
  }

  // ========= Submit =========

  cadastrar(form: NgForm): void {
    if (!this.servico.idFornecedor) {
      this.cnpjErro = 'Selecione um Fornecedor válido.';
      return;
    }

    const payload: ServicoPayload = {
      descricao: this.servico.descricao,
      tipoDoPrestador: this.servico.tipoDoPrestador,
      duracao: Number(this.servico.duracao),
      unidade: this.servico.unidade,
      idFornecedor: this.servico.idFornecedor
    };

    // Se o service usa "cadastrar", deixe assim; ajuste se for "criar"
    this.servicoService.cadastrar(payload as any).subscribe({
      next: () => {
        alert('Serviço cadastrado com sucesso!');
        form.resetForm();
        this.resetarModelo();
      },
      error: (e) => {
        console.error('Erro ao cadastrar serviço:', e);
        alert('Erro ao cadastrar serviço.');
      }
    });
  }

  resetarModelo(): void {
    this.servico = {
      descricao: '',
      tipoDoPrestador: '',
      duracao: null,
      unidade: '',
      idFornecedor: null
    };

    // CNPJ
    this.cnpjDisplay = '';
    this.cnpjFiltro = '';
    this.cnpjErro = '';
    this.dropdownOpen = false;
  }

  // ========= Helpers =========


  formatarCNPJ(cnpj: string | null | undefined): string | undefined {
    if (!cnpj) return undefined;
    const nums = cnpj.replaceAll(/\D/g, '');
    if (nums.length === 14) {
      cnpj = nums.replace(
        /(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/,
        '$1.$2.$3/$4-$5'
      );
      return cnpj.toString();
    }
    return '';
  }

  private onlyDigits(v: any): string {
    return (v ?? '').toString().replaceAll(/\D/g, '');
  }

  // Fecha o dropdown do CPF ao clicar fora
  @HostListener('document:click', ['$event'])
  onDocClick(e: MouseEvent) {
    if (!this.host.nativeElement.contains(e.target)) {
      this.dropdownOpen = false;
    }
  }

  // trackBy para tabela/listas de fornecedores
  trackByFornecedor = (_: number, f: Fornecedor) => f.id ?? f.cnpj;
}
