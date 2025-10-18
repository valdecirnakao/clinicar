import { Component, ElementRef, HostListener, OnInit, TrackByFunction } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { UsuarioService, Usuario } from '../exibe-usuario/exibe-usuario.service';
import { VeiculoService } from '../cadastra-veiculo/cadastra-veiculo.service';


/** ===== Payload enviado ao BACKEND ===== */
type VeiculoPayload = {
  placa: string;
  fabricante: string;
  cor: string;
  modelo: string;
  anoModeloCombustivel: string;   // será montado a partir da FIPE
  idProprietario?: number | null;  // FK do usuário selecionado pelo CPF
};

/** ===== FIPE (v2) – tipos FRONT ===== */
type VehicleType = 'cars' | 'motorcycles' | 'trucks';

interface FipeBrand { code: string; name: string; }
interface FipeModel { code: string; name: string; }
interface FipeModelsResponse { models: FipeModel[]; }          // v2
interface FipeYear { code: string; name: string; }
interface FipeDetails {
  brand: string;        // fabricante
  model: string;        // modelo
  modelYear: number;    // ano
  fuel: string;         // combustível
  fuelAcronym?: string;
  price?: string;
  referenceMonth?: string;
  codeFipe?: string;
  vehicleType?: number;
}

const FIPE_BASE = 'https://fipe.parallelum.com.br/api/v2';

@Component({
  selector: 'app-cadastra-veiculo',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './cadastra-veiculo.component.html',
  styleUrls: ['./cadastra-veiculo.component.css']
})
export class CadastroVeiculoComponent implements OnInit {

  /** ===== Modelo do formulário (enviado ao backend) ===== */
  veiculo: VeiculoPayload = {
    placa: '',
    fabricante: '',
    cor: '',
    modelo: '',
    anoModeloCombustivel: '',
    idProprietario: null
  };

  /** ===== CPF / Proprietário (dropdown com busca) ===== */
  usuarios: Usuario[] = [];
  usuariosFiltrados: Usuario[] = [];
  dropdownOpen = false;
  cpfFiltro = '';
  cpfDisplay = '';
  cpfErro = '';
  nomeProprietarioSelecionado = '';

  /** ===== FIPE ===== */
  tipo: VehicleType = 'cars';
  fipeCarregando = { marcas: false, modelos: false, anos: false, detalhes: false };
  fipeErro = '';

  marcas: FipeBrand[] = [];
  modelos: FipeModel[] = [];
  anos: FipeYear[] = [];

  marcaSelCode: string | null = null;
  modeloSelCode: string | null = null;
  anoSelCode: string | null = null; // no formato "2014-1" etc.

  // trackBy para *ngFor
  trackByBrand: TrackByFunction<FipeBrand> = (_i, x) => x.code;
  trackByModel: TrackByFunction<FipeModel> = (_i, x) => x.code;
  trackByYear:  TrackByFunction<FipeYear>  = (_i, x) => x.code;

  constructor(
    private readonly http: HttpClient,
    private readonly usuarioService: UsuarioService,
    private readonly veiculoService: VeiculoService,
    private readonly host: ElementRef
  ) {}

  ngOnInit(): void {
    this.recarregarUsuarios();
    this.fipeCarregarMarcas();
  }

  // ========= FIPE =========

  private fipeCarregarMarcas(): void {
    this.fipeErro = '';
    this.fipeCarregando.marcas = true;
    this.http.get<FipeBrand[]>(`${FIPE_BASE}/${this.tipo}/brands`).subscribe({
      next: lista => { this.marcas = lista ?? []; },
      error: err => { console.error(err); this.fipeErro = 'Falha ao carregar montadoras (FIPE).'; },
      complete: () => { this.fipeCarregando.marcas = false; }
    });
  }

  onChangeMarca(code: string): void {
    this.marcaSelCode = code || null;

    // reset dependentes
    this.modeloSelCode = null;
    this.anoSelCode = null;
    this.modelos = [];
    this.anos = [];

    // limpa campos finais
    this.veiculo.fabricante = '';
    this.veiculo.modelo = '';
    this.veiculo.anoModeloCombustivel = '';

    if (!this.marcaSelCode) return;

    // define fabricante pelo label
    this.veiculo.fabricante = this.marcas.find(m => m.code === this.marcaSelCode)?.name ?? '';

    this.fipeErro = '';
    this.fipeCarregando.modelos = true;

    // ⚠️ a resposta pode ser ARRAY (v2) ou objeto com "models" (algumas libs/espelhos)
    this.http.get<any>(`${FIPE_BASE}/${this.tipo}/brands/${this.marcaSelCode}/models`)
    .subscribe({
      next: (resp) => {
        const arr = Array.isArray(resp) ? resp
                  : (resp?.models ?? resp?.modelos ?? []); // compat
        this.modelos = (arr ?? []) as FipeModel[];
      },
      error: (e) => {
        console.error(e);
        this.fipeErro = 'Falha ao carregar modelos (FIPE).';
      },
      complete: () => { this.fipeCarregando.modelos = false; }
    });
  }

  onChangeModelo(code: string): void {
    this.modeloSelCode = code || null;

    // reset anos
    this.anoSelCode = null;
    this.anos = [];

    // limpa campos dependentes
    this.veiculo.modelo = '';
    this.veiculo.anoModeloCombustivel = '';

    if (!this.marcaSelCode || !this.modeloSelCode) return;

    // define modelo pelo rótulo do model
    this.veiculo.modelo = this.modelos.find(m => m.code === this.modeloSelCode)?.name ?? '';

    this.fipeErro = '';
    this.fipeCarregando.anos = true;
    this.http.get<FipeYear[]>(`${FIPE_BASE}/${this.tipo}/brands/${this.marcaSelCode}/models/${this.modeloSelCode}/years`)
      .subscribe({
        next: lista => { this.anos = lista ?? []; },
        error: err => { console.error(err); this.fipeErro = 'Falha ao carregar anos (FIPE).'; },
        complete: () => { this.fipeCarregando.anos = false; }
      });
  }

  onChangeAno(code: string): void {
    this.anoSelCode = code || null;
    this.veiculo.anoModeloCombustivel = '';

    if (!this.marcaSelCode || !this.modeloSelCode || !this.anoSelCode) return;

    this.fipeErro = '';
    this.fipeCarregando.detalhes = true;
    this.http.get<FipeDetails>(`${FIPE_BASE}/${this.tipo}/brands/${this.marcaSelCode}/models/${this.modeloSelCode}/years/${this.anoSelCode}`)
      .subscribe({
        next: det => {
          // usa os nomes da FIPE (garante consistência)
          if (det?.brand) this.veiculo.fabricante = det.brand;
          if (det?.model) this.veiculo.modelo = det.model;

          // monta "ano / combustível"
          const amc = det ? `${det.modelYear ?? ''} / ${det.fuel ?? ''}`.trim() : '';
          this.veiculo.anoModeloCombustivel = amc || (this.anos.find(a => a.code === this.anoSelCode)?.name ?? '');
        },
        error: err => {
          console.error(err);
          this.fipeErro = 'Falha ao buscar detalhes (FIPE).';
        },
        complete: () => { this.fipeCarregando.detalhes = false; }
      });
  }

  // ========= CPF / Proprietário =========

  recarregarUsuarios(): void {
    this.usuarioService.listarTodos().subscribe({
      next: lista => {
        this.usuarios = lista ?? [];
        this.usuariosFiltrados = [...this.usuarios];
      },
      error: e => console.error('Falha ao carregar usuários:', e)
    });
  }

  aplicarFiltro(): void {
    const t = (this.cpfFiltro || '').trim().toLowerCase();
    if (!t) { this.usuariosFiltrados = [...this.usuarios]; return; }

    const tDigits = this.onlyDigits(t);
    this.usuariosFiltrados = this.usuarios.filter(u => {
      const cpfFmt = this.formatarCPF(u.cpf).toLowerCase();
      const cpfDigits = this.onlyDigits(u.cpf);
      return cpfFmt.includes(t)
          || cpfDigits.includes(tDigits)
          || (u.nome || '').toLowerCase().includes(t)
          || (u.email || '').toLowerCase().includes(t);
    });
  }

  toggleDropdown(open?: boolean): void {
    this.dropdownOpen = open ?? !this.dropdownOpen;
    if (this.dropdownOpen) {
      this.cpfFiltro = '';
      this.aplicarFiltro();
    }
  }

  selecionarProprietario(u: Usuario): void {
    if (!u?.id) {
      this.cpfErro = 'Usuário inválido.';
      return;
    }
    this.veiculo.idProprietario = Number(u.id);
    this.cpfDisplay = this.formatarCPF(u.cpf);
    this.nomeProprietarioSelecionado = u.nome ?? '';
    this.cpfErro = '';
    this.dropdownOpen = false;
  }

  // ========= Submit =========

  cadastrar(form: NgForm): void {
    if (!this.veiculo.idProprietario) {
      this.cpfErro = 'Selecione um CPF válido.';
      return;
    }

    const payload: VeiculoPayload = {
      ...this.veiculo,
      placa: (this.veiculo.placa || '').toUpperCase().replace(/\s+/g, '')
    };

    // Se o service usa "cadastrar", deixe assim; ajuste se for "criar"
    this.veiculoService.criar(payload as any).subscribe({
      next: () => {
        alert('Veículo cadastrado com sucesso!');
        form.resetForm();
        this.resetarModelo();
      },
      error: (e) => {
        console.error('Erro ao cadastrar veículo:', e);
        alert('Erro ao cadastrar veículo.');
      }
    });
  }

  resetarModelo(): void {
    this.veiculo = {
      placa: '',
      fabricante: '',
      cor: '',
      modelo: '',
      anoModeloCombustivel: '',
      idProprietario: null
    };

    // FIPE
    this.marcas = [];
    this.modelos = [];
    this.anos = [];
    this.marcaSelCode = this.modeloSelCode = this.anoSelCode = null;
    this.fipeErro = '';
    this.fipeCarregarMarcas();

    // CPF
    this.cpfDisplay = '';
    this.cpfFiltro = '';
    this.cpfErro = '';
    this.dropdownOpen = false;
  }

  // ========= Helpers =========

  formatarPlaca(): void {
    if (!this.veiculo.placa) return;
    this.veiculo.placa = this.veiculo.placa.toUpperCase().replace(/\s+/g, '');
  }

  formatarCPF(cpf: string | null | undefined): string {
    const d = this.onlyDigits(cpf);
    if (d.length !== 11) return cpf ?? '';
    return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6,9)}-${d.slice(9,11)}`;
  }

  private onlyDigits(v: any): string {
    return (v ?? '').toString().replace(/\D/g, '');
  }

  // Fecha o dropdown do CPF ao clicar fora
  @HostListener('document:click', ['$event'])
  onDocClick(e: MouseEvent) {
    if (!this.host.nativeElement.contains(e.target)) {
      this.dropdownOpen = false;
    }
  }

  // trackBy para tabela/listas de usuários
  trackByUsuario = (_: number, u: Usuario) => u.id ?? u.cpf;
}
