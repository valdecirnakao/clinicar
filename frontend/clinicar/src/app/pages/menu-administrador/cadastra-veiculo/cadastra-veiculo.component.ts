import { Component, ElementRef, HostListener, OnInit, TrackByFunction } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { UsuarioService, Usuario } from '../exibe-usuario/exibe-usuario.service';
import { VeiculoService } from '../cadastra-veiculo/cadastra-veiculo.service';
declare var bootstrap: any;
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
interface FipeModelsResponse { models: FipeModel[]; }
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
  imports: [CommonModule, FormsModule],
  templateUrl: './cadastra-veiculo.component.html',
  styleUrls: ['./cadastra-veiculo.component.css']
})
export class CadastroVeiculoComponent implements OnInit {
  modalProprietario: any;
usuarioSelecionadoModal: Usuario | null = null;

emailProprietarioSelecionado = '';
telefoneProprietarioSelecionado = '';
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
  emailDisplay = '';
  telefoneDisplay = '';
  statusDisplay = '';
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
        const arr = Array.isArray(resp) ? resp : (resp?.models ?? resp?.modelos ?? []); // compat
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
  const usuariosAtivos = this.usuarios.filter(
    u => (u.status || '').toLowerCase() === 'ativo'
  );

  const t = (this.cpfFiltro || '').trim().toLowerCase();

  if (!t) {
    this.usuariosFiltrados = [...usuariosAtivos];
    return;
  }

  const tDigits = this.onlyDigits(t);

  this.usuariosFiltrados = usuariosAtivos.filter(u => {
    const cpfFmt = this.formatarCPF(u.cpf).toLowerCase();
    const cpfDigits = this.onlyDigits(u.cpf);

    return cpfFmt.includes(t)
        || cpfDigits.includes(tDigits)
        || (u.nome || '').toLowerCase().includes(t)
        || (u.email || '').toLowerCase().includes(t)
        || (u.telefone || '').toLowerCase().includes(t);
  });
}
  toggleDropdown(open: boolean): void {
    this.dropdownOpen = open;
    if (open) {
      this.cpfFiltro = '';
      this.usuariosFiltrados = [];
    }
  }
  selecionarProprietario(usuario: Usuario): void {
  this.veiculo.idProprietario = usuario.id;

  this.nomeProprietarioSelecionado = usuario.nome;
  this.cpfDisplay = this.formatarCPF(usuario.cpf);

  this.emailProprietarioSelecionado = usuario.email || '';
  this.telefoneProprietarioSelecionado = usuario.telefone || '';

  this.cpfErro = '';
}
  // ========= Submit =========
  cadastrar(form: NgForm): void {
    if (!this.veiculo.idProprietario) {
      this.cpfErro = 'Selecione um CPF válido.';
      return;
    }
    const payload: VeiculoPayload = {
      ...this.veiculo,
      placa: (this.veiculo.placa || '').toUpperCase().replaceAll(/\s+-/g, '')
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
    if (!this.veiculo.placa) {return;}
    let placa = this.veiculo.placa.toUpperCase().replaceAll(/\s+/g, '').replaceAll('-', '');
    const placaAntiga = /^[A-Z]{3}[0-9]{4}$/;
    const placaMercosul = /^[A-Z]{3}[0-9][A-Z][0-9]{2}$/;
    if (placaAntiga.test(placa)) {
      this.veiculo.placa = `${placa.slice(0, 3)}-${placa.slice(3)}`;
      return;
    }
    if (placaMercosul.test(placa)) {
      this.veiculo.placa = this.veiculo.placa = `${placa.slice(0, 3)}-${placa.slice(3)}`;;
      return;
    }
    alert('Placa inválida. Use o formato ABC-1234 ou ABC1D23.');
    this.veiculo.placa = '';
  }
  formatarFabricante(fabricante: string): string {
    if (!fabricante) { return ''; }
    const siglas = ['GM', 'VW', 'BMW', 'GWM', 'BYD', 'JAC'];
    fabricante = fabricante.trim().toUpperCase();
    for (const sigla of siglas) {
      if (fabricante.toUpperCase().startsWith(sigla)) {
        return sigla + ' ' + this.capitalizar(
          fabricante.substring(sigla.length + 1)
        );
      }
    }
    return this.capitalizar(fabricante);
  }
  capitalizar(s: string): string {
    if (!s) return '';
    return s.split(' ').map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join(' ');
  }
  formatarCPF(cpf: string | null | undefined): string {
    const d = this.onlyDigits(cpf);
    if (d.length !== 11) return cpf ?? '';
    return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6,9)}-${d.slice(9,11)}`;
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
  limparProprietario(): void {
  this.veiculo.idProprietario = undefined;
  this.nomeProprietarioSelecionado = '';
  this.cpfDisplay = '';
  this.emailProprietarioSelecionado = '';
  this.telefoneProprietarioSelecionado = '';
  this.usuarioSelecionadoModal = null;
}
  formatarTelefone(tel: string | null | undefined): string {
    const n = this.onlyDigits(tel);
    const codigoPais = '55';
    if (n.length === 13) {
      const ddd = n.slice(-11, -9);
      const parte1 = n.slice(-9, -4);
      const parte2 = n.slice(-4);
      return `+${codigoPais} (${ddd}) ${parte1}-${parte2}`;
    } else if (n.length === 10) {
      const ddd = n.slice(0, 2);
      const parte1 = n.slice(2, 6);
      const parte2 = n.slice(6, 10);
      return `+${codigoPais} (${ddd}) ${parte1}-${parte2}`;
    } else if (n.length === 8) {
      const ddd = '11';
      const parte1 = n.slice(0, 4);
      const parte2 = n.slice(4, 8);
      return `+${codigoPais} (${ddd}) ${parte1}-${parte2}`;
    } else { return n;}
  }
  // trackBy para tabela/listas de usuários
  trackByUsuario = (_: number, u: Usuario) => u.id ?? u.cpf;

  abrirModalProprietario(): void {
  this.cpfFiltro = '';
  this.usuarioSelecionadoModal = null;

  this.usuariosFiltrados = this.usuarios.filter(
    u => (u.status || '').toLowerCase() === 'ativo'
  );

  const el = document.getElementById('modalPesquisaProprietario');

  if (!el) {
    console.error('Modal modalPesquisaProprietario não encontrado.');
    return;
  }

  this.modalProprietario = bootstrap.Modal.getOrCreateInstance(el);
  this.modalProprietario.show();
}
marcarUsuarioModal(usuario: Usuario): void {
  this.usuarioSelecionadoModal = usuario;
}

confirmarUsuarioModal(): void {
  if (!this.usuarioSelecionadoModal) {
    return;
  }

  this.selecionarProprietario(this.usuarioSelecionadoModal);

  this.modalProprietario?.hide();
}


}
