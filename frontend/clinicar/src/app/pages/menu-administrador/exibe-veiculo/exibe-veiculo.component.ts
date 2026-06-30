import { Component, ElementRef, HostListener, OnInit, TrackByFunction } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { VeiculoService } from '../exibe-veiculo/exibe-veiculo.service';
import { UsuarioService, Usuario } from '../exibe-usuario/exibe-usuario.service';
import { firstValueFrom } from 'rxjs';
import { WhatsappCloudService } from '../../../services/whatsapp-cloud.service';

declare var bootstrap: any;

export interface Veiculo {
  id?: number;
  placa: string;
  fabricante: string;
  cor: string;
  modelo: string;
  anoModeloCombustivel: string;
  idProprietario?: number;
}

/** ===== FIPE (v2) – tipos FRONT ===== */
type VehicleType = 'cars' | 'motorcycles' | 'trucks';
interface FipeBrand { code: string; name: string; }
interface FipeModel { code: string; name: string; }
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
  selector: 'app-exibe-veiculo',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './exibe-veiculo.component.html',
  styleUrls: ['./exibe-veiculo.component.css']
})

export class ExibeVeiculoComponent implements OnInit {
  // lista exibida e cópia para filtro
  novoVeiculo: Partial<Veiculo> = {
    placa: '',
    fabricante: '',
    modelo: '',
    cor: '',
    anoModeloCombustivel: '',
    idProprietario: undefined
  };
  veiculos: Veiculo[] = [];
  private todos: Veiculo[] = [];
  modalCadastroVeiculo: any;
  modalEdicao: any;
  modalProprietario: any;

  /* Controla se o modal de proprietário está sendo usado pela edição ou pelo cadastro.*/
  modoProprietarioModal: 'edicao' | 'cadastro' = 'edicao';

  /*Estados FIPE exclusivos do cadastro. Isso evita conflito com os selects da edição.*/
  marcaCadastroSelCode = '';
  modeloCadastroSelCode = '';
  anoCadastroSelCode = '';
  modelosCadastro: FipeModel[] = [];
  anosCadastro: FipeYear[] = [];
  cpfFiltroModal = '';
  usuariosFiltradosModal: Usuario[] = [];
  modelosModal: any[] = [];
  anosModeloCombustivel: any[] = [];

  // cache id -> usuário (para resolver CPF/nome rapidamente)
  private readonly usuariosById = new Map<number, Usuario>();

  // estado de edição
  editId: number | null = null;
  edit: Partial<Veiculo> = {};
  loading = false;
  errorMsg = '';

  // picker de CPF (apenas na linha em edição)
  usuarios: Usuario[] = [];
  usuariosFiltrados: Usuario[] = [];
  dropdownOpenId: number | null = null; // controla qual linha tem dropdown aberto
  cpfFiltroEdit = '';

  /** ===== FIPE ===== */
  tipo: VehicleType = 'cars';
  fipeCarregando = { marcas: false, modelos: false, anos: false, detalhes: false };
  fipeErro = '';
  marcas: FipeBrand[] = [];
  modelos: FipeModel[] = [];
  anos: FipeYear[] = [];
  marcaSelCode = '';
  modeloSelCode = '';
  anoSelCode = '';
  // trackBy para *ngFor
  trackByBrand: TrackByFunction<FipeBrand> = (_i, x) => x.code;
  trackByModel: TrackByFunction<FipeModel> = (_i, x) => x.code;
  trackByYear:  TrackByFunction<FipeYear>  = (_i, x) => x.code;
  constructor(
    private readonly http: HttpClient,
    private readonly usuarioService: UsuarioService,
    private readonly veiculoService: VeiculoService,
    private readonly host: ElementRef,
    private readonly location: Location,
    private readonly whatsappService: WhatsappCloudService
  ) {}
  ngOnInit(): void {
    this.carregarUsuarios();
    this.recarregar();
    this.fipeCarregarMarcas();
  }

  // ---------- Usuários / CPF ----------
  private carregarUsuarios(): void {
    this.usuarioService.listarTodos().subscribe({
      next: (lista) => {
        this.usuarios = lista ?? [];
        this.usuariosFiltrados = [...this.usuarios];
        this.usuariosFiltradosModal = [...this.usuarios];
        this.usuariosById.clear();
        for (const u of this.usuarios) {
          if (u?.id != null) this.usuariosById.set(u.id, u);
        }
      },
      error: (e) => console.error('Falha ao carregar usuários:', e)
    });
  }

  /** Visualização: mostra CPF formatado a partir do idProprietario */
  proprietarioCpf(v: Veiculo): string {
    const u = v.idProprietario == null ? undefined : this.usuariosById.get(v.idProprietario);
    return this.formatarCPF(u?.cpf) || '—';
  }

  /** Visualização: mostra nome do proprietário a partir do idProprietario */
  proprietarioNome(v: Veiculo): string {
    const u = v.idProprietario == null ? undefined : this.usuariosById.get(v.idProprietario);
    return u?.nome || '—';
  }

  /** Edição: mostra o CPF atual (do ID selecionado) no input readonly da linha */
  cpfSelecionadoPara(v: Veiculo): string {
    const chosenId =
      this.editId === v.id && this.edit.idProprietario != null
        ? this.edit.idProprietario
        : v.idProprietario;
    const u = chosenId == null ? undefined : this.usuariosById.get(chosenId);
    return this.formatarCPF(u?.cpf) || '';
  }

  toggleUsersDropdownFor(rowId: number, open?: boolean) {
    const shouldOpen = open ?? (this.dropdownOpenId !== rowId);
    this.dropdownOpenId = shouldOpen ? rowId : null;
    if (this.dropdownOpenId != null) {
      this.cpfFiltroEdit = '';
      this.aplicarFiltroEdit();
    }
  }

  aplicarFiltroEdit(): void {
    const t = (this.cpfFiltroEdit || '').trim().toLowerCase();
    if (!t) {
      this.usuariosFiltrados = [...this.usuarios];
      return;
    }
    const tDigits = this.onlyDigits(t);
    this.usuariosFiltrados = this.usuarios.filter((u) => {
      const cpfFmt = this.formatarCPF(u.cpf).toLowerCase();
      const cpfDigits = this.onlyDigits(u.cpf);
      return (
        cpfFmt.includes(t) ||
        cpfDigits.includes(tDigits) ||
        (u.nome || '').toLowerCase().includes(t) ||
        (u.email || '').toLowerCase().includes(t)
      );
    });
  }

  selecionarProprietarioEdit(u: Usuario): void {
    if (!u?.id) return;
    this.edit.idProprietario = u.id; // mantém o ID numérico para salvar
    this.dropdownOpenId = null; // fecha dropdown
  }

  // Fecha o dropdown ao clicar fora do componente
  @HostListener('document:click', ['$event'])
  onDocClick(e: MouseEvent) {
    if (!this.host.nativeElement.contains(e.target)) {
      this.dropdownOpenId = null;
    }
  }

  // ---------- Veículos ----------
  recarregar(): void {
    this.loading = true;
    this.errorMsg = '';
    this.veiculoService.listarTodos().subscribe({
      next: (lista) => {
        this.todos = lista || [];
        this.veiculos = [...this.todos];
        this.loading = false;
        this.cancelarEdicao();
      },
      error: (err) => {
        console.error(err);
        this.loading = false;
        this.errorMsg = 'Falha ao carregar veículos.';
      }
    });
  }

  filtrar(term: string): void {
    const t = (term || '').trim().toLowerCase();
    if (!t) {
      this.veiculos = [...this.todos];
      return;
    }
    this.veiculos = this.todos.filter((v) => {
      const placaRaw = (v.placa || '').toLowerCase();
      const placaFmt = this.formatarPlaca(v.placa).toLowerCase();
      return (
        placaRaw.includes(t) ||
        placaFmt.includes(t) ||
        (v.fabricante || '').toLowerCase().includes(t) ||
        (v.modelo || '').toLowerCase().includes(t) ||
        (v.cor || '').toLowerCase().includes(t)
      );
    });
  }

  trackByVeiculo = (_: number, v: Veiculo) => v.id ?? v.placa;

  trackByUsuario = (_: number, u: Usuario) => u.id ?? u.cpf;

  iniciarEdicao(v: Veiculo): void {
    this.editId = v.id ?? null;
    this.edit = { ...v }; // traz idProprietario para edição
    this.dropdownOpenId = null;
    this.cpfFiltroEdit = '';
  }

  cancelarEdicao(): void {
    this.editId = null;
    this.edit = {};
    this.dropdownOpenId = null;
    this.cpfFiltroEdit = '';
  }

  salvarEdicao(id: number): void {
    if (!this.editId || this.editId !== id) return;

    // payload no formato da UI; o service faz o mapeamento para a API
    const payload: Partial<Veiculo> = {
      ...this.edit,
      placa: ((this.edit.placa ?? '')).toUpperCase().replaceAll(/\s+-/g, ''),
      cor: ((this.edit.cor ?? '')).trim()
    };
    if (payload.idProprietario != null) {
      payload.idProprietario = Number(payload.idProprietario);
    }
    this.veiculoService.atualizarVeiculo(id, payload as any).subscribe({
      next: (atualizado) => {
        const i1 = this.todos.findIndex((x) => x.id === id);
        if (i1 > -1) this.todos[i1] = { ...this.todos[i1], ...atualizado };
        const i2 = this.veiculos.findIndex((x) => x.id === id);
        if (i2 > -1) this.veiculos[i2] = { ...this.veiculos[i2], ...atualizado };
        this.cancelarEdicao();
      },
      error: (err) => {
        console.error(err);
        alert('Erro ao salvar alterações.');
      }
    });
  }

  excluir(id?: number): void {
    if (!id) return;
    if (!confirm('Confirma excluir este veículo?')) return;
    this.veiculoService.removerVeiculo(id).subscribe({
      next: () => {
        this.todos = this.todos.filter((f) => f.id !== id);
        this.veiculos = this.veiculos.filter((f) => f.id !== id);
        if (this.editId === id) this.cancelarEdicao();
      },
      error: (err) => {
        console.error(err);
        alert('Erro ao excluir veículo.');
      }
    });
  }

  // ---------- Helpers ----------
  formatarPlaca(v: any): string {
    if (!v) return '';
    const s = (v || '').toString().toUpperCase().replaceAll(/\s+/g, '');
    if (s.length <= 3) return s;
    if (s.length <= 6) return `${s.slice(0, 3)}-${s.slice(3)}`;
    return `${s.slice(0, 3)}-${s.slice(3, 6)}${s.slice(6)}`;
  }

  private onlyDigits(v: any): string {
    return (v ?? '').toString().replaceAll(/\D/g, '');
  }

  public formatarCPF(cpf?: string): string {
    const d = this.onlyDigits(cpf);
    if (d.length !== 11) return cpf ?? '';
    return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9, 11)}`;
  }

  voltar(): void {
    this.location.back();
  }

  async abrirModalEdicao(veiculo: Veiculo): Promise<void> {
    if (!veiculo?.id) {
      alert('Não foi possível identificar o veículo selecionado.');
      return;
    }
    this.modoProprietarioModal = 'edicao';
    this.editId = veiculo.id;
    this.edit = {
      ...veiculo,
      placa: this.formatarPlaca(veiculo.placa)
    };
    this.cpfFiltroModal = '';
    this.usuariosFiltradosModal = [...this.usuarios];
    this.marcaSelCode = '';
    this.modeloSelCode = '';
    this.anoSelCode = '';
    this.modelos = [];
    this.anos = [];
    this.anosModeloCombustivel = [];
    await this.prepararFipeInicialDoModal(veiculo);
    const el = document.getElementById('modalEdicaoVeiculo');
    if (!el) {
      console.error('Modal modalEdicaoVeiculo não encontrado.');
      return;
    }
    this.modalEdicao = bootstrap.Modal.getOrCreateInstance(el);
    this.modalEdicao.show();
  }

  private async prepararFipeInicialDoModal(veiculo: Veiculo): Promise<void> {
    await this.fipeCarregarMarcas();
    const marcaAtual = this.encontrarMarcaPorNome(veiculo.fabricante);
    if (!marcaAtual) {
      this.marcaSelCode = '';
      this.modeloSelCode = '';
      this.anoSelCode = '';
      return;
    }
    this.marcaSelCode = marcaAtual.code;
    await this.fipeCarregarModelosDaMarca(marcaAtual.code);
    const modeloAtual = this.encontrarModeloPorNome(veiculo.modelo);
    if (!modeloAtual) {
      this.modeloSelCode = '';
      this.anoSelCode = '';
      return;
    }
    this.modeloSelCode = modeloAtual.code;
    await this.fipeCarregarAnosDoModelo(marcaAtual.code, modeloAtual.code);
    const anoAtual = this.encontrarAnoPorDescricao(veiculo.anoModeloCombustivel);
    this.anoSelCode = anoAtual?.code ?? '';
  }

  salvarEdicaoModal(): void {
    if (!this.editId) {return;}
    const payload: Partial<Veiculo> = {
      ...this.edit,
      placa: (this.edit.placa || '').toUpperCase().replace(/[^A-Z0-9]/g, ''),
      fabricante: (this.edit.fabricante || '').trim(),
      modelo: (this.edit.modelo || '').trim(),
      cor: (this.edit.cor || '').trim(),
      anoModeloCombustivel: (this.edit.anoModeloCombustivel || '').replace('/', '|').trim()
    };
    if (payload.idProprietario != null) {
      payload.idProprietario = Number(payload.idProprietario);
    }
    this.veiculoService.atualizarVeiculo(this.editId, payload).subscribe({
      next: (atualizado) => {
        const veiculoAtualizado = {
          ...this.edit,
          ...atualizado
        };
        const idxTodos = this.todos.findIndex(v => v.id === this.editId);
        if (idxTodos > -1) {
          this.todos[idxTodos] = veiculoAtualizado;
        }
        const idxView = this.veiculos.findIndex(v => v.id === this.editId);
        if (idxView > -1) {
          this.veiculos[idxView] = veiculoAtualizado;
        }
        this.modalEdicao?.hide();
        this.cancelarEdicao();
        alert('Veículo atualizado com sucesso.');
        this.recarregar();
      },
      error: (err) => {
        console.error(err);
        alert('Erro ao salvar alterações do veículo.');
      }
    });
  }

  abrirModalSelecaoProprietario(modo?: 'edicao' | 'cadastro'): void {
    if (modo) {this.modoProprietarioModal = modo;}
    this.cpfFiltroModal = '';
    this.usuariosFiltradosModal = [...this.usuarios];

    // Esconde temporariamente o modal que chamou a seleção
    this.modoProprietarioModal === 'cadastro' ? this.modalCadastroVeiculo?.hide() : this.modalEdicao?.hide();

    setTimeout(() => {
      const el = document.getElementById('modalSelecionarProprietario');
      if (!el) {
        console.error('Modal modalSelecionarProprietario não encontrado.');
        return;
      }
      this.modalProprietario = bootstrap.Modal.getOrCreateInstance(el);
      this.modalProprietario.show();
    }, 300);
  }

  filtrarProprietariosModal(termoDigitado?: string): void {
    const termoOriginal = (termoDigitado ?? this.cpfFiltroModal ?? '').toString();
    this.cpfFiltroModal = termoOriginal;
    const termo = termoOriginal.trim();
    if (!termo) {
      this.usuariosFiltradosModal = [...this.usuarios];
      return;
    }
    const termoTexto = this.normalizarTexto(termo);
    const termoNumeros = this.onlyDigits(termo);
    this.usuariosFiltradosModal = this.usuarios.filter((u: any) => {
      const cpfFormatado = this.formatarCPF(u.cpf);
      const cpfNumeros = this.onlyDigits(u.cpf);
      const nome = this.normalizarTexto(u.nome);
      const email = this.normalizarTexto(u.email);
      const telefoneBruto = u.telefone ?? u.celular ?? u.whatsapp ?? '';
      const telefoneFormatado = this.formatarTelefone(telefoneBruto);
      const telefoneNumeros = this.onlyDigits(telefoneBruto);
      const status = this.normalizarTexto(u.status);
      const encontrouPorTexto =
        nome.includes(termoTexto) ||
        email.includes(termoTexto) ||
        status.includes(termoTexto);
      const encontrouPorCpfFormatado =
        this.normalizarTexto(cpfFormatado).includes(termoTexto);
      const encontrouPorTelefoneFormatado =
        this.normalizarTexto(telefoneFormatado).includes(termoTexto);
      const encontrouPorNumeros = termoNumeros.length > 0 && (cpfNumeros.includes(termoNumeros) || telefoneNumeros.includes(termoNumeros));
      return (
        encontrouPorTexto ||
        encontrouPorCpfFormatado ||
        encontrouPorTelefoneFormatado ||
        encontrouPorNumeros
      );
    });
  }

  private normalizarTexto(valor: any): string {
    return (valor ?? '').toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  }

  selecionarProprietarioModal(u: Usuario): void {
    if (!u?.id) return;
    if (this.modoProprietarioModal === 'cadastro') {
      this.novoVeiculo.idProprietario = u.id;
    } else {
      this.edit.idProprietario = u.id;
    }
    this.modalProprietario?.hide();
    setTimeout(() => {
      if (this.modoProprietarioModal === 'cadastro') {
        const elCadastro = document.getElementById('modalCadastroVeiculo');
        if (elCadastro) {
          this.modalCadastroVeiculo = bootstrap.Modal.getOrCreateInstance(elCadastro);
          this.modalCadastroVeiculo.show();
        }
      } else {
        const elEdicao = document.getElementById('modalEdicaoVeiculo');
        if (elEdicao) {
          this.modalEdicao = bootstrap.Modal.getOrCreateInstance(elEdicao);
          this.modalEdicao.show();
        }
      }
    }, 300);
  }

  proprietarioSelecionadoModal(): Usuario | undefined {
    const id = this.edit.idProprietario;
    if (id == null) return undefined;
    return this.usuariosById.get(Number(id));
  }

  cpfProprietarioSelecionadoModal(): string {
    const usuario = this.proprietarioSelecionadoModal();
    return this.formatarCPF(usuario?.cpf) || '';
  }

  nomeProprietarioSelecionadoModal(): string {
    const usuario = this.proprietarioSelecionadoModal();
    return usuario?.nome || '';
  }

  emailProprietarioSelecionadoModal(): string {
    const usuario = this.proprietarioSelecionadoModal();
    return usuario?.email || '';
  }

  telefoneProprietarioSelecionadoModal(): string {
    const usuario = this.proprietarioSelecionadoModal();
    return usuario?.telefone || '';
  }

  proprietarioSelecionadoCadastro(): Usuario | undefined {
    const id = this.novoVeiculo.idProprietario;
    if (id == null) return undefined;
    return this.usuariosById.get(Number(id));
  }

  cpfProprietarioSelecionadoCadastro(): string {
    const usuario = this.proprietarioSelecionadoCadastro();
    return this.formatarCPF(usuario?.cpf) || '';
  }

  nomeProprietarioSelecionadoCadastro(): string {
    const usuario = this.proprietarioSelecionadoCadastro();
    return usuario?.nome || '';
  }

  emailProprietarioSelecionadoCadastro(): string {
    const usuario = this.proprietarioSelecionadoCadastro();
    return usuario?.email || '';
  }

  telefoneProprietarioSelecionadoCadastro(): string {
    const usuario = this.proprietarioSelecionadoCadastro();
    return usuario?.telefone || '';
  }

  // ========= FIPE =========
  async fipeCarregarMarcas(): Promise<void> {
    if (this.marcas.length > 0) {return;}
    this.fipeErro = '';
    this.fipeCarregando.marcas = true;
    try {
      const lista = await firstValueFrom(
        this.http.get<FipeBrand[]>(`${FIPE_BASE}/${this.tipo}/brands`)
      );
      this.marcas = (lista ?? []).sort((a, b) =>
        this.formatarFabricante(a.name).localeCompare(
          this.formatarFabricante(b.name),
          'pt-BR'
        )
      );
    } catch (err) {
      console.error('Erro ao carregar montadoras FIPE:', err);
      this.marcas = [];
      this.fipeErro = 'Falha ao carregar montadoras da Tabela FIPE.';
    } finally {
      this.fipeCarregando.marcas = false;
    }
  }

  private async fipeCarregarModelosDaMarca(marcaCode: string): Promise<void> {
    if (!marcaCode) {
      this.modelos = [];
      return;
    }
    this.fipeErro = '';
    this.fipeCarregando.modelos = true;
    try {
      const resp = await firstValueFrom(
        this.http.get<any>(`${FIPE_BASE}/${this.tipo}/brands/${marcaCode}/models`)
      );
      const arr = Array.isArray(resp) ? resp : (resp?.models ?? resp?.modelos ?? []);
      this.modelos = (arr ?? []).sort((a: FipeModel, b: FipeModel) => a.name.localeCompare(b.name, 'pt-BR'));
    } catch (err) {
      console.error('Erro ao carregar modelos FIPE:', err);
      this.modelos = [];
      this.fipeErro = 'Falha ao carregar modelos da Tabela FIPE.';
    } finally {
      this.fipeCarregando.modelos = false;
    }
  }

  private async fipeCarregarAnosDoModelo(marcaCode: string, modeloCode: string): Promise<void> {
    if (!marcaCode || !modeloCode) {
      this.anos = [];
      this.anosModeloCombustivel = [];
      return;
    }
    this.fipeErro = '';
    this.fipeCarregando.anos = true;
    try {
      const lista = await firstValueFrom(
        this.http.get<FipeYear[]>(
          `${FIPE_BASE}/${this.tipo}/brands/${marcaCode}/models/${modeloCode}/years`
        )
      );
      this.anos = lista ?? [];
      this.anosModeloCombustivel = [...this.anos];
    } catch (err) {
      console.error('Erro ao carregar anos FIPE:', err);
      this.anos = [];
      this.anosModeloCombustivel = [];
      this.fipeErro = 'Falha ao carregar anos/modelos/combustíveis da Tabela FIPE.';
    } finally {
      this.fipeCarregando.anos = false;
    }
  }

  async onChangeMarca(code: string): Promise<void> {
    this.marcaSelCode = code || '';
    this.modeloSelCode = '';
    this.anoSelCode = '';
    this.modelos = [];
    this.anos = [];
    this.anosModeloCombustivel = [];
    this.edit.modelo = '';
    this.edit.anoModeloCombustivel = '';
    if (!this.marcaSelCode) {
      this.edit.fabricante = '';
      return;
    }
    const marcaSelecionada = this.marcas.find((m) => String(m.code) === String(this.marcaSelCode));
    this.edit.fabricante = marcaSelecionada ? this.formatarFabricante(marcaSelecionada.name) : '';
    await this.fipeCarregarModelosDaMarca(this.marcaSelCode);
  }

  async onChangeModelo(code: string): Promise<void> {
    this.modeloSelCode = code || '';
    this.anoSelCode = '';
    this.anos = [];
    this.anosModeloCombustivel = [];
    this.edit.anoModeloCombustivel = '';
    if (!this.marcaSelCode || !this.modeloSelCode) {
      this.edit.modelo = '';
      return;
    }
    const modeloSelecionado = this.modelos.find((m) => String(m.code) === String(this.modeloSelCode));
    this.edit.modelo = modeloSelecionado ? modeloSelecionado.name : '';
    await this.fipeCarregarAnosDoModelo(this.marcaSelCode, this.modeloSelCode);
  }

  async onChangeAnoModeloCombustivel(code: string): Promise<void> {
    this.anoSelCode = code || '';
    this.edit.anoModeloCombustivel = '';
    if (!this.marcaSelCode || !this.modeloSelCode || !this.anoSelCode) {return;}
    this.fipeErro = '';
    this.fipeCarregando.detalhes = true;
    try {
      const det = await firstValueFrom(
        this.http.get<FipeDetails>(
          `${FIPE_BASE}/${this.tipo}/brands/${this.marcaSelCode}/models/${this.modeloSelCode}/years/${this.anoSelCode}`
        )
      );
      if (det?.brand) {this.edit.fabricante = this.formatarFabricante(det.brand);}
      if (det?.model) {this.edit.modelo = det.model;}
      const ano = det?.modelYear ?? '';
      const combustivel = det?.fuel ?? '';
      this.edit.anoModeloCombustivel = `${ano} | ${combustivel}`.trim();
    } catch (err) {
      console.error('Erro ao buscar detalhes FIPE:', err);
      this.fipeErro = 'Falha ao buscar detalhes do veículo na Tabela FIPE.';
    } finally {
      this.fipeCarregando.detalhes = false;
    }
  }

  private normalizarFipeTexto(valor: any): string {
    return (valor ?? '').toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  }
  private encontrarMarcaPorNome(nome?: string): FipeBrand | undefined {
    const alvo = this.normalizarFipeTexto(nome);
    if (!alvo) {return undefined;}
    return this.marcas.find((m) => {
      const nomeOriginal = this.normalizarFipeTexto(m.name);
      const nomeFormatado = this.normalizarFipeTexto(this.formatarFabricante(m.name));
      return (
        nomeOriginal === alvo ||
        nomeFormatado === alvo ||
        nomeOriginal.includes(alvo) ||
        alvo.includes(nomeOriginal) ||
        nomeFormatado.includes(alvo) ||
        alvo.includes(nomeFormatado)
      );
    });
  }

  private encontrarModeloPorNome(nome?: string): FipeModel | undefined {
    const alvo = this.normalizarFipeTexto(nome);
    if (!alvo) {return undefined;}
    const exato = this.modelos.find((m) => this.normalizarFipeTexto(m.name) === alvo);
    if (exato) {return exato;}
    return this.modelos.find((m) => {
      const nomeModelo = this.normalizarFipeTexto(m.name);
      return nomeModelo.includes(alvo) || alvo.includes(nomeModelo);
    });
  }

  private encontrarAnoPorDescricao(descricao?: string): FipeYear | undefined {
    const alvo = this.normalizarFipeTexto(descricao);
    if (!alvo) {return undefined;}
    const exato = this.anos.find((a) => this.normalizarFipeTexto(a.name) === alvo);
    if (exato) {return exato;}
    return this.anos.find((a) => {
      const nomeAno = this.normalizarFipeTexto(a.name);
      return nomeAno.includes(alvo) || alvo.includes(nomeAno);
    });
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

  async abrirModalCadastroVeiculo(): Promise<void> {
    this.novoVeiculo = {
      placa: '',
      fabricante: '',
      modelo: '',
      cor: '',
      anoModeloCombustivel: '',
      idProprietario: undefined
    };
    this.modoProprietarioModal = 'cadastro';
    this.marcaCadastroSelCode = '';
    this.modeloCadastroSelCode = '';
    this.anoCadastroSelCode = '';
    this.modelosCadastro = [];
    this.anosCadastro = [];
    this.cpfFiltroModal = '';
    this.usuariosFiltradosModal = [...this.usuarios];
    if (!this.marcas || this.marcas.length === 0) {
      await this.fipeCarregarMarcas();
    }
    const el = document.getElementById('modalCadastroVeiculo');
    if (!el) {
      console.error('Modal modalCadastroVeiculo não encontrado.');
      return;
    }
    this.modalCadastroVeiculo = bootstrap.Modal.getOrCreateInstance(el);
    this.modalCadastroVeiculo.show();
  }

  async onChangeMarcaCadastro(code: string): Promise<void> {
    this.marcaCadastroSelCode = code || '';
    this.modeloCadastroSelCode = '';
    this.anoCadastroSelCode = '';
    this.modelosCadastro = [];
    this.anosCadastro = [];
    this.novoVeiculo.modelo = '';
    this.novoVeiculo.anoModeloCombustivel = '';
    if (!this.marcaCadastroSelCode) {
      this.novoVeiculo.fabricante = '';
      return;
    }
    const marcaSelecionada = this.marcas.find((m) => String(m.code) === String(this.marcaCadastroSelCode));
    this.novoVeiculo.fabricante = marcaSelecionada ? this.formatarFabricante(marcaSelecionada.name) : '';
    this.fipeErro = '';
    this.fipeCarregando.modelos = true;
    try {
      const resp = await firstValueFrom(this.http.get<any>(`${FIPE_BASE}/${this.tipo}/brands/${this.marcaCadastroSelCode}/models`));
      const arr = Array.isArray(resp) ? resp : (resp?.models ?? resp?.modelos ?? []);
      this.modelosCadastro = (arr ?? []).sort((a: FipeModel, b: FipeModel) => a.name.localeCompare(b.name, 'pt-BR'));
    } catch (err) {
      console.error('Erro ao carregar modelos FIPE no cadastro:', err);
      this.modelosCadastro = [];
      this.fipeErro = 'Falha ao carregar modelos da Tabela FIPE.';
    } finally {
      this.fipeCarregando.modelos = false;
    }
  }

  async onChangeModeloCadastro(code: string): Promise<void> {
    this.modeloCadastroSelCode = code || '';
    this.anoCadastroSelCode = '';
    this.anosCadastro = [];
    this.novoVeiculo.anoModeloCombustivel = '';
    if (!this.marcaCadastroSelCode || !this.modeloCadastroSelCode) {
      this.novoVeiculo.modelo = '';
      return;
    }
    const modeloSelecionado = this.modelosCadastro.find((m) => String(m.code) === String(this.modeloCadastroSelCode));
    this.novoVeiculo.modelo = modeloSelecionado ? modeloSelecionado.name : '';
    this.fipeErro = '';
    this.fipeCarregando.anos = true;
    try {
      const lista = await firstValueFrom(
        this.http.get<FipeYear[]>(`${FIPE_BASE}/${this.tipo}/brands/${this.marcaCadastroSelCode}/models/${this.modeloCadastroSelCode}/years`)
    );
    this.anosCadastro = lista ?? [];
    } catch (err) {
      console.error('Erro ao carregar anos FIPE no cadastro:', err);
      this.anosCadastro = [];
      this.fipeErro = 'Falha ao carregar anos/modelos/combustíveis da Tabela FIPE.';
    } finally {
      this.fipeCarregando.anos = false;
    }
  }

  async onChangeAnoModeloCombustivelCadastro(code: string): Promise<void> {
    this.anoCadastroSelCode = code || '';
    this.novoVeiculo.anoModeloCombustivel = '';
    if (!this.marcaCadastroSelCode || !this.modeloCadastroSelCode || !this.anoCadastroSelCode) {
      return;
    }
    this.fipeErro = '';
    this.fipeCarregando.detalhes = true;
    try {
      const det = await firstValueFrom(
        this.http.get<FipeDetails>(
          `${FIPE_BASE}/${this.tipo}/brands/${this.marcaCadastroSelCode}/models/${this.modeloCadastroSelCode}/years/${this.anoCadastroSelCode}`
        )
      );
      if (det?.brand) {
        this.novoVeiculo.fabricante = this.formatarFabricante(det.brand);
      }
      if (det?.model) {
        this.novoVeiculo.modelo = det.model;
      }
      const ano = det?.modelYear ?? '';
      const combustivel = det?.fuel ?? '';
      this.novoVeiculo.anoModeloCombustivel = `${ano} | ${combustivel}`.trim();
    } catch (err) {
      console.error('Erro ao buscar detalhes FIPE no cadastro:', err);
      this.fipeErro = 'Falha ao buscar detalhes do veículo na Tabela FIPE.';
    } finally {
      this.fipeCarregando.detalhes = false;
    }
  }

  salvarCadastroVeiculo(): void {
    const payload: Partial<Veiculo> = {
      placa: (this.novoVeiculo.placa || '').toUpperCase().replace(/[^A-Z0-9]/g, ''),
      fabricante: (this.novoVeiculo.fabricante || '').trim(),
      modelo: (this.novoVeiculo.modelo || '').trim(),
      cor: (this.novoVeiculo.cor || '').trim(),
      anoModeloCombustivel: (this.novoVeiculo.anoModeloCombustivel || '').replace('/', '|').trim(),
      idProprietario: this.novoVeiculo.idProprietario !== null &&
        this.novoVeiculo.idProprietario !== undefined
          ? Number(this.novoVeiculo.idProprietario)
          : undefined
    };
    if (!payload.placa) {
      alert('Informe a placa do veículo.');
      return;
    }
    if (!payload.fabricante) {
      alert('Selecione o fabricante do veículo.');
      return;
    }
    if (!payload.modelo) {
      alert('Selecione o modelo do veículo.');
      return;
    }
    if (!payload.anoModeloCombustivel) {
      alert('Selecione o ano-modelo/combustível do veículo.');
      return;
    }
    if (!payload.cor) {
      alert('Informe a cor do veículo.');
      return;
    }
    if (!payload.idProprietario) {
      alert('Selecione o proprietário do veículo.');
      return;
    }
    const proprietario = this.buscarUsuarioPorId(payload.idProprietario);
    if (!proprietario) {
      alert('Não foi possível localizar os dados do proprietário selecionado.');
      return;
    }
    if (!this.normalizarTelefoneWhatsapp(proprietario.telefone)) {
      alert('O proprietário selecionado não possui telefone válido para WhatsApp.');
      return;
    }
    this.veiculoService.cadastrar(payload as Omit<Veiculo, 'id'>).subscribe({
      next: (veiculoCadastrado) => {
        const veiculoParaMensagem: Partial<Veiculo> = {
          ...payload,
          ...veiculoCadastrado,
          idProprietario: payload.idProprietario
        };
        this.modalCadastroVeiculo?.hide();
        alert('Veículo cadastrado com sucesso.');
        this.enviarWhatsappCadastroVeiculo(veiculoParaMensagem, true);
        this.novoVeiculo = {
          placa: '',
          fabricante: '',
          modelo: '',
          cor: '',
          anoModeloCombustivel: '',
          idProprietario: undefined
        };
        this.recarregar();
      },
      error: (err) => {
        console.error('Erro ao cadastrar veículo:', err);
        alert('Erro ao cadastrar veículo.');
      }
    });
  }

  private buscarUsuarioPorId(idProprietario?: number): Usuario | undefined {
    if (idProprietario == null) {
      return undefined;
    }
    return this.usuariosById.get(Number(idProprietario));
  }

  private normalizarTelefoneWhatsapp(telefone?: string): string {
    const digitos = this.onlyDigits(telefone);
    if (!digitos) { return '';}

    // Se já vier com DDI 55, mantém.
    if (digitos.startsWith('55')) {return digitos;}

    // Se vier com DDD + número, adiciona 55.
    if (digitos.length === 10 || digitos.length === 11) {return `55${digitos}`;}

    // Se vier apenas o número sem DDD, aqui estou assumindo DDD 11.
    // Ajuste se você quiser obrigar o cadastro com DDD.
    if (digitos.length === 8 || digitos.length === 9) {return `5511${digitos}`;}
      return digitos;
  }

  private montarParametrosTemplateCadastroVeiculo(veiculo: Partial<Veiculo>, proprietario: Usuario): string[] {
    return [
      proprietario.nome || 'Cliente',
      this.capitalizar(veiculo.modelo || 'Veículo')
    ];
  }

  private enviarWhatsappCadastroVeiculo(veiculo: Partial<Veiculo>, exibirAlertas = false): void {
    const proprietario = this.buscarUsuarioPorId(veiculo.idProprietario);
    if (!proprietario) {
      console.warn('Proprietário não encontrado para envio de WhatsApp.', veiculo);
      if (exibirAlertas) {
        alert('Proprietário não encontrado para envio de WhatsApp.');
      }
      return;
    }
    const telefoneWhatsapp = this.normalizarTelefoneWhatsapp(proprietario.telefone);
    if (!telefoneWhatsapp) {
      console.warn('Proprietário sem telefone cadastrado.', proprietario);
      if (exibirAlertas) {alert('O proprietário selecionado não possui telefone cadastrado.');}
      return;
    }
    this.whatsappService.enviarMensagemCadastroVeiculo({
      telefone: telefoneWhatsapp,
      template: 'cadastro_veiculo',
      languageCode: 'pt_BR',
      parametrosBody: [
        proprietario.nome || 'Cliente',
        this.capitalizar(veiculo.modelo || 'Veículo')
      ]
    }).subscribe({
      next: () => {
        alert('Mensagem de WhatsApp enviada com sucesso.');
      },
      error: (err) => {
        console.error('Erro ao enviar mensagem pelo WhatsApp:', err);
        alert('Veículo cadastrado, mas houve erro ao enviar a mensagem pelo WhatsApp.');
      }
    });
  }


  /*this.whatsappCloudService.enviarMensagemCadastroUsuario({
          telefone: this.novoUsuario.telefone || '',
          nome: this.novoUsuario.nome || ''
        }).subscribe();
        this.recarregar();*/
}
