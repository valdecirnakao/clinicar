import { Component, ElementRef, HostListener, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { switchMap, catchError, of, finalize } from 'rxjs';
import {  RouterModule } from '@angular/router';

/** ================== CONFIG ================== */
// Ajuste conforme o backend espera:
type OwnerApiKey = 'idProprietario' | 'id_proprietario';
const OWNER_KEY: OwnerApiKey = 'idProprietario';

type AmcApiKey = 'anoModeloCombustivel' | 'ano_modelo_combustivel';
const AMC_KEY: AmcApiKey = 'anoModeloCombustivel';

// Base do backend (troque para environment se preferir)
const API_BASE = 'http://localhost:8080';

/** ================ MODELOS =================== */

interface ViaCepResponse {
  cep?: string;
  logradouro?: string;
  complemento?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
  ibge?: string;
  gia?: string;
  ddd?: string;
  siafi?: string;
  erro?: boolean;
}

export interface Usuario {
  id?: number;
  nome: string;
  email: string;
  cpf: string;
  nome_social?: string;
  nascimento: string;  // ideal: 'yyyy-MM-dd'
  tipo_do_acesso: 'cliente';
  telefone?: string;
  whatsappapikey?: string;
  cep?: string;
  senha: string;
  confirmarSenha?: string;
  logradouro?: string;
  numero_endereco?: string;
  complemento_endereco?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
}

type VeiculoPayload = {
  placa: string;
  fabricante: string;
  cor: string;
  modelo: string;
  // vai para AMC_KEY no corpo da API:
  anoModeloCombustivel: string;
  // vai para OWNER_KEY no corpo da API:
  idProprietario?: number | null;
};

/** ===== Tipos FIPE (somente front) ===== */
type VehicleType = 'cars' | 'motorcycles' | 'trucks';
interface FipeBrand { code: string; name: string; }
interface FipeModel { code: string; name: string; }
interface FipeYear  { code: string; name: string; }
const FIPE_BASE = 'https://fipe.parallelum.com.br/api/v2';

@Component({
  selector: 'app-cadastra-cliente',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule, RouterModule],
  templateUrl: './cadastra-cliente.component.html'
})
export class CadastraClienteComponent {
  /** ================== FORM STATE ================== */
  // Cliente
  cliente: Usuario = {
    nome: '', email: '', cpf: '', whatsappapikey: '', senha: '', confirmarSenha: '',
    telefone: '', cep: '', logradouro: '', numero_endereco: '', tipo_do_acesso: 'cliente',
    bairro: '', cidade: '', estado: '', nascimento: '', complemento_endereco: '', nome_social: ''
  };

  // Veículo
  veiculo: VeiculoPayload = {
    placa: '',
    fabricante: '',
    cor: '',
    modelo: '',
    anoModeloCombustivel: '',
    idProprietario: null
  };

  /** UX */
  loading = false;
  errorMsg = '';
  successMsg = '';
  cepStatus = { loading: false, errorMsg: '' };

  /** =============== FIPE =============== */
  tipo: VehicleType = 'cars';
  fipeCarregando = { marcas: false, modelos: false, anos: false, detalhes: false };
  fipeErro = '';
  marcas: FipeBrand[] = [];
  modelos: FipeModel[] = [];
  anos: FipeYear[] = [];
  marcaSelCode: string | null = null;
  modeloSelCode: string | null = null;
  anoSelCode: string | null = null;
  routerLink: any;

  @ViewChild('numeroInput') numeroInput?: ElementRef<HTMLInputElement>;

  constructor(private http: HttpClient, private host: ElementRef) {}

  /** ================== INIT ================== */
  ngOnInit(): void {
    this.fipeCarregarMarcas();
  }

  // ========= FORMATAÇÕES =========
  formatarCPF(): void {
    if (!this.cliente.cpf) return;
    const d = this.onlyDigits(this.cliente.cpf).slice(0, 11);
    if (d.length === 11) {
      this.cliente.cpf = d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    } else {
      this.cliente.cpf = d.replace(
        /(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/,
        '$1.$2.$3/$4-$5'
      );
    }
  }

  formatarTelefone(): void {
    if (!this.cliente.telefone) return;
    const n = this.onlyDigits(this.cliente.telefone);
    const codigoPais = '55';
    if (n.length >= 11) {
      const ddd = n.slice(-11, -9);
      const parte1 = n.slice(-9, -4);
      const parte2 = n.slice(-4);
      this.cliente.telefone = `+${codigoPais} (${ddd}) ${parte1}-${parte2}`;
    } else if (n.length >= 10) {
      const ddd = n.slice(0, 2);
      const parte1 = n.slice(2, 6);
      const parte2 = n.slice(6, 10);
      this.cliente.telefone = `+${codigoPais} (${ddd}) ${parte1}-${parte2}`;
    } else if (n.length >= 8) {
      const ddd = '11';
      const parte1 = n.slice(0, n.length - 4);
      const parte2 = n.slice(-4);
      this.cliente.telefone = `+${codigoPais} (${ddd}) ${parte1}-${parte2}`;
    } else {
      this.cliente.telefone = n;
    }
  }

  formatarCEP(): void {
    if (!this.cliente.cep) return;
    const d = this.onlyDigits(this.cliente.cep).slice(0, 8);
    this.cliente.cep = d.length === 8 ? d.replace(/(\d{5})(\d{3})/, '$1-$2') : d;
  }


  /** ================== VIA CEP ================== */
  onCepBlur(): void {
    this.formatarCEP();
    const cepNums = this.onlyDigits(this.cliente.cep);
    if (cepNums.length !== 8) {
      this.cepStatus.errorMsg = 'CEP deve ter 8 dígitos.';
      return;
    }
    this.consultarCep(cepNums);
  }

  private consultarCep(cepNums: string): void {
    this.cepStatus = { loading: true, errorMsg: '' };

    this.http.get<ViaCepResponse>(`https://viacep.com.br/ws/${cepNums}/json/`)
      .subscribe({
        next: (resp) => {
          if (resp?.erro) {
            this.cepStatus = { loading: false, errorMsg: 'CEP não encontrado.' };
            return;
          }
          this.cliente.logradouro = resp.logradouro || '';
          this.cliente.bairro     = resp.bairro     || '';
          this.cliente.cidade     = resp.localidade || '';
          this.cliente.tipo_do_acesso = 'cliente';
          this.cliente.estado     = (resp.uf || '').toUpperCase();
          if (!this.cliente.complemento_endereco && resp.complemento) {
            this.cliente.complemento_endereco = resp.complemento;
          }
          this.cepStatus = { loading: false, errorMsg: '' };
          setTimeout(() => this.numeroInput?.nativeElement.focus(), 0);
        },
        error: () => {
          this.cepStatus = { loading: false, errorMsg: 'Falha ao consultar o CEP. Tente novamente.' };
        }
      });
  }


  /** ================== FIPE ================== */
  private fipeCarregarMarcas(): void {
    this.fipeErro = ''; this.fipeCarregando.marcas = true;
    this.http.get<FipeBrand[]>(`${FIPE_BASE}/${this.tipo}/brands`)
      .pipe(finalize(() => this.fipeCarregando.marcas = false))
      .subscribe({
        next: (lista) => { this.marcas = lista ?? []; },
        error: () => { this.fipeErro = 'Falha ao carregar montadoras (FIPE).'; }
      });
  }

  onChangeMarca(code: string): void {
    this.marcaSelCode = code || null;
    this.modeloSelCode = null; this.anoSelCode = null;
    this.modelos = []; this.anos = [];
    this.veiculo.fabricante = ''; this.veiculo.modelo = ''; this.veiculo.anoModeloCombustivel = '';

    if (!this.marcaSelCode) return;

    // set fabricante pelo label selecionado
    this.veiculo.fabricante = this.marcas.find(m => m.code === this.marcaSelCode)?.name ?? '';

    this.fipeErro = ''; this.fipeCarregando.modelos = true;
    this.http.get<any>(`${FIPE_BASE}/${this.tipo}/brands/${this.marcaSelCode}/models`)
      .pipe(finalize(() => this.fipeCarregando.modelos = false))
      .subscribe({
        next: (resp) => {
          const arr = Array.isArray(resp) ? resp : (resp?.models ?? []);
          this.modelos = (arr ?? []) as FipeModel[];
        },
        error: () => { this.fipeErro = 'Falha ao carregar modelos (FIPE).'; }
      });
  }

  onChangeModelo(code: string): void {
    this.modeloSelCode = code || null;
    this.anoSelCode = null; this.anos = [];
    this.veiculo.modelo = ''; this.veiculo.anoModeloCombustivel = '';

    if (!this.marcaSelCode || !this.modeloSelCode) return;

    this.veiculo.modelo = this.modelos.find(m => m.code === this.modeloSelCode)?.name ?? '';

    this.fipeErro = ''; this.fipeCarregando.anos = true;
    this.http.get<FipeYear[]>(`${FIPE_BASE}/${this.tipo}/brands/${this.marcaSelCode}/models/${this.modeloSelCode}/years`)
      .pipe(finalize(() => this.fipeCarregando.anos = false))
      .subscribe({
        next: (lista) => { this.anos = lista ?? []; },
        error: () => { this.fipeErro = 'Falha ao carregar anos (FIPE).'; }
      });
  }

  onChangeAno(code: string): void {
    this.anoSelCode = code || null;
    this.veiculo.anoModeloCombustivel = '';

    if (!this.marcaSelCode || !this.modeloSelCode || !this.anoSelCode) return;

    this.fipeErro = ''; this.fipeCarregando.detalhes = true;
    this.http.get<any>(`${FIPE_BASE}/${this.tipo}/brands/${this.marcaSelCode}/models/${this.modeloSelCode}/years/${this.anoSelCode}`)
      .pipe(finalize(() => this.fipeCarregando.detalhes = false))
      .subscribe({
        next: (det) => {
          // Gera "ANO / COMBUSTÍVEL"
          const amc = det ? `${det.modelYear ?? ''} / ${det.fuel ?? ''}`.trim()
                          : (this.anos.find(a => a.code === this.anoSelCode)?.name ?? '');
          this.veiculo.anoModeloCombustivel = amc;
          // Garanta fabricante e modelo caso a FIPE retorne labels
          this.veiculo.fabricante = det?.brand ?? this.veiculo.fabricante;
          this.veiculo.modelo = det?.model ?? this.veiculo.modelo;
        },
        error: () => { this.fipeErro = 'Falha ao buscar detalhes (FIPE).'; }
      });
  }

  /** ================== SUBMIT ================== */
  cadastrar(form: NgForm): void {
        // validações básicas
    const camposObrig = [
      'cpf','nome','telefone','email','nascimento',
      'cep','numero_endereco','logradouro','bairro','cidade','estado'
    ] as const;

    if (this.cliente.senha !== this.cliente.confirmarSenha) {
      alert('As senhas não coincidem.');
      return;
    }
    this.errorMsg = ''; this.successMsg = '';
    if (!form.valid) { this.errorMsg = 'Preencha os campos obrigatórios.'; return; }
    if (!this.veiculo.anoModeloCombustivel || !this.veiculo.fabricante || !this.veiculo.modelo) {
      this.errorMsg = 'Selecione Montadora, Modelo e Ano/Combustível (FIPE).';
      return;
    }

    this.loading = true;

    // 1) Cria cliente
    this.http.post<Usuario>(`${API_BASE}/api/usuario`, this.cliente).pipe(
      // 2) Cria veículo com o id do cliente recém-criado
      switchMap((user) => {
        const body: any = {
          placa: (this.veiculo.placa || '').toUpperCase().replace(/\s+/g, ''),
          fabricante: this.veiculo.fabricante,
          cor: (this.veiculo.cor || '').trim(),
          modelo: this.veiculo.modelo
        };
        body[AMC_KEY] = this.veiculo.anoModeloCombustivel;
        body[OWNER_KEY] = Number(user.id); // vínculo aqui

        return this.http.post(`${API_BASE}/api/veiculo`, body);
      }),
      catchError(err => {
        this.errorMsg = 'Falha ao salvar. Verifique os dados.';
        console.error('Erro no cadastro cliente+veículo', err);
        return of(null);
      }),
      finalize(() => this.loading = false)
    ).subscribe((ok) => {
      if (!ok) return;
      this.successMsg = 'Cliente e veículo cadastrados com sucesso!';
      form.resetForm();
      this.resetFiPe();
    });
  }

  /** =============== HELPERS =============== */
  private resetFiPe() {
    this.marcas = []; this.modelos = []; this.anos = [];
    this.marcaSelCode = this.modeloSelCode = this.anoSelCode = null;
    this.fipeErro = '';
    this.fipeCarregarMarcas();
    this.veiculo = { placa: '', fabricante: '', cor: '', modelo: '', anoModeloCombustivel: '', idProprietario: null };
  }

  formatarPlaca(): void {
    this.veiculo.placa = (this.veiculo.placa || '').toUpperCase().replace(/\s+/g, '');
  }

  private onlyDigits(v: any): string {
    return (v ?? '').toString().replace(/\D/g, '');
  }

  @HostListener('document:click', ['$event'])
  onDocClick(e: MouseEvent) {
    if (!this.host.nativeElement.contains(e.target)) {
      // manter caso depois inclua dropdowns locais
    }
  }
}
