import { Component, ElementRef, HostListener, OnInit, TrackByFunction } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { VeiculoService } from '../exibe-veiculo/exibe-veiculo.service';
import { UsuarioService, Usuario } from '../exibe-usuario/exibe-usuario.service';
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

type VehicleType = 'cars' | 'motorcycles' | 'trucks';
type AbaVeiculo = 'veiculo' | 'proprietario' | 'revisao';
type SortDirection = 'asc' | 'desc';
type SortColumn = 'placa' | 'fabricante' | 'modelo' | 'cor' | 'anoModeloCombustivel' | 'proprietario';

interface FipeBrand { code: string; name: string; }
interface FipeModel { code: string; name: string; }
interface FipeYear { code: string; name: string; }
interface FipeDetails {
  brand: string;
  model: string;
  modelYear: number;
  fuel: string;
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
  novoVeiculo: Partial<Veiculo> = this.criarVeiculoVazio();
  veiculos: Veiculo[] = [];
  private todos: Veiculo[] = [];

  usuarios: Usuario[] = [];
  usuariosFiltrados: Usuario[] = [];
  usuariosFiltradosModal: Usuario[] = [];
  private readonly usuariosById = new Map<number, Usuario>();

  loading = false;
  errorMsg = '';
  mensagemSucesso = '';
  mensagemErroModal = '';

  filtro = '';
  filtroFabricante = '';
  filtroProprietario = '';

  paginaAtual = 1;
  itensPorPagina = 10;
  opcoesItensPorPagina = [5, 10, 20, 50];

  sortColumn: SortColumn = 'placa';
  sortDirection: SortDirection = 'asc';

  modalCadastroVeiculo: any;
  modalEdicao: any;
  modalProprietario: any;
  modalDetalhes: any;
  modalConfirmacao: any;

  modoProprietarioModal: 'edicao' | 'cadastro' = 'edicao';
  cpfFiltroModal = '';
  dropdownOpenId: number | null = null;
  cpfFiltroEdit = '';

  editId: number | null = null;
  edit: Partial<Veiculo> = {};
  veiculoDetalhe: Veiculo | null = null;
  veiculoAcao: Veiculo | null = null;
  executandoAcao = false;

  abaCadastroVeiculo: AbaVeiculo = 'veiculo';
  abaEdicaoVeiculo: AbaVeiculo = 'veiculo';

  tipo: VehicleType = 'cars';
  fipeCarregando = { marcas: false, modelos: false, anos: false, detalhes: false };
  fipeErro = '';
  marcas: FipeBrand[] = [];
  modelos: FipeModel[] = [];
  anos: FipeYear[] = [];
  marcaSelCode = '';
  modeloSelCode = '';
  anoSelCode = '';

  marcaCadastroSelCode = '';
  modeloCadastroSelCode = '';
  anoCadastroSelCode = '';
  modelosCadastro: FipeModel[] = [];
  anosCadastro: FipeYear[] = [];

  trackByBrand: TrackByFunction<FipeBrand> = (_i, x) => x.code;
  trackByModel: TrackByFunction<FipeModel> = (_i, x) => x.code;
  trackByYear: TrackByFunction<FipeYear> = (_i, x) => x.code;
  trackByVeiculo = (_: number, v: Veiculo) => v.id ?? v.placa;
  trackByUsuario = (_: number, u: Usuario) => u.id ?? u.cpf;

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

  @HostListener('document:click', ['$event'])
  onDocClick(e: MouseEvent): void {
    if (!this.host.nativeElement.contains(e.target)) {
      this.dropdownOpenId = null;
    }
  }

  private criarVeiculoVazio(): Partial<Veiculo> {
    return {
      placa: '',
      fabricante: '',
      modelo: '',
      cor: '',
      anoModeloCombustivel: '',
      idProprietario: undefined
    };
  }

  private carregarUsuarios(): void {
    this.usuarioService.listarTodos().subscribe({
      next: (lista) => {
        this.usuarios = lista ?? [];
        this.usuariosFiltrados = [...this.usuarios];
        this.usuariosFiltradosModal = [...this.usuarios];
        this.usuariosById.clear();

        for (const u of this.usuarios) {
          if (u?.id != null) {
            this.usuariosById.set(Number(u.id), u);
          }
        }
      },
      error: (e) => console.error('Falha ao carregar usuários:', e)
    });
  }

  recarregar(): void {
    this.loading = true;
    this.errorMsg = '';

    this.veiculoService.listarTodos().subscribe({
      next: (lista) => {
        this.todos = (lista || []).map(v => this.normalizarVeiculoParaTela(v as Veiculo));
        this.veiculos = [...this.todos];
        this.paginaAtual = 1;
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

  private normalizarVeiculoParaTela(v: Veiculo): Veiculo {
    return {
      ...v,
      placa: this.formatarPlaca(v.placa),
      fabricante: this.formatarFabricante(v.fabricante),
      modelo: this.formatarModeloVeiculo(v.modelo),
      cor: this.capitalizar(v.cor),
      anoModeloCombustivel: this.formatarAnoCombustivel(v.anoModeloCombustivel)
    };
  }

  voltar(): void {
    this.location.back();
  }

  limparFiltros(): void {
    this.filtro = '';
    this.filtroFabricante = '';
    this.filtroProprietario = '';
    this.aoAlterarFiltros();
  }

  possuiFiltrosAplicados(): boolean {
    return !!(
      this.filtro.trim() ||
      this.filtroFabricante ||
      this.filtroProprietario
    );
  }

  aoAlterarFiltros(): void {
    this.paginaAtual = 1;
  }

  get fabricantesFiltro(): string[] {
    return [...new Set(
      this.todos
        .map(v => this.formatarFabricante(v.fabricante))
        .filter(Boolean)
    )].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }

  get totalVeiculos(): number {
    return this.todos.length;
  }

  get totalComProprietario(): number {
    return this.todos.filter(v => !!this.proprietarioDoVeiculo(v)).length;
  }

  get totalSemProprietario(): number {
    return this.todos.filter(v => !this.proprietarioDoVeiculo(v)).length;
  }

  get totalWhatsappValido(): number {
    return this.todos.filter(v => this.whatsappValidoDoProprietario(v)).length;
  }

  get veiculosFiltrados(): Veiculo[] {
    const termo = this.normalizarTexto(this.filtro);
    const termoNumeros = this.onlyDigits(this.filtro);

    return this.todos.filter(v => {
      const proprietario = this.proprietarioDoVeiculo(v);
      const placaFormatada = this.formatarPlaca(v.placa);
      const placaNumerosLetras = this.normalizarPlaca(v.placa);
      const telefoneProprietario = proprietario?.telefone ?? '';

      const atendeTexto = !termo && !termoNumeros
        ? true
        : [
            placaFormatada,
            placaNumerosLetras,
            v.fabricante,
            v.modelo,
            v.cor,
            v.anoModeloCombustivel,
            proprietario?.nome,
            proprietario?.email,
            this.formatarCPF(proprietario?.cpf),
            this.formatarTelefone(telefoneProprietario)
          ].some(valor => this.normalizarTexto(valor).includes(termo))
          || (!!termoNumeros && [
            this.onlyDigits(v.placa),
            this.onlyDigits(proprietario?.cpf),
            this.onlyDigits(telefoneProprietario)
          ].some(valor => valor.includes(termoNumeros)));

      const atendeFabricante = !this.filtroFabricante
        || this.formatarFabricante(v.fabricante) === this.filtroFabricante;

      const atendeProprietario = !this.filtroProprietario
        || (this.filtroProprietario === 'com' && !!proprietario)
        || (this.filtroProprietario === 'sem' && !proprietario)
        || (this.filtroProprietario === 'whatsapp' && this.whatsappValidoDoProprietario(v));

      return atendeTexto && atendeFabricante && atendeProprietario;
    });
  }

  get veiculosOrdenados(): Veiculo[] {
    return [...this.veiculosFiltrados].sort((a, b) => {
      const valorA = this.valorOrdenacao(a, this.sortColumn);
      const valorB = this.valorOrdenacao(b, this.sortColumn);
      const resultado = valorA.localeCompare(valorB, 'pt-BR', { numeric: true, sensitivity: 'base' });
      return this.sortDirection === 'asc' ? resultado : -resultado;
    });
  }

  private valorOrdenacao(v: Veiculo, coluna: SortColumn): string {
    switch (coluna) {
      case 'placa': return this.formatarPlaca(v.placa);
      case 'fabricante': return this.formatarFabricante(v.fabricante);
      case 'modelo': return this.formatarModeloVeiculo(v.modelo);
      case 'cor': return this.capitalizar(v.cor);
      case 'anoModeloCombustivel': return this.formatarAnoCombustivel(v.anoModeloCombustivel);
      case 'proprietario': return this.proprietarioNome(v);
      default: return '';
    }
  }

  ordenarPor(coluna: SortColumn): void {
    if (this.sortColumn === coluna) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
      return;
    }

    this.sortColumn = coluna;
    this.sortDirection = 'asc';
  }

  iconeOrdenacao(coluna: SortColumn): string {
    if (this.sortColumn !== coluna) {
      return 'bi-arrow-down-up';
    }

    return this.sortDirection === 'asc' ? 'bi-sort-alpha-down' : 'bi-sort-alpha-up';
  }

  get totalRegistrosFiltrados(): number {
    return this.veiculosOrdenados.length;
  }

  get totalPaginas(): number {
    return Math.max(1, Math.ceil(this.totalRegistrosFiltrados / this.itensPorPagina));
  }

  get indiceInicialPagina(): number {
    if (this.totalRegistrosFiltrados === 0) {
      return 0;
    }

    return (this.paginaAtual - 1) * this.itensPorPagina + 1;
  }

  get indiceFinalPagina(): number {
    return Math.min(this.paginaAtual * this.itensPorPagina, this.totalRegistrosFiltrados);
  }

  get veiculosPaginados(): Veiculo[] {
    this.ajustarPaginaAtual();
    const inicio = (this.paginaAtual - 1) * this.itensPorPagina;
    const fim = inicio + this.itensPorPagina;
    return this.veiculosOrdenados.slice(inicio, fim);
  }

  aoAlterarItensPorPagina(): void {
    this.paginaAtual = 1;
    this.ajustarPaginaAtual();
  }

  irParaPagina(pagina: number): void {
    if (pagina < 1 || pagina > this.totalPaginas) {
      return;
    }

    this.paginaAtual = pagina;
  }

  paginaAnterior(): void {
    if (this.paginaAtual > 1) {
      this.paginaAtual--;
    }
  }

  proximaPagina(): void {
    if (this.paginaAtual < this.totalPaginas) {
      this.paginaAtual++;
    }
  }

  paginasVisiveis(): number[] {
    const total = this.totalPaginas;
    const atual = this.paginaAtual;
    const inicio = Math.max(1, atual - 2);
    const fim = Math.min(total, atual + 2);
    const paginas: number[] = [];

    for (let i = inicio; i <= fim; i++) {
      paginas.push(i);
    }

    return paginas;
  }

  private ajustarPaginaAtual(): void {
    if (this.paginaAtual > this.totalPaginas) {
      this.paginaAtual = this.totalPaginas;
    }

    if (this.paginaAtual < 1) {
      this.paginaAtual = 1;
    }
  }

  proprietarioDoVeiculo(v: Veiculo | null | undefined): Usuario | undefined {
    if (!v?.idProprietario) {
      return undefined;
    }

    return this.usuariosById.get(Number(v.idProprietario));
  }

  proprietarioCpf(v: Veiculo | null | undefined): string {
    return this.formatarCPF(this.proprietarioDoVeiculo(v)?.cpf) || '—';
  }

  proprietarioNome(v: Veiculo | null | undefined): string {
    return this.proprietarioDoVeiculo(v)?.nome || '—';
  }

  proprietarioEmail(v: Veiculo | null | undefined): string {
    return this.proprietarioDoVeiculo(v)?.email || '—';
  }

  proprietarioTelefone(v: Veiculo | null | undefined): string {
    return this.formatarTelefone(this.proprietarioDoVeiculo(v)?.telefone) || '—';
  }

  whatsappValidoDoProprietario(v: Veiculo | null | undefined): boolean {
    return !!this.normalizarTelefoneWhatsapp(this.proprietarioDoVeiculo(v)?.telefone);
  }

  abrirDetalhes(veiculo: Veiculo): void {
    this.veiculoDetalhe = veiculo;
    const el = document.getElementById('modalDetalhesVeiculo');
    if (!el) {
      return;
    }

    this.modalDetalhes = bootstrap.Modal.getOrCreateInstance(el);
    this.modalDetalhes.show();
  }

  async abrirModalCadastroVeiculo(): Promise<void> {
    this.novoVeiculo = this.criarVeiculoVazio();
    this.mensagemErroModal = '';
    this.abaCadastroVeiculo = 'veiculo';
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

  async abrirModalEdicao(veiculo: Veiculo): Promise<void> {
    if (!veiculo?.id) {
      alert('Não foi possível identificar o veículo selecionado.');
      return;
    }

    this.modoProprietarioModal = 'edicao';
    this.editId = veiculo.id;
    this.edit = {
      ...veiculo,
      placa: this.formatarPlaca(veiculo.placa),
      fabricante: this.formatarFabricante(veiculo.fabricante),
      modelo: this.formatarModeloVeiculo(veiculo.modelo),
      cor: this.capitalizar(veiculo.cor),
      anoModeloCombustivel: this.formatarAnoCombustivel(veiculo.anoModeloCombustivel)
    };
    this.mensagemErroModal = '';
    this.abaEdicaoVeiculo = 'veiculo';
    this.cpfFiltroModal = '';
    this.usuariosFiltradosModal = [...this.usuarios];
    this.marcaSelCode = '';
    this.modeloSelCode = '';
    this.anoSelCode = '';
    this.modelos = [];
    this.anos = [];

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
    await this.fipeCarregarModelosDaMarca(marcaAtual.code, 'edicao');

    const modeloAtual = this.encontrarModeloPorNome(veiculo.modelo, this.modelos);
    if (!modeloAtual) {
      this.modeloSelCode = '';
      this.anoSelCode = '';
      return;
    }

    this.modeloSelCode = modeloAtual.code;
    await this.fipeCarregarAnosDoModelo(marcaAtual.code, modeloAtual.code, 'edicao');

    const anoAtual = this.encontrarAnoPorDescricao(veiculo.anoModeloCombustivel, this.anos);
    this.anoSelCode = anoAtual?.code ?? '';
  }

  trocarAbaCadastroVeiculo(aba: AbaVeiculo): void {
    this.abaCadastroVeiculo = aba;
  }

  trocarAbaEdicaoVeiculo(aba: AbaVeiculo): void {
    this.abaEdicaoVeiculo = aba;
  }

  proximaAbaCadastroVeiculo(): void {
    if (this.abaCadastroVeiculo === 'veiculo') {
      this.abaCadastroVeiculo = 'proprietario';
      return;
    }

    if (this.abaCadastroVeiculo === 'proprietario') {
      this.abaCadastroVeiculo = 'revisao';
    }
  }

  abaAnteriorCadastroVeiculo(): void {
    if (this.abaCadastroVeiculo === 'revisao') {
      this.abaCadastroVeiculo = 'proprietario';
      return;
    }

    if (this.abaCadastroVeiculo === 'proprietario') {
      this.abaCadastroVeiculo = 'veiculo';
    }
  }

  proximaAbaEdicaoVeiculo(): void {
    if (this.abaEdicaoVeiculo === 'veiculo') {
      this.abaEdicaoVeiculo = 'proprietario';
      return;
    }

    if (this.abaEdicaoVeiculo === 'proprietario') {
      this.abaEdicaoVeiculo = 'revisao';
    }
  }

  abaAnteriorEdicaoVeiculo(): void {
    if (this.abaEdicaoVeiculo === 'revisao') {
      this.abaEdicaoVeiculo = 'proprietario';
      return;
    }

    if (this.abaEdicaoVeiculo === 'proprietario') {
      this.abaEdicaoVeiculo = 'veiculo';
    }
  }

  get progressoCadastroVeiculo(): number {
    let pontos = 0;
    if (!this.placaCadastroInvalida()) pontos++;
    if (!this.fabricanteCadastroInvalido()) pontos++;
    if (!this.modeloCadastroInvalido()) pontos++;
    if (!this.anoCadastroInvalido()) pontos++;
    if (!this.corCadastroInvalida()) pontos++;
    if (!this.proprietarioCadastroInvalido()) pontos++;
    return Math.round((pontos / 6) * 100);
  }

  get progressoEdicaoVeiculo(): number {
    let pontos = 0;
    if (!this.placaEdicaoInvalida()) pontos++;
    if (!this.fabricanteEdicaoInvalido()) pontos++;
    if (!this.modeloEdicaoInvalido()) pontos++;
    if (!this.anoEdicaoInvalido()) pontos++;
    if (!this.corEdicaoInvalida()) pontos++;
    if (!this.proprietarioEdicaoInvalido()) pontos++;
    return Math.round((pontos / 6) * 100);
  }

  get cadastroVeiculoProntoParaSalvar(): boolean {
    return this.validarCadastroVeiculo() === null;
  }

  get edicaoVeiculoProntaParaSalvar(): boolean {
    return this.validarEdicaoVeiculo() === null;
  }

  get mensagemBloqueioCadastro(): string {
    return this.validarCadastroVeiculo() || '';
  }

  get mensagemBloqueioEdicao(): string {
    return this.validarEdicaoVeiculo() || '';
  }

  dadosVeiculoCadastroPendentes(): boolean {
    return this.placaCadastroInvalida()
      || this.fabricanteCadastroInvalido()
      || this.modeloCadastroInvalido()
      || this.anoCadastroInvalido()
      || this.corCadastroInvalida();
  }

  dadosVeiculoEdicaoPendentes(): boolean {
    return this.placaEdicaoInvalida()
      || this.fabricanteEdicaoInvalido()
      || this.modeloEdicaoInvalido()
      || this.anoEdicaoInvalido()
      || this.corEdicaoInvalida();
  }

  placaCadastroInvalida(): boolean {
    return !this.placaValida(this.novoVeiculo.placa);
  }

  fabricanteCadastroInvalido(): boolean {
    return !this.novoVeiculo.fabricante?.trim();
  }

  modeloCadastroInvalido(): boolean {
    return !this.novoVeiculo.modelo?.trim();
  }

  anoCadastroInvalido(): boolean {
    return !this.novoVeiculo.anoModeloCombustivel?.trim();
  }

  corCadastroInvalida(): boolean {
    return !this.novoVeiculo.cor?.trim();
  }

  proprietarioCadastroInvalido(): boolean {
    return !this.novoVeiculo.idProprietario || !this.buscarUsuarioPorId(this.novoVeiculo.idProprietario);
  }

  whatsappProprietarioCadastroInvalido(): boolean {
    const proprietario = this.proprietarioSelecionadoCadastro();
    return !!proprietario && !this.normalizarTelefoneWhatsapp(proprietario.telefone);
  }

  placaEdicaoInvalida(): boolean {
    return !this.placaValida(this.edit.placa);
  }

  fabricanteEdicaoInvalido(): boolean {
    return !this.edit.fabricante?.trim();
  }

  modeloEdicaoInvalido(): boolean {
    return !this.edit.modelo?.trim();
  }

  anoEdicaoInvalido(): boolean {
    return !this.edit.anoModeloCombustivel?.trim();
  }

  corEdicaoInvalida(): boolean {
    return !this.edit.cor?.trim();
  }

  proprietarioEdicaoInvalido(): boolean {
    return !this.edit.idProprietario || !this.buscarUsuarioPorId(this.edit.idProprietario);
  }

  whatsappProprietarioEdicaoInvalido(): boolean {
    const proprietario = this.proprietarioSelecionadoModal();
    return !!proprietario && !this.normalizarTelefoneWhatsapp(proprietario.telefone);
  }

  private validarCadastroVeiculo(): string | null {
    if (this.placaCadastroInvalida()) return 'Informe uma placa válida com 7 caracteres.';
    if (this.fabricanteCadastroInvalido()) return 'Selecione o fabricante do veículo.';
    if (this.modeloCadastroInvalido()) return 'Selecione o modelo do veículo.';
    if (this.anoCadastroInvalido()) return 'Selecione o ano-modelo e combustível.';
    if (this.corCadastroInvalida()) return 'Informe a cor do veículo.';
    if (this.proprietarioCadastroInvalido()) return 'Selecione o proprietário do veículo.';
    if (this.whatsappProprietarioCadastroInvalido()) return 'O proprietário selecionado não possui telefone válido para WhatsApp.';
    return null;
  }

  private validarEdicaoVeiculo(): string | null {
    if (!this.editId) return 'Não foi possível identificar o veículo em edição.';
    if (this.placaEdicaoInvalida()) return 'Informe uma placa válida com 7 caracteres.';
    if (this.fabricanteEdicaoInvalido()) return 'Selecione o fabricante do veículo.';
    if (this.modeloEdicaoInvalido()) return 'Selecione o modelo do veículo.';
    if (this.anoEdicaoInvalido()) return 'Selecione o ano-modelo e combustível.';
    if (this.corEdicaoInvalida()) return 'Informe a cor do veículo.';
    if (this.proprietarioEdicaoInvalido()) return 'Selecione o proprietário do veículo.';
    if (this.whatsappProprietarioEdicaoInvalido()) return 'O proprietário selecionado não possui telefone válido para WhatsApp.';
    return null;
  }

  private placaValida(placa: any): boolean {
    return this.normalizarPlaca(placa).length === 7;
  }

  salvarCadastroVeiculo(): void {
    const erro = this.validarCadastroVeiculo();

    if (erro) {
      this.mensagemErroModal = erro;
      this.abaCadastroVeiculo = this.dadosVeiculoCadastroPendentes() ? 'veiculo' : 'proprietario';
      return;
    }

    const payload = this.montarPayload(this.novoVeiculo);

    this.veiculoService.cadastrar(payload as Omit<Veiculo, 'id'>).subscribe({
      next: (veiculoCadastrado) => {
        const veiculoNormalizado = this.normalizarVeiculoParaTela({
          ...payload,
          ...veiculoCadastrado,
          idProprietario: payload.idProprietario
        } as Veiculo);

        this.modalCadastroVeiculo?.hide();
        this.mensagemSucesso = 'Veículo cadastrado com sucesso.';
        this.enviarWhatsappCadastroVeiculo(veiculoNormalizado, false);
        this.novoVeiculo = this.criarVeiculoVazio();
        this.recarregar();
      },
      error: (err) => {
        console.error('Erro ao cadastrar veículo:', err);
        this.mensagemErroModal = this.extrairMensagemErro(err, 'Erro ao cadastrar veículo.');
      }
    });
  }

  salvarEdicaoModal(): void {
    const erro = this.validarEdicaoVeiculo();

    if (erro) {
      this.mensagemErroModal = erro;
      this.abaEdicaoVeiculo = this.dadosVeiculoEdicaoPendentes() ? 'veiculo' : 'proprietario';
      return;
    }

    const payload = this.montarPayload(this.edit);

    this.veiculoService.atualizarVeiculo(this.editId!, payload).subscribe({
      next: (atualizado) => {
        const veiculoAtualizado = this.normalizarVeiculoParaTela({
          ...this.edit,
          ...atualizado,
          id: this.editId!,
          idProprietario: payload.idProprietario
        } as Veiculo);

        const idxTodos = this.todos.findIndex(v => v.id === this.editId);
        if (idxTodos > -1) this.todos[idxTodos] = veiculoAtualizado;

        const idxView = this.veiculos.findIndex(v => v.id === this.editId);
        if (idxView > -1) this.veiculos[idxView] = veiculoAtualizado;

        this.modalEdicao?.hide();
        this.cancelarEdicao();
        this.mensagemSucesso = 'Veículo atualizado com sucesso.';
        this.recarregar();
      },
      error: (err) => {
        console.error(err);
        this.mensagemErroModal = this.extrairMensagemErro(err, 'Erro ao salvar alterações do veículo.');
      }
    });
  }

  salvarEdicao(id: number): void {
    if (!this.editId || this.editId !== id) return;
    this.salvarEdicaoModal();
  }

  private montarPayload(origem: Partial<Veiculo>): Partial<Veiculo> {
    return {
      ...origem,
      placa: this.normalizarPlaca(origem.placa),
      fabricante: this.formatarFabricante(origem.fabricante),
      modelo: this.formatarModeloVeiculo(origem.modelo),
      cor: this.capitalizar(origem.cor || ''),
      anoModeloCombustivel: this.formatarAnoCombustivel(origem.anoModeloCombustivel),
      idProprietario: origem.idProprietario != null ? Number(origem.idProprietario) : undefined
    };
  }

  iniciarEdicao(v: Veiculo): void {
    this.abrirModalEdicao(v);
  }

  cancelarEdicao(): void {
    this.editId = null;
    this.edit = {};
    this.dropdownOpenId = null;
    this.cpfFiltroEdit = '';
    this.mensagemErroModal = '';
  }

  abrirConfirmacaoExclusao(veiculo: Veiculo): void {
    this.veiculoAcao = veiculo;
    const el = document.getElementById('modalConfirmacaoVeiculo');
    if (!el) return;
    this.modalConfirmacao = bootstrap.Modal.getOrCreateInstance(el);
    this.modalConfirmacao.show();
  }

  excluir(id?: number): void {
    const veiculo = this.todos.find(v => v.id === id);
    if (!veiculo) return;
    this.abrirConfirmacaoExclusao(veiculo);
  }

  confirmarExclusao(): void {
    if (!this.veiculoAcao?.id) return;

    this.executandoAcao = true;
    const id = this.veiculoAcao.id;

    this.veiculoService.removerVeiculo(id).subscribe({
      next: () => {
        this.todos = this.todos.filter(v => v.id !== id);
        this.veiculos = this.veiculos.filter(v => v.id !== id);
        this.executandoAcao = false;
        this.modalConfirmacao?.hide();
        this.mensagemSucesso = 'Veículo excluído com sucesso.';
        if (this.editId === id) this.cancelarEdicao();
      },
      error: (err) => {
        console.error(err);
        this.executandoAcao = false;
        alert(this.extrairMensagemErro(err, 'Erro ao excluir veículo.'));
      }
    });
  }

  abrirModalSelecaoProprietario(modo?: 'edicao' | 'cadastro'): void {
    if (modo) this.modoProprietarioModal = modo;

    this.cpfFiltroModal = '';
    this.usuariosFiltradosModal = [...this.usuarios];

    /*
     * O modal de cadastro/edição é ocultado apenas para evitar sobreposição visual
     * de dois modais Bootstrap. Os dados preenchidos continuam preservados nos
     * objetos novoVeiculo/edit. Ao selecionar ou cancelar, o modal de origem é
     * aberto novamente pelo método reabrirModalOrigemProprietario().
     */
    this.modoProprietarioModal === 'cadastro'
      ? this.modalCadastroVeiculo?.hide()
      : this.modalEdicao?.hide();

    setTimeout(() => {
      const el = document.getElementById('modalSelecionarProprietario');
      if (!el) {
        console.error('Modal modalSelecionarProprietario não encontrado.');
        return;
      }

      this.modalProprietario = bootstrap.Modal.getOrCreateInstance(el, {
        backdrop: 'static',
        keyboard: false
      });
      this.modalProprietario.show();
    }, 250);
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
      const telefoneBruto = u.telefone ?? u.celular ?? u.whatsapp ?? '';
      return [
        this.formatarCPF(u.cpf),
        u.cpf,
        u.nome,
        u.nomeSocial,
        u.nome_social,
        u.email,
        this.formatarTelefone(telefoneBruto),
        u.status,
        u.tipoDoAcesso,
        u.tipo_do_acesso
      ].some(valor => this.normalizarTexto(valor).includes(termoTexto))
      || (!!termoNumeros && [
        this.onlyDigits(u.cpf),
        this.onlyDigits(telefoneBruto)
      ].some(valor => valor.includes(termoNumeros)));
    });
  }

  selecionarProprietarioModal(u: Usuario): void {
    if (!u?.id) return;

    if (this.modoProprietarioModal === 'cadastro') {
      this.novoVeiculo.idProprietario = Number(u.id);
      this.abaCadastroVeiculo = 'proprietario';
    } else {
      this.edit.idProprietario = Number(u.id);
      this.abaEdicaoVeiculo = 'proprietario';
    }

    this.modalProprietario?.hide();
    this.reabrirModalOrigemProprietario();
  }

  cancelarSelecaoProprietario(): void {
    this.modalProprietario?.hide();
    this.reabrirModalOrigemProprietario();
  }

  private reabrirModalOrigemProprietario(): void {
    setTimeout(() => {
      const modalId = this.modoProprietarioModal === 'cadastro'
        ? 'modalCadastroVeiculo'
        : 'modalEdicaoVeiculo';
      const el = document.getElementById(modalId);

      if (!el) {
        console.error(`Modal de origem ${modalId} não encontrado.`);
        return;
      }

      const modal = bootstrap.Modal.getOrCreateInstance(el);

      if (this.modoProprietarioModal === 'cadastro') {
        this.modalCadastroVeiculo = modal;
      } else {
        this.modalEdicao = modal;
      }

      modal.show();
    }, 250);
  }

  proprietarioSelecionadoModal(): Usuario | undefined {
    const id = this.edit.idProprietario;
    if (id == null) return undefined;
    return this.usuariosById.get(Number(id));
  }

  cpfProprietarioSelecionadoModal(): string {
    return this.formatarCPF(this.proprietarioSelecionadoModal()?.cpf) || '';
  }

  nomeProprietarioSelecionadoModal(): string {
    return this.proprietarioSelecionadoModal()?.nome || '';
  }

  emailProprietarioSelecionadoModal(): string {
    return this.proprietarioSelecionadoModal()?.email || '';
  }

  telefoneProprietarioSelecionadoModal(): string {
    return this.proprietarioSelecionadoModal()?.telefone || '';
  }

  proprietarioSelecionadoCadastro(): Usuario | undefined {
    const id = this.novoVeiculo.idProprietario;
    if (id == null) return undefined;
    return this.usuariosById.get(Number(id));
  }

  cpfProprietarioSelecionadoCadastro(): string {
    return this.formatarCPF(this.proprietarioSelecionadoCadastro()?.cpf) || '';
  }

  nomeProprietarioSelecionadoCadastro(): string {
    return this.proprietarioSelecionadoCadastro()?.nome || '';
  }

  emailProprietarioSelecionadoCadastro(): string {
    return this.proprietarioSelecionadoCadastro()?.email || '';
  }

  telefoneProprietarioSelecionadoCadastro(): string {
    return this.proprietarioSelecionadoCadastro()?.telefone || '';
  }

  toggleUsersDropdownFor(rowId: number, open?: boolean): void {
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
    this.edit.idProprietario = Number(u.id);
    this.dropdownOpenId = null;
  }

  cpfSelecionadoPara(v: Veiculo): string {
    const chosenId = this.editId === v.id && this.edit.idProprietario != null
      ? this.edit.idProprietario
      : v.idProprietario;
    const u = chosenId == null ? undefined : this.usuariosById.get(Number(chosenId));
    return this.formatarCPF(u?.cpf) || '';
  }

  async fipeCarregarMarcas(): Promise<void> {
    if (this.marcas.length > 0) return;

    this.fipeErro = '';
    this.fipeCarregando.marcas = true;

    try {
      const lista = await firstValueFrom(
        this.http.get<FipeBrand[]>(`${FIPE_BASE}/${this.tipo}/brands`)
      );

      this.marcas = (lista ?? []).sort((a, b) =>
        this.formatarFabricante(a.name).localeCompare(this.formatarFabricante(b.name), 'pt-BR')
      );
    } catch (err) {
      console.error('Erro ao carregar montadoras FIPE:', err);
      this.marcas = [];
      this.fipeErro = 'Falha ao carregar montadoras da Tabela FIPE.';
    } finally {
      this.fipeCarregando.marcas = false;
    }
  }

  private async fipeCarregarModelosDaMarca(marcaCode: string, contexto: 'edicao' | 'cadastro'): Promise<void> {
    if (!marcaCode) {
      contexto === 'cadastro' ? this.modelosCadastro = [] : this.modelos = [];
      return;
    }

    this.fipeErro = '';
    this.fipeCarregando.modelos = true;

    try {
      const resp = await firstValueFrom(
        this.http.get<any>(`${FIPE_BASE}/${this.tipo}/brands/${marcaCode}/models`)
      );
      const arr = Array.isArray(resp) ? resp : (resp?.models ?? resp?.modelos ?? []);
      const lista = (arr ?? []).sort((a: FipeModel, b: FipeModel) => a.name.localeCompare(b.name, 'pt-BR'));

      contexto === 'cadastro' ? this.modelosCadastro = lista : this.modelos = lista;
    } catch (err) {
      console.error('Erro ao carregar modelos FIPE:', err);
      contexto === 'cadastro' ? this.modelosCadastro = [] : this.modelos = [];
      this.fipeErro = 'Falha ao carregar modelos da Tabela FIPE.';
    } finally {
      this.fipeCarregando.modelos = false;
    }
  }

  private async fipeCarregarAnosDoModelo(marcaCode: string, modeloCode: string, contexto: 'edicao' | 'cadastro'): Promise<void> {
    if (!marcaCode || !modeloCode) {
      contexto === 'cadastro' ? this.anosCadastro = [] : this.anos = [];
      return;
    }

    this.fipeErro = '';
    this.fipeCarregando.anos = true;

    try {
      const lista = await firstValueFrom(
        this.http.get<FipeYear[]>(`${FIPE_BASE}/${this.tipo}/brands/${marcaCode}/models/${modeloCode}/years`)
      );

      contexto === 'cadastro' ? this.anosCadastro = lista ?? [] : this.anos = lista ?? [];
    } catch (err) {
      console.error('Erro ao carregar anos FIPE:', err);
      contexto === 'cadastro' ? this.anosCadastro = [] : this.anos = [];
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
    this.edit.modelo = '';
    this.edit.anoModeloCombustivel = '';

    if (!this.marcaSelCode) {
      this.edit.fabricante = '';
      return;
    }

    const marcaSelecionada = this.marcas.find(m => String(m.code) === String(this.marcaSelCode));
    this.edit.fabricante = marcaSelecionada ? this.formatarFabricante(marcaSelecionada.name) : '';
    await this.fipeCarregarModelosDaMarca(this.marcaSelCode, 'edicao');
  }

  async onChangeModelo(code: string): Promise<void> {
    this.modeloSelCode = code || '';
    this.anoSelCode = '';
    this.anos = [];
    this.edit.anoModeloCombustivel = '';

    if (!this.marcaSelCode || !this.modeloSelCode) {
      this.edit.modelo = '';
      return;
    }

    const modeloSelecionado = this.modelos.find(m => String(m.code) === String(this.modeloSelCode));
    this.edit.modelo = modeloSelecionado ? this.formatarModeloVeiculo(modeloSelecionado.name) : '';
    await this.fipeCarregarAnosDoModelo(this.marcaSelCode, this.modeloSelCode, 'edicao');
  }

  async onChangeAnoModeloCombustivel(code: string): Promise<void> {
    this.anoSelCode = code || '';
    this.edit.anoModeloCombustivel = '';

    if (!this.marcaSelCode || !this.modeloSelCode || !this.anoSelCode) return;

    this.fipeErro = '';
    this.fipeCarregando.detalhes = true;

    try {
      const det = await firstValueFrom(
        this.http.get<FipeDetails>(`${FIPE_BASE}/${this.tipo}/brands/${this.marcaSelCode}/models/${this.modeloSelCode}/years/${this.anoSelCode}`)
      );

      if (det?.brand) this.edit.fabricante = this.formatarFabricante(det.brand);
      if (det?.model) this.edit.modelo = this.formatarModeloVeiculo(det.model);
      this.edit.anoModeloCombustivel = this.formatarAnoCombustivel(`${det?.modelYear ?? ''} | ${det?.fuel ?? ''}`);
    } catch (err) {
      console.error('Erro ao buscar detalhes FIPE:', err);
      this.fipeErro = 'Falha ao buscar detalhes do veículo na Tabela FIPE.';
    } finally {
      this.fipeCarregando.detalhes = false;
    }
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

    const marcaSelecionada = this.marcas.find(m => String(m.code) === String(this.marcaCadastroSelCode));
    this.novoVeiculo.fabricante = marcaSelecionada ? this.formatarFabricante(marcaSelecionada.name) : '';
    await this.fipeCarregarModelosDaMarca(this.marcaCadastroSelCode, 'cadastro');
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

    const modeloSelecionado = this.modelosCadastro.find(m => String(m.code) === String(this.modeloCadastroSelCode));
    this.novoVeiculo.modelo = modeloSelecionado ? this.formatarModeloVeiculo(modeloSelecionado.name) : '';
    await this.fipeCarregarAnosDoModelo(this.marcaCadastroSelCode, this.modeloCadastroSelCode, 'cadastro');
  }

  async onChangeAnoModeloCombustivelCadastro(code: string): Promise<void> {
    this.anoCadastroSelCode = code || '';
    this.novoVeiculo.anoModeloCombustivel = '';

    if (!this.marcaCadastroSelCode || !this.modeloCadastroSelCode || !this.anoCadastroSelCode) return;

    this.fipeErro = '';
    this.fipeCarregando.detalhes = true;

    try {
      const det = await firstValueFrom(
        this.http.get<FipeDetails>(`${FIPE_BASE}/${this.tipo}/brands/${this.marcaCadastroSelCode}/models/${this.modeloCadastroSelCode}/years/${this.anoCadastroSelCode}`)
      );

      if (det?.brand) this.novoVeiculo.fabricante = this.formatarFabricante(det.brand);
      if (det?.model) this.novoVeiculo.modelo = this.formatarModeloVeiculo(det.model);
      this.novoVeiculo.anoModeloCombustivel = this.formatarAnoCombustivel(`${det?.modelYear ?? ''} | ${det?.fuel ?? ''}`);
    } catch (err) {
      console.error('Erro ao buscar detalhes FIPE no cadastro:', err);
      this.fipeErro = 'Falha ao buscar detalhes do veículo na Tabela FIPE.';
    } finally {
      this.fipeCarregando.detalhes = false;
    }
  }

  private encontrarMarcaPorNome(nome?: string): FipeBrand | undefined {
    const alvo = this.normalizarFipeTexto(nome);
    if (!alvo) return undefined;

    return this.marcas.find(m => {
      const nomeOriginal = this.normalizarFipeTexto(m.name);
      const nomeFormatado = this.normalizarFipeTexto(this.formatarFabricante(m.name));
      return nomeOriginal === alvo
        || nomeFormatado === alvo
        || nomeOriginal.includes(alvo)
        || alvo.includes(nomeOriginal)
        || nomeFormatado.includes(alvo)
        || alvo.includes(nomeFormatado);
    });
  }

  private encontrarModeloPorNome(nome?: string, lista: FipeModel[] = this.modelos): FipeModel | undefined {
    const alvo = this.normalizarFipeTexto(nome);
    if (!alvo) return undefined;

    const exato = lista.find(m => this.normalizarFipeTexto(m.name) === alvo);
    if (exato) return exato;

    return lista.find(m => {
      const nomeModelo = this.normalizarFipeTexto(m.name);
      return nomeModelo.includes(alvo) || alvo.includes(nomeModelo);
    });
  }

  private encontrarAnoPorDescricao(descricao?: string, lista: FipeYear[] = this.anos): FipeYear | undefined {
    const alvo = this.normalizarFipeTexto(descricao);
    if (!alvo) return undefined;

    const exato = lista.find(a => this.normalizarFipeTexto(a.name) === alvo);
    if (exato) return exato;

    return lista.find(a => {
      const nomeAno = this.normalizarFipeTexto(a.name);
      return nomeAno.includes(alvo) || alvo.includes(nomeAno);
    });
  }

  formatarPlaca(v: any): string {
    const s = this.normalizarPlaca(v);
    if (!s) return '';
    if (s.length <= 3) return s;
    return `${s.slice(0, 3)}-${s.slice(3, 7)}`;
  }

  normalizarPlaca(v: any): string {
    return (v ?? '').toString().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 7);
  }

  aplicarMascaraPlacaCadastro(): void {
    this.novoVeiculo.placa = this.formatarPlaca(this.novoVeiculo.placa);
  }

  aplicarMascaraPlacaEdicao(): void {
    this.edit.placa = this.formatarPlaca(this.edit.placa);
  }

  normalizarCorCadastro(): void {
    this.novoVeiculo.cor = this.capitalizar(this.novoVeiculo.cor || '');
  }

  normalizarCorEdicao(): void {
    this.edit.cor = this.capitalizar(this.edit.cor || '');
  }

  private onlyDigits(v: any): string {
    return (v ?? '').toString().replace(/\D/g, '');
  }

  public formatarCPF(cpf?: string): string {
    const d = this.onlyDigits(cpf);
    if (d.length !== 11) return cpf ?? '';
    return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9, 11)}`;
  }

  formatarTelefone(tel: string | null | undefined): string {
    const n = this.onlyDigits(tel);
    if (!n) return '';

    const local = n.startsWith('55') && n.length >= 12 ? n.slice(2) : n;

    if (local.length === 11) {
      return `+55 (${local.slice(0, 2)}) ${local.slice(2, 7)}-${local.slice(7)}`;
    }

    if (local.length === 10) {
      return `+55 (${local.slice(0, 2)}) ${local.slice(2, 6)}-${local.slice(6)}`;
    }

    if (local.length === 9) {
      return `+55 (11) ${local.slice(0, 5)}-${local.slice(5)}`;
    }

    if (local.length === 8) {
      return `+55 (11) ${local.slice(0, 4)}-${local.slice(4)}`;
    }

    return n;
  }

  formatarFabricante(fabricante: string | null | undefined): string {
    const textoOriginal = (fabricante ?? '').toString().replace(/\s+/g, ' ').trim();
    if (!textoOriginal) return '';

    const textoComSeparadorNormalizado = textoOriginal.replace(/\s*-\s*/g, ' - ');
    const textoNormalizado = this.normalizarTexto(textoComSeparadorNormalizado);

    if (
      textoNormalizado === 'vw'
      || textoNormalizado.includes('volkswagen')
      || textoNormalizado.startsWith('vw ')
      || textoNormalizado.startsWith('vw -')
    ) {
      return 'VW - Volkswagen';
    }

    const siglasConhecidas = ['GM', 'BMW', 'GWM', 'BYD', 'JAC'];
    const matchComSeparador = textoComSeparadorNormalizado.match(/^([A-Za-z]{2,4})\s*-\s*(.+)$/);

    if (matchComSeparador) {
      const sigla = matchComSeparador[1].toUpperCase();
      const nome = this.capitalizar(matchComSeparador[2]);
      if (siglasConhecidas.includes(sigla)) return nome ? `${sigla} - ${nome}` : sigla;
    }

    const textoUpper = textoOriginal.toUpperCase();
    for (const sigla of siglasConhecidas) {
      if (textoUpper === sigla) return sigla;
      if (textoUpper.startsWith(`${sigla} `) || textoUpper.startsWith(`${sigla}-`)) {
        const restante = textoOriginal.substring(sigla.length).replace(/^[-\s]+/, '').trim();
        return restante ? `${sigla} - ${this.capitalizar(restante)}` : sigla;
      }
    }

    return this.capitalizar(textoComSeparadorNormalizado);
  }

  formatarModeloVeiculo(modelo: string | null | undefined): string {
    return this.capitalizar(modelo ?? '');
  }

  formatarAnoCombustivel(valor: string | null | undefined): string {
    return (valor ?? '').toString().replace('/', '|').replace(/\s*\|\s*/g, ' | ').replace(/\s+/g, ' ').trim();
  }

  capitalizar(s: string | null | undefined): string {
    const texto = (s ?? '').toString().replace(/\s+/g, ' ').trim();
    if (!texto) return '';

    return texto
      .split(' ')
      .map(parte => {
        if (!parte) return '';
        if (/^(i|ii|iii|iv|v|vi|vii|viii|ix|x)$/i.test(parte)) return parte.toUpperCase();
        const minusculo = parte.toLowerCase();
        return minusculo.charAt(0).toUpperCase() + minusculo.slice(1);
      })
      .join(' ');
  }

  private normalizarTexto(valor: any): string {
    return (valor ?? '').toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  }

  private normalizarFipeTexto(valor: any): string {
    return (valor ?? '').toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  }

  private buscarUsuarioPorId(idProprietario?: number): Usuario | undefined {
    if (idProprietario == null) return undefined;
    return this.usuariosById.get(Number(idProprietario));
  }

  private normalizarTelefoneWhatsapp(telefone?: string): string {
    const digitos = this.onlyDigits(telefone);
    if (!digitos) return '';
    if (digitos.startsWith('55') && digitos.length >= 12) return digitos;
    if (digitos.length === 10 || digitos.length === 11) return `55${digitos}`;
    if (digitos.length === 8 || digitos.length === 9) return `5511${digitos}`;
    return '';
  }

  private enviarWhatsappCadastroVeiculo(veiculo: Partial<Veiculo>, exibirAlertas = false): void {
    const proprietario = this.buscarUsuarioPorId(veiculo.idProprietario);
    if (!proprietario) {
      console.warn('Proprietário não encontrado para envio de WhatsApp.', veiculo);
      if (exibirAlertas) alert('Proprietário não encontrado para envio de WhatsApp.');
      return;
    }

    const telefoneWhatsapp = this.normalizarTelefoneWhatsapp(proprietario.telefone);
    if (!telefoneWhatsapp) {
      console.warn('Proprietário sem telefone cadastrado.', proprietario);
      if (exibirAlertas) alert('O proprietário selecionado não possui telefone cadastrado.');
      return;
    }

    this.whatsappService.enviarMensagemCadastroVeiculo({
      telefone: telefoneWhatsapp,
      template: 'cadastro_veiculo',
      languageCode: 'pt_BR',
      parametrosBody: [
        proprietario.nome || 'Cliente',
        this.formatarModeloVeiculo(veiculo.modelo || 'Veículo')
      ]
    }).subscribe({
      next: () => {
        if (exibirAlertas) alert('Mensagem de WhatsApp enviada com sucesso.');
      },
      error: (err) => {
        console.error('Erro ao enviar mensagem pelo WhatsApp:', err);
        if (exibirAlertas) alert('Veículo cadastrado, mas houve erro ao enviar a mensagem pelo WhatsApp.');
      }
    });
  }

  private extrairMensagemErro(erro: any, mensagemPadrao: string): string {
    if (typeof erro?.error === 'string') return erro.error;
    if (typeof erro?.error?.mensagem === 'string') return erro.error.mensagem;
    if (typeof erro?.message === 'string') return erro.message;
    return mensagemPadrao;
  }
}
