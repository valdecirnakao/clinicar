import { Component, HostListener, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { UsuarioService } from '../exibe-usuario/exibe-usuario.service';
import { WhatsappCloudService } from '../../../services/whatsapp-cloud.service';

declare var bootstrap: any;

export interface Usuario {
  id?: number;
  cpf: string;
  nome: string;
  nome_social: string;
  senha: string;
  confirmarSenha: string;
  telefone: string;
  email: string;
  nascimento: string | Date;
  cep: string;
  logradouro: string;
  numero_endereco: string;
  complemento_endereco?: string;
  bairro: string;
  cidade: string;
  estado: string;
  tipo_do_acesso: string;
  status: string;
  mfaAtivo?: boolean;
  mfaTipo?: string;
  mfaStatus?: string;
  criadoEm?: string;
  atualizadoEm?: string;
}

type ColunaOrdenacao = 'cpf' | 'nome' | 'email' | 'telefone' | 'status' | 'mfa' | 'tipo';
type DirecaoOrdenacao = 'asc' | 'desc';
type TipoConfirmacao = 'resetar-mfa' | 'alterar-status' | 'whatsapp';
type AbaEdicaoUsuario = 'dados' | 'contato' | 'endereco' | 'seguranca';
type AbaCadastroUsuario = 'dados' | 'contato' | 'endereco' | 'seguranca';

interface FiltroAplicado {
  tipo: 'busca' | 'status' | 'tipoAcesso';
  rotulo: string;
  valor: string;
}

interface AcaoConfirmacao {
  tipo: TipoConfirmacao;
  usuario: Usuario;
  titulo: string;
  mensagem: string;
  detalhe?: string;
  icone: string;
  confirmarLabel: string;
  confirmarClasse: string;
  novoStatus?: string;
}

@Component({
  selector: 'app-exibe-usuario',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './exibe-usuario.component.html',
  styleUrls: ['./exibe-usuario.component.css']
})
export class ExibeUsuarioComponent implements OnInit {
  camposInvalidos: string[] = [];
  camposInvalidosEdicao: string[] = [];

  novoUsuario: Partial<Usuario> = {};
  editId: number | null = null;
  edit: Partial<Usuario> = {};
  private editOriginal: Partial<Usuario> = {};
  abaEdicaoUsuario: AbaEdicaoUsuario = 'dados';
  abaCadastroUsuario: AbaCadastroUsuario = 'dados';
  mensagemErroCadastro = '';
  mensagemErroModal = '';
  cepCadastroCarregando = false;
  cepCadastroErro = '';

  modalCadastro: any;
  modalEdicao: any;
  modalDetalhes: any;
  modalConfirmacao: any;

  usuarioDetalhe: Usuario | null = null;
  confirmacao: AcaoConfirmacao | null = null;
  acaoEmExecucao = false;

  usuarios: Usuario[] = [];
  private todos: Usuario[] = [];

  loading = false;
  errorMsg = '';
  resetandoMfaId: number | null = null;

  termoBusca = '';
  filtroStatus = '';
  filtroTipoAcesso = '';

  statusFiltroAberto = false;
  tipoAcessoFiltroAberto = false;
  acoesDropdownAbertoId: number | null = null;

  colunaOrdenacao: ColunaOrdenacao = 'nome';
  direcaoOrdenacao: DirecaoOrdenacao = 'asc';

  paginaAtual = 1;
  itensPorPagina = 10;
  opcoesItensPorPagina = [5, 10, 20, 50];

  mostrarSenha = false;

  readonly statusOptions = [
    { valor: '', rotulo: 'Todos' },
    { valor: 'ativo', rotulo: 'Ativo' },
    { valor: 'inativo', rotulo: 'Inativo' }
  ];

  readonly tipoAcessoOptions = [
    { valor: '', rotulo: 'Todos' },
    { valor: 'administrador', rotulo: 'Administrador' },
    { valor: 'cliente', rotulo: 'Cliente' },
    { valor: 'colaborador', rotulo: 'Colaborador' }
  ];

  constructor(
    private readonly usuarioService: UsuarioService,
    private readonly whatsappCloudService: WhatsappCloudService,
    private readonly http: HttpClient,
    private readonly location: Location
  ) { }

  ngOnInit(): void {
    this.recarregar();
  }

  @HostListener('document:click')
  fecharDropdownsAoClicarFora(): void {
    this.statusFiltroAberto = false;
    this.tipoAcessoFiltroAberto = false;
    this.acoesDropdownAbertoId = null;
  }

  recarregar(): void {
    this.loading = true;
    this.errorMsg = '';

    this.usuarioService.listarTodos().subscribe({
      next: (lista) => {
        this.todos = (lista || []).map(usuario => this.normalizarUsuarioParaTela(usuario));
        this.usuarios = [...this.todos];
        this.paginaAtual = 1;
        this.loading = false;
        this.cancelarEdicao();
      },
      error: (err) => {
        console.error(err);
        this.loading = false;
        this.errorMsg = 'Falha ao carregar usuários.';
      }
    });
  }

  filtrar(term: string): void {
    this.termoBusca = term ?? '';
    this.aoAlterarFiltros();
  }

  aoAlterarFiltros(): void {
    this.paginaAtual = 1;
  }

  aoAlterarItensPorPagina(): void {
    this.paginaAtual = 1;
    this.ajustarPaginaAtual();
  }

  get possuiFiltrosAplicados(): boolean {
    return !!String(this.termoBusca || '').trim() || !!this.filtroStatus || !!this.filtroTipoAcesso;
  }

  get filtrosAplicados(): FiltroAplicado[] {
    const filtros: FiltroAplicado[] = [];

    const busca = String(this.termoBusca || '').trim();
    if (busca) {
      filtros.push({ tipo: 'busca', rotulo: 'Busca', valor: busca });
    }

    if (this.filtroStatus) {
      filtros.push({ tipo: 'status', rotulo: 'Status', valor: this.rotuloFiltroStatus() });
    }

    if (this.filtroTipoAcesso) {
      filtros.push({ tipo: 'tipoAcesso', rotulo: 'Tipo de acesso', valor: this.rotuloFiltroTipoAcesso() });
    }

    return filtros;
  }

  limparFiltros(): void {
    this.termoBusca = '';
    this.filtroStatus = '';
    this.filtroTipoAcesso = '';
    this.paginaAtual = 1;
  }

  removerFiltro(tipo: FiltroAplicado['tipo']): void {
    if (tipo === 'busca') {
      this.termoBusca = '';
    }

    if (tipo === 'status') {
      this.filtroStatus = '';
    }

    if (tipo === 'tipoAcesso') {
      this.filtroTipoAcesso = '';
    }

    this.aoAlterarFiltros();
  }

  get usuariosFiltrados(): Usuario[] {
    const termo = this.normalizarTexto(this.termoBusca);
    const termoNumeros = this.onlyDigits(this.termoBusca);
    const status = this.normalizarTexto(this.filtroStatus);
    const tipoAcesso = this.normalizarTexto(this.filtroTipoAcesso);

    const filtrados = this.todos.filter(usuario => {
      const statusUsuario = this.normalizarTexto(usuario.status || '');
      const tipoUsuario = this.normalizarTexto(usuario.tipo_do_acesso || '');

      const passouStatus = !status || statusUsuario === status;
      const passouTipoAcesso = !tipoAcesso || tipoUsuario === tipoAcesso;

      if (!passouStatus || !passouTipoAcesso) {
        return false;
      }

      if (!termo && !termoNumeros) {
        return true;
      }

      const cpfCnpjFormatado = this.formatarCpfCnpj(usuario.cpf);
      const telefoneFormatado = this.exibirTelefoneFormatado(usuario.telefone);
      const conteudoTexto = [
        usuario.nome,
        usuario.nome_social,
        usuario.email,
        usuario.status,
        usuario.tipo_do_acesso,
        cpfCnpjFormatado,
        telefoneFormatado,
        this.mfaDescricao(usuario)
      ].map(valor => this.normalizarTexto(valor)).join(' ');

      const conteudoNumerico = [
        usuario.cpf,
        usuario.telefone,
        cpfCnpjFormatado,
        telefoneFormatado
      ].map(valor => this.onlyDigits(valor)).join(' ');

      return conteudoTexto.includes(termo) || (!!termoNumeros && conteudoNumerico.includes(termoNumeros));
    });

    return this.ordenarUsuarios(filtrados);
  }

  get totalRegistrosFiltrados(): number {
    return this.usuariosFiltrados.length;
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

  get usuariosPaginados(): Usuario[] {
    this.ajustarPaginaAtual();

    const inicio = (this.paginaAtual - 1) * this.itensPorPagina;
    const fim = inicio + this.itensPorPagina;

    return this.usuariosFiltrados.slice(inicio, fim);
  }

  get totalUsuarios(): number {
    return this.todos.length;
  }

  get totalAtivos(): number {
    return this.todos.filter(usuario => this.normalizarTexto(usuario.status) === 'ativo').length;
  }

  get totalInativos(): number {
    return this.todos.filter(usuario => this.normalizarTexto(usuario.status) === 'inativo').length;
  }

  get totalMfaAtivo(): number {
    return this.todos.filter(usuario => !!usuario.mfaAtivo).length;
  }

  get totalWhatsappValido(): number {
    return this.todos.filter(usuario => this.telefoneWhatsappValido(usuario.telefone)).length;
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
    const paginas: number[] = [];

    const inicio = Math.max(1, atual - 2);
    const fim = Math.min(total, atual + 2);

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

  alternarOrdenacao(coluna: ColunaOrdenacao): void {
    if (this.colunaOrdenacao === coluna) {
      this.direcaoOrdenacao = this.direcaoOrdenacao === 'asc' ? 'desc' : 'asc';
    } else {
      this.colunaOrdenacao = coluna;
      this.direcaoOrdenacao = 'asc';
    }

    this.paginaAtual = 1;
  }

  iconeOrdenacao(coluna: ColunaOrdenacao): string {
    if (this.colunaOrdenacao !== coluna) {
      return 'bi-arrow-down-up';
    }

    return this.direcaoOrdenacao === 'asc' ? 'bi-sort-alpha-down' : 'bi-sort-alpha-up';
  }

  tituloOrdenacao(coluna: ColunaOrdenacao): string {
    if (this.colunaOrdenacao !== coluna) {
      return 'Ordenar coluna';
    }

    return this.direcaoOrdenacao === 'asc' ? 'Ordenação crescente' : 'Ordenação decrescente';
  }

  private ordenarUsuarios(lista: Usuario[]): Usuario[] {
    const direcao = this.direcaoOrdenacao === 'asc' ? 1 : -1;

    return [...lista].sort((a, b) => {
      const valorA = this.valorOrdenacao(a, this.colunaOrdenacao);
      const valorB = this.valorOrdenacao(b, this.colunaOrdenacao);

      if (valorA < valorB) {
        return -1 * direcao;
      }

      if (valorA > valorB) {
        return 1 * direcao;
      }

      return 0;
    });
  }

  private valorOrdenacao(usuario: Usuario, coluna: ColunaOrdenacao): string {
    if (coluna === 'cpf') {
      return this.onlyDigits(usuario.cpf).padStart(14, '0');
    }

    if (coluna === 'nome') {
      return this.normalizarTexto(usuario.nome || usuario.nome_social || '');
    }

    if (coluna === 'email') {
      return this.normalizarTexto(usuario.email);
    }

    if (coluna === 'telefone') {
      return this.onlyDigits(usuario.telefone).padStart(13, '0');
    }

    if (coluna === 'status') {
      return this.normalizarTexto(usuario.status);
    }

    if (coluna === 'mfa') {
      return this.normalizarTexto(this.mfaDescricao(usuario));
    }

    if (coluna === 'tipo') {
      return this.normalizarTexto(usuario.tipo_do_acesso);
    }

    return '';
  }

  alternarFiltroStatus(event: Event): void {
    event.stopPropagation();
    this.tipoAcessoFiltroAberto = false;
    this.acoesDropdownAbertoId = null;
    this.statusFiltroAberto = !this.statusFiltroAberto;
  }

  selecionarFiltroStatus(status: string): void {
    this.filtroStatus = status;
    this.statusFiltroAberto = false;
    this.aoAlterarFiltros();
  }

  rotuloFiltroStatus(): string {
    const option = this.statusOptions.find(item => item.valor === this.filtroStatus);
    return option?.rotulo || 'Todos';
  }

  alternarFiltroTipoAcesso(event: Event): void {
    event.stopPropagation();
    this.statusFiltroAberto = false;
    this.acoesDropdownAbertoId = null;
    this.tipoAcessoFiltroAberto = !this.tipoAcessoFiltroAberto;
  }

  selecionarFiltroTipoAcesso(tipo: string): void {
    this.filtroTipoAcesso = tipo;
    this.tipoAcessoFiltroAberto = false;
    this.aoAlterarFiltros();
  }

  rotuloFiltroTipoAcesso(): string {
    const option = this.tipoAcessoOptions.find(item => item.valor === this.filtroTipoAcesso);
    return option?.rotulo || 'Todos';
  }

  alternarMenuAcoes(event: Event, usuario: Usuario): void {
    event.stopPropagation();
    this.statusFiltroAberto = false;
    this.tipoAcessoFiltroAberto = false;
    this.acoesDropdownAbertoId = this.acoesDropdownAbertoId === usuario.id ? null : usuario.id ?? null;
  }

  fecharMenuAcoes(): void {
    this.acoesDropdownAbertoId = null;
  }

  trackByUsuario = (_: number, usuario: Usuario) => usuario.id ?? usuario.cpf;

  iniciarEdicao(usuario: Usuario): void {
    this.editId = usuario.id ?? null;
    this.edit = {
      ...usuario,
      nascimento: this.asInputDateString(usuario.nascimento)
    };
    this.editOriginal = { ...this.edit };
    this.camposInvalidosEdicao = [];
    this.mensagemErroModal = '';
    this.abaEdicaoUsuario = 'dados';
  }

  cancelarEdicao(): void {
    this.editId = null;
    this.edit = {};
    this.editOriginal = {};
    this.camposInvalidosEdicao = [];
    this.mensagemErroModal = '';
    this.abaEdicaoUsuario = 'dados';
  }

  abrirDetalhes(usuario: Usuario): void {
    this.usuarioDetalhe = usuario;
    this.fecharMenuAcoes();

    const el = document.getElementById('modalDetalhesUsuario');

    if (!el) {
      console.error('Modal modalDetalhesUsuario não encontrado.');
      return;
    }

    this.modalDetalhes = bootstrap.Modal.getOrCreateInstance(el);
    this.modalDetalhes.show();
  }

  abrirModalEdicao(usuario: Usuario): void {
    this.fecharMenuAcoes();
    this.editId = usuario.id ?? null;
    this.edit = {
      ...usuario,
      nascimento: this.asInputDateString(usuario.nascimento)
    };
    this.editOriginal = { ...this.edit };
    this.camposInvalidosEdicao = [];
    this.mensagemErroModal = '';
    this.abaEdicaoUsuario = 'dados';

    const el = document.getElementById('modalEdicaoUsuario');

    if (!el) {
      console.error('Modal modalEdicaoUsuario não encontrado.');
      return;
    }

    this.modalEdicao = bootstrap.Modal.getOrCreateInstance(el);
    this.modalEdicao.show();
  }

  salvarEdicao(id: number): void {
    if (!this.editId || this.editId !== id) {
      return;
    }

    const payload = this.montarPayloadUsuario(this.edit, false);

    this.usuarioService.atualizarUsuario(id, payload).subscribe({
      next: () => {
        this.cancelarEdicao();
        this.recarregar();
      },
      error: (err) => {
        console.error('Erro ao salvar alterações:', err);

        const mensagem = this.extrairMensagemErro(
          err,
          'Erro ao salvar alterações. Verifique os dados informados.'
        );

        this.aplicarErroUsuario(mensagem, false);
        alert(mensagem);
      }
    });
  }

  salvarEdicaoModal(): void {
    if (!this.editId) {
      return;
    }

    const erroValidacao = this.validarEdicaoUsuario();

    if (erroValidacao) {
      this.mensagemErroModal = erroValidacao;
      return;
    }

    this.mensagemErroModal = '';
    this.formatarCamposEdicaoAntesSalvar();

    const payload = this.montarPayloadUsuario(this.edit, false);

    this.usuarioService.atualizarUsuario(this.editId, payload).subscribe({
      next: () => {
        this.modalEdicao?.hide();
        this.cancelarEdicao();
        alert('Usuário atualizado com sucesso.');
        this.recarregar();
      },
      error: (err) => {
        console.error('Erro ao salvar alterações do usuário:', err);

        this.mensagemErroModal = this.extrairMensagemErro(
          err,
          'Erro ao salvar alterações do usuário. Verifique os dados informados.'
        );

        this.aplicarErroUsuario(this.mensagemErroModal, false);
      }
    });
  }


  trocarAbaEdicaoUsuario(aba: AbaEdicaoUsuario): void {
    this.abaEdicaoUsuario = aba;
  }

  campoEdicaoInvalido(campo: string): boolean {
    return this.camposInvalidosEdicao.includes(campo);
  }

  limparCampoEdicaoInvalido(campo: string): void {
    if (!this.camposInvalidosEdicao.includes(campo)) {
      return;
    }

    this.camposInvalidosEdicao = this.camposInvalidosEdicao.filter(item => item !== campo);

    if (!this.camposInvalidosEdicao.length) {
      this.mensagemErroModal = '';
    }
  }

  private validarEdicaoUsuario(): string | null {
    const camposObrigatorios = [
      'cpf',
      'nome',
      'telefone',
      'email',
      'nascimento',
      'cep',
      'logradouro',
      'numero_endereco',
      'bairro',
      'cidade',
      'estado',
      'tipo_do_acesso',
      'status'
    ] as const;

    const faltando = camposObrigatorios.filter(campo => !String(this.edit[campo] ?? '').trim());

    if (faltando.length) {
      this.camposInvalidosEdicao = [...faltando];
      this.abaEdicaoUsuario = this.abaPorCampoEdicao(faltando[0]);
      return 'Por favor, preencha todos os campos obrigatórios antes de salvar as alterações.';
    }

    const email = String(this.edit.email || '').trim();
    if (!this.emailValido(email)) {
      this.camposInvalidosEdicao = ['email'];
      this.abaEdicaoUsuario = 'contato';
      return 'Informe um e-mail válido para o usuário.';
    }

    const cpfCnpj = this.onlyDigits(this.edit.cpf);
    if (cpfCnpj.length !== 11 && cpfCnpj.length !== 14) {
      this.camposInvalidosEdicao = ['cpf'];
      this.abaEdicaoUsuario = 'dados';
      return 'Informe um CPF com 11 dígitos ou CNPJ com 14 dígitos.';
    }

    const cep = this.onlyDigits(this.edit.cep);
    if (cep.length !== 8) {
      this.camposInvalidosEdicao = ['cep'];
      this.abaEdicaoUsuario = 'endereco';
      return 'Informe um CEP com 8 dígitos.';
    }

    const telefone = this.normalizarTelefoneWhatsapp(this.edit.telefone);
    if (telefone.length !== 12 && telefone.length !== 13) {
      this.camposInvalidosEdicao = ['telefone'];
      this.abaEdicaoUsuario = 'contato';
      return 'Informe um telefone com DDD válido para contato/WhatsApp.';
    }

    this.camposInvalidosEdicao = [];
    return null;
  }

  private abaPorCampoEdicao(campo: string): AbaEdicaoUsuario {
    if (['cpf', 'nome', 'nome_social', 'nascimento', 'status'].includes(campo)) {
      return 'dados';
    }

    if (['telefone', 'email', 'tipo_do_acesso'].includes(campo)) {
      return 'contato';
    }

    if (['cep', 'logradouro', 'numero_endereco', 'complemento_endereco', 'bairro', 'cidade', 'estado'].includes(campo)) {
      return 'endereco';
    }

    return 'dados';
  }

  private formatarCamposEdicaoAntesSalvar(): void {
    this.edit.cpf = this.formatarCpfCnpj(this.edit.cpf);
    this.edit.telefone = this.exibirTelefoneFormatado(this.edit.telefone);
    this.edit.cep = this.formatarCEP(this.edit.cep);
    this.edit.estado = String(this.edit.estado || '').toUpperCase().trim();
    this.edit.email = String(this.edit.email || '').trim().toLowerCase();
    this.edit.nome = String(this.edit.nome || '').trim();
    this.edit.nome_social = String(this.edit.nome_social || '').trim();
    this.edit.logradouro = String(this.edit.logradouro || '').trim();
    this.edit.numero_endereco = String(this.edit.numero_endereco || '').trim();
    this.edit.complemento_endereco = String(this.edit.complemento_endereco || '').trim();
    this.edit.bairro = String(this.edit.bairro || '').trim();
    this.edit.cidade = String(this.edit.cidade || '').trim();
  }

  onCepBlurEdicao(): void {
    this.onCepBlurRow(this.edit);
  }

  normalizarUfEdicao(): void {
    this.edit.estado = String(this.edit.estado || '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 2);
  }

  resumoUsuarioEdicao(): string {
    const nome = this.edit.nome || this.edit.nome_social || 'Usuário selecionado';
    const email = this.edit.email || 'sem e-mail cadastrado';
    return `${nome} · ${email}`;
  }

  exibirAlertaSegurancaEdicao(): boolean {
    return this.alterouStatusEdicao() || this.alterouTipoAcessoEdicao() || this.alterouEmailEdicao();
  }

  alterouStatusEdicao(): boolean {
    return this.normalizarTexto(this.edit.status) !== this.normalizarTexto(this.editOriginal.status);
  }

  alterouTipoAcessoEdicao(): boolean {
    return this.normalizarTexto(this.edit.tipo_do_acesso) !== this.normalizarTexto(this.editOriginal.tipo_do_acesso);
  }

  alterouEmailEdicao(): boolean {
    return this.normalizarTexto(this.edit.email) !== this.normalizarTexto(this.editOriginal.email);
  }

  usuarioEdicaoParaAcao(): Usuario {
    return {
      ...(this.editOriginal as Usuario),
      ...(this.edit as Usuario),
      id: this.editId ?? this.edit.id,
      cpf: String(this.edit.cpf || ''),
      nome: String(this.edit.nome || ''),
      nome_social: String(this.edit.nome_social || ''),
      email: String(this.edit.email || ''),
      telefone: String(this.edit.telefone || ''),
      nascimento: this.edit.nascimento || '',
      cep: String(this.edit.cep || ''),
      logradouro: String(this.edit.logradouro || ''),
      numero_endereco: String(this.edit.numero_endereco || ''),
      complemento_endereco: String(this.edit.complemento_endereco || ''),
      bairro: String(this.edit.bairro || ''),
      cidade: String(this.edit.cidade || ''),
      estado: String(this.edit.estado || ''),
      tipo_do_acesso: String(this.edit.tipo_do_acesso || 'cliente'),
      status: String(this.edit.status || 'ativo'),
      senha: '',
      confirmarSenha: ''
    } as Usuario;
  }

  abrirConfirmacaoResetarMfaEdicao(): void {
    if (!this.editId) {
      alert('Não foi possível identificar o usuário para resetar o 2FA.');
      return;
    }

    const usuario = this.usuarioEdicaoParaAcao();
    this.modalEdicao?.hide();

    setTimeout(() => {
      this.abrirConfirmacaoResetarMfa(usuario);
    }, 250);
  }

  abrirConfirmacaoWhatsappEdicao(): void {
    const usuario = this.usuarioEdicaoParaAcao();

    if (!this.telefoneWhatsappValido(usuario.telefone)) {
      alert('O telefone deste usuário não parece estar em um formato válido para WhatsApp.');
      return;
    }

    this.modalEdicao?.hide();

    setTimeout(() => {
      this.abrirConfirmacaoWhatsapp(usuario);
    }, 250);
  }

  abrirModalCadastro(): void {
    this.camposInvalidos = [];
    this.mensagemErroCadastro = '';
    this.cepCadastroErro = '';
    this.cepCadastroCarregando = false;
    this.abaCadastroUsuario = 'dados';
    this.mostrarSenha = false;

    this.novoUsuario = {
      cpf: '',
      nome: '',
      nome_social: '',
      email: '',
      telefone: '',
      senha: '',
      confirmarSenha: '',
      nascimento: '',
      cep: '',
      logradouro: '',
      numero_endereco: '',
      complemento_endereco: '',
      bairro: '',
      cidade: '',
      estado: '',
      tipo_do_acesso: 'cliente',
      status: 'ativo'
    };

    const el = document.getElementById('modalCadastroUsuario');

    if (!el) {
      console.error('Modal modalCadastroUsuario não encontrado.');
      return;
    }

    this.modalCadastro = bootstrap.Modal.getOrCreateInstance(el);
    this.modalCadastro.show();
  }

  salvarNovoUsuario(): void {
    const erroValidacao = this.validarCadastroUsuario(true);

    if (erroValidacao) {
      this.mensagemErroCadastro = erroValidacao;
      return;
    }

    this.mensagemErroCadastro = '';
    this.formatarCamposCadastroAntesSalvar();

    const payload = this.montarPayloadUsuario(this.novoUsuario, true);

    this.usuarioService.criarUsuario(payload).subscribe({
      next: () => {
        this.modalCadastro?.hide();
        alert('Usuário cadastrado com sucesso.');

        this.whatsappCloudService.enviarMensagemCadastroUsuario({
          telefone: this.novoUsuario.telefone || '',
          nome: this.novoUsuario.nome || ''
        }).subscribe({
          error: (err) => console.warn('Usuário cadastrado, mas houve falha ao enviar WhatsApp:', err)
        });

        this.camposInvalidos = [];
        this.mensagemErroCadastro = '';
        this.recarregar();
      },
      error: (err) => {
        console.error('Erro ao cadastrar usuário:', err);

        this.mensagemErroCadastro = this.extrairMensagemErro(
          err,
          'Erro ao cadastrar usuário. Verifique os dados informados.'
        );

        this.aplicarErroUsuario(this.mensagemErroCadastro, true);
      }
    });
  }

  inativar(id?: number): void {
    if (!id) {
      return;
    }

    const usuario = this.todos.find(item => item.id === id) ?? this.usuarios.find(item => item.id === id);

    if (!usuario) {
      alert('Usuário não encontrado para alteração de status.');
      return;
    }

    this.abrirConfirmacaoAlterarStatus(usuario);
  }

  abrirConfirmacaoAlterarStatus(usuario: Usuario): void {
    if (!usuario?.id) {
      alert('Usuário inválido para alteração de status.');
      return;
    }

    this.fecharMenuAcoes();

    const usuarioAtivo = this.normalizarTexto(usuario.status) === 'ativo';
    const novoStatus = usuarioAtivo ? 'inativo' : 'ativo';

    this.abrirModalConfirmacao({
      tipo: 'alterar-status',
      usuario,
      novoStatus,
      titulo: usuarioAtivo ? 'Inativar usuário?' : 'Reativar usuário?',
      mensagem: usuarioAtivo
        ? 'Após a confirmação, este usuário não poderá acessar o sistema até ser reativado.'
        : 'Após a confirmação, este usuário voltará a ter acesso conforme o perfil configurado.',
      detalhe: `${usuario.nome || 'Usuário'} • ${usuario.email || 'sem e-mail'}`,
      icone: usuarioAtivo ? 'bi-person-dash' : 'bi-person-check',
      confirmarLabel: usuarioAtivo ? 'Confirmar inativação' : 'Confirmar reativação',
      confirmarClasse: usuarioAtivo ? 'btn-warning' : 'btn-success'
    });
  }

  confirmarResetarMfa(usuario: Usuario): void {
    this.abrirConfirmacaoResetarMfa(usuario);
  }

  abrirConfirmacaoResetarMfa(usuario: Usuario): void {
    if (!usuario?.id) {
      alert('Usuário inválido para reset de MFA.');
      return;
    }

    this.fecharMenuAcoes();

    this.abrirModalConfirmacao({
      tipo: 'resetar-mfa',
      usuario,
      titulo: 'Resetar autenticação em duas etapas?',
      mensagem: 'Essa ação removerá o vínculo atual com o aplicativo autenticador. No próximo login, o usuário precisará configurar um novo QR Code.',
      detalhe: `${usuario.nome || 'Usuário'} • ${usuario.email || 'sem e-mail'}`,
      icone: 'bi-shield-x',
      confirmarLabel: 'Confirmar reset 2FA',
      confirmarClasse: 'btn-warning'
    });
  }

  abrirConfirmacaoWhatsapp(usuario: Usuario): void {
    if (!usuario.telefone) {
      alert('Este usuário não possui telefone cadastrado.');
      return;
    }

    if (!this.telefoneWhatsappValido(usuario.telefone)) {
      alert('O telefone deste usuário não parece estar em um formato válido para WhatsApp.');
      return;
    }

    this.fecharMenuAcoes();

    this.abrirModalConfirmacao({
      tipo: 'whatsapp',
      usuario,
      titulo: 'Enviar mensagem pelo WhatsApp?',
      mensagem: 'Confirme o envio da mensagem para o contato selecionado.',
      detalhe: `${usuario.nome || 'Usuário'} • ${this.exibirTelefoneFormatado(usuario.telefone)}`,
      icone: 'bi-whatsapp',
      confirmarLabel: 'Enviar WhatsApp',
      confirmarClasse: 'btn-success'
    });
  }

  private abrirModalConfirmacao(confirmacao: AcaoConfirmacao): void {
    this.confirmacao = confirmacao;
    this.acaoEmExecucao = false;

    const el = document.getElementById('modalConfirmacaoUsuario');

    if (!el) {
      console.error('Modal modalConfirmacaoUsuario não encontrado.');
      return;
    }

    this.modalConfirmacao = bootstrap.Modal.getOrCreateInstance(el);
    this.modalConfirmacao.show();
  }

  executarAcaoConfirmada(): void {
    if (!this.confirmacao || this.acaoEmExecucao) {
      return;
    }

    if (this.confirmacao.tipo === 'resetar-mfa') {
      this.executarResetarMfa(this.confirmacao.usuario);
      return;
    }

    if (this.confirmacao.tipo === 'alterar-status') {
      this.executarAlterarStatus(this.confirmacao.usuario, this.confirmacao.novoStatus || 'inativo');
      return;
    }

    if (this.confirmacao.tipo === 'whatsapp') {
      this.executarEnvioWhatsapp(this.confirmacao.usuario);
    }
  }

  private executarResetarMfa(usuario: Usuario): void {
    if (!usuario.id) {
      return;
    }

    this.acaoEmExecucao = true;
    this.resetandoMfaId = usuario.id;

    this.usuarioService.resetarMfa(usuario.id).subscribe({
      next: (resposta) => {
        this.modalConfirmacao?.hide();
        alert(resposta?.mensagem || 'Autenticação em duas etapas resetada com sucesso.');
        this.resetandoMfaId = null;
        this.acaoEmExecucao = false;
        this.confirmacao = null;
        this.recarregar();
      },
      error: (erro) => {
        console.error('Erro ao resetar MFA:', erro);
        alert(
          erro?.error?.mensagem ||
          erro?.error ||
          'Não foi possível resetar a autenticação em duas etapas.'
        );
        this.resetandoMfaId = null;
        this.acaoEmExecucao = false;
      }
    });
  }

  private executarAlterarStatus(usuario: Usuario, novoStatus: string): void {
    if (!usuario.id) {
      return;
    }

    this.acaoEmExecucao = true;

    const payload = this.montarPayloadUsuario({
      ...usuario,
      status: novoStatus
    }, false);

    this.usuarioService.atualizarUsuario(usuario.id, payload).subscribe({
      next: () => {
        this.modalConfirmacao?.hide();
        alert(novoStatus === 'ativo' ? 'Usuário reativado com sucesso.' : 'Usuário inativado com sucesso.');
        this.acaoEmExecucao = false;
        this.confirmacao = null;
        this.cancelarEdicao();
        this.recarregar();
      },
      error: (err) => {
        console.error('Erro ao alterar o status do usuário:', err);
        alert(this.extrairMensagemErro(err, 'Erro ao alterar o status do usuário.'));
        this.acaoEmExecucao = false;
      }
    });
  }

  private executarEnvioWhatsapp(usuario: Usuario): void {
    this.acaoEmExecucao = true;

    this.whatsappCloudService.enviarMensagem({
      telefone: this.normalizarTelefoneWhatsapp(usuario.telefone)
    }).subscribe({
      next: () => {
        this.modalConfirmacao?.hide();
        alert('Mensagem enviada com sucesso.');
        this.acaoEmExecucao = false;
        this.confirmacao = null;
      },
      error: (err) => {
        console.error(err);
        alert('Erro ao enviar mensagem pelo WhatsApp.');
        this.acaoEmExecucao = false;
      }
    });
  }

  enviarWhatsappUsuario(usuario: Usuario): void {
    this.abrirConfirmacaoWhatsapp(usuario);
  }

  onCepBlurRow(model: Partial<Usuario>): void {
    const cepNums = this.onlyDigits(model.cep);

    if (!cepNums) {
      return;
    }

    if (cepNums.length !== 8) {
      alert('CEP deve conter 8 dígitos.');
      return;
    }

    model.cep = this.formatarCEP(cepNums);

    this.http.get<any>(`https://viacep.com.br/ws/${cepNums}/json/`).subscribe({
      next: (resp) => {
        if (resp?.erro) {
          alert('CEP não encontrado.');
          return;
        }

        model.logradouro = resp.logradouro || '';
        model.bairro = resp.bairro || '';
        model.cidade = resp.localidade || '';
        model.estado = (resp.uf || '').toUpperCase();

        if (!model.complemento_endereco && resp.complemento) {
          model.complemento_endereco = resp.complemento;
        }
      },
      error: (e) => {
        console.error(e);
        alert('Falha ao consultar o CEP.');
      }
    });
  }

  campoCadastroInvalido(campo: string): boolean {
    return this.camposInvalidos.includes(campo);
  }


  trocarAbaCadastroUsuario(aba: AbaCadastroUsuario): void {
    this.abaCadastroUsuario = aba;
  }

  cadastroAbaAnterior(): void {
    const ordem: AbaCadastroUsuario[] = ['dados', 'contato', 'endereco', 'seguranca'];
    const indice = ordem.indexOf(this.abaCadastroUsuario);

    if (indice > 0) {
      this.abaCadastroUsuario = ordem[indice - 1];
    }
  }

  cadastroAbaProxima(): void {
    const ordem: AbaCadastroUsuario[] = ['dados', 'contato', 'endereco', 'seguranca'];
    const indice = ordem.indexOf(this.abaCadastroUsuario);

    if (indice >= 0 && indice < ordem.length - 1) {
      this.abaCadastroUsuario = ordem[indice + 1];
    }
  }

  cadastroEhPrimeiraAba(): boolean {
    return this.abaCadastroUsuario === 'dados';
  }

  cadastroEhUltimaAba(): boolean {
    return this.abaCadastroUsuario === 'seguranca';
  }

  limparCampoCadastroInvalido(campo: string): void {
    if (!this.camposInvalidos.includes(campo)) {
      return;
    }

    this.camposInvalidos = this.camposInvalidos.filter(item => item !== campo);

    if (!this.camposInvalidos.length) {
      this.mensagemErroCadastro = '';
    }
  }

  get cadastroProntoParaSalvar(): boolean {
    return this.validarCadastroUsuario(false) === null;
  }

  get mensagemBloqueioCadastro(): string {
    return this.validarCadastroUsuario(false) || '';
  }

  get progressoCadastroPercentual(): number {
    /*
     * A barra de progresso deve refletir a validação real do cadastro,
     * e não apenas a quantidade bruta de campos preenchidos.
     *
     * Quando o formulário já pode ser salvo, a barra precisa chegar a 100%,
     * mesmo que algum cálculo intermediário de preenchimento não acompanhe
     * imediatamente a última alteração feita pelo usuário.
     */
    if (this.cadastroProntoParaSalvar) {
      return 100;
    }

    const obrigatorios = this.camposObrigatoriosCadastro();
    const totalObrigatorios = obrigatorios.length || 1;

    const preenchidos = obrigatorios.filter(campo =>
      String(this.novoUsuario[campo] ?? '').trim().length > 0
    ).length;

    const percentualPreenchimento = Math.round((preenchidos / totalObrigatorios) * 100);

    /*
     * Se existem campos preenchidos, mas inválidos, reduzimos um pouco o avanço
     * para que a barra não indique conclusão total antes de o formulário ficar válido.
     */
    const pendencias = this.quantidadePendenciasCadastro;
    const descontoPorPendencias = Math.min(25, pendencias * 5);
    const percentualAjustado = percentualPreenchimento - descontoPorPendencias;

    return Math.max(0, Math.min(99, percentualAjustado));
  }

  get quantidadePendenciasCadastro(): number {
    return this.pendenciasCadastroAba('dados')
      + this.pendenciasCadastroAba('contato')
      + this.pendenciasCadastroAba('endereco')
      + this.pendenciasCadastroAba('seguranca');
  }

  pendenciasCadastroAba(aba: AbaCadastroUsuario): number {
    const camposPorAba: Record<AbaCadastroUsuario, string[]> = {
      dados: ['cpf', 'nome', 'nascimento'],
      contato: ['telefone', 'email', 'tipo_do_acesso'],
      endereco: ['cep', 'logradouro', 'numero_endereco', 'bairro', 'cidade', 'estado'],
      seguranca: ['status', 'senha', 'confirmarSenha']
    };

    let total = camposPorAba[aba].filter(campo => !String((this.novoUsuario as any)[campo] ?? '').trim()).length;

    if (aba === 'contato') {
      const email = String(this.novoUsuario.email || '').trim();
      if (email && !this.emailValido(email)) {
        total++;
      }

      const telefone = String(this.novoUsuario.telefone || '').trim();
      if (telefone && !this.telefoneWhatsappValido(telefone)) {
        total++;
      }
    }

    if (aba === 'dados') {
      const cpfCnpj = this.onlyDigits(this.novoUsuario.cpf);
      if (cpfCnpj && cpfCnpj.length !== 11 && cpfCnpj.length !== 14) {
        total++;
      }
    }

    if (aba === 'endereco') {
      const cep = this.onlyDigits(this.novoUsuario.cep);
      if (cep && cep.length !== 8) {
        total++;
      }

      const uf = String(this.novoUsuario.estado || '').trim();
      if (uf && uf.length !== 2) {
        total++;
      }
    }

    if (aba === 'seguranca') {
      if (this.novoUsuario.senha && !this.senhaCadastroAtendePolitica()) {
        total++;
      }

      if (this.novoUsuario.confirmarSenha && this.senhasCadastroDiferentes()) {
        total++;
      }
    }

    return total;
  }

  cadastroNomePreview(): string {
    return String(this.novoUsuario.nome || this.novoUsuario.nome_social || 'Novo usuário').trim();
  }

  cadastroEmailPreview(): string {
    return String(this.novoUsuario.email || 'E-mail ainda não informado').trim();
  }

  cadastroTipoAcessoPreview(): string {
    return this.labelTipoAcesso(this.novoUsuario.tipo_do_acesso || 'cliente');
  }

  cadastroStatusPreview(): string {
    return this.formatarStatus(this.novoUsuario.status || 'ativo');
  }

  cadastroWhatsappPreview(): string {
    return this.telefoneWhatsappValido(this.novoUsuario.telefone)
      ? 'WhatsApp válido para notificações automáticas'
      : 'Informe telefone com DDD para habilitar notificações';
  }

  telefoneCadastroValido(): boolean {
    return this.telefoneWhatsappValido(this.novoUsuario.telefone);
  }

  senhaTemMinimo(): boolean {
    return String(this.novoUsuario.senha || '').length >= 8;
  }

  senhaTemMaiuscula(): boolean {
    return /[A-ZÁÉÍÓÚÂÊÔÃÕÇ]/.test(String(this.novoUsuario.senha || ''));
  }

  senhaTemMinuscula(): boolean {
    return /[a-záéíóúâêôãõç]/.test(String(this.novoUsuario.senha || ''));
  }

  senhaTemNumero(): boolean {
    return /\d/.test(String(this.novoUsuario.senha || ''));
  }

  senhaTemEspecial(): boolean {
    return /[^A-Za-zÀ-ÖØ-öø-ÿ0-9]/.test(String(this.novoUsuario.senha || ''));
  }

  senhaCadastroAtendePolitica(): boolean {
    return this.senhaTemMinimo()
      && this.senhaTemMaiuscula()
      && this.senhaTemMinuscula()
      && this.senhaTemNumero();
  }

  senhasCadastroConferem(): boolean {
    const senha = String(this.novoUsuario.senha || '');
    const confirmacao = String(this.novoUsuario.confirmarSenha || '');

    return !!senha && !!confirmacao && senha === confirmacao;
  }

  senhasCadastroDiferentes(): boolean {
    const senha = String(this.novoUsuario.senha || '');
    const confirmacao = String(this.novoUsuario.confirmarSenha || '');

    return !!senha && !!confirmacao && senha !== confirmacao;
  }

  senhaForcaPercentual(): number {
    const criterios = [
      this.senhaTemMinimo(),
      this.senhaTemMaiuscula(),
      this.senhaTemMinuscula(),
      this.senhaTemNumero(),
      this.senhaTemEspecial()
    ];

    return criterios.filter(Boolean).length * 20;
  }

  senhaForcaLabel(): string {
    const percentual = this.senhaForcaPercentual();

    if (!this.novoUsuario.senha) {
      return 'Não informada';
    }

    if (percentual < 60) {
      return 'Fraca';
    }

    if (percentual < 80) {
      return 'Média';
    }

    if (percentual < 100) {
      return 'Boa';
    }

    return 'Forte';
  }

  senhaForcaClasse(): string {
    const percentual = this.senhaForcaPercentual();

    if (percentual < 60) {
      return 'senha-fraca';
    }

    if (percentual < 80) {
      return 'senha-media';
    }

    return 'senha-forte';
  }

  normalizarUfCadastro(): void {
    this.novoUsuario.estado = String(this.novoUsuario.estado || '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 2);
    this.limparCampoCadastroInvalido('estado');
  }

  formatarTelefoneCadastro(): void {
    this.novoUsuario.telefone = this.exibirTelefoneFormatado(this.novoUsuario.telefone);
    this.limparCampoCadastroInvalido('telefone');
  }

  formatarCpfCnpjCadastro(): void {
    this.novoUsuario.cpf = this.formatarCpfCnpj(this.novoUsuario.cpf);
    this.limparCampoCadastroInvalido('cpf');
  }

  normalizarEmailCadastro(): void {
    this.novoUsuario.email = String(this.novoUsuario.email || '').trim().toLowerCase();
    this.limparCampoCadastroInvalido('email');
  }

  normalizarEmailEdicao(): void {
    this.edit.email = String(this.edit.email || '').trim().toLowerCase();
    this.limparCampoEdicaoInvalido('email');
  }

  onCepBlurCadastro(): void {
    const cepNums = this.onlyDigits(this.novoUsuario.cep);
    this.cepCadastroErro = '';

    if (!cepNums) {
      return;
    }

    if (cepNums.length !== 8) {
      this.cepCadastroErro = 'CEP deve conter 8 dígitos.';
      this.camposInvalidos = Array.from(new Set([...this.camposInvalidos, 'cep']));
      return;
    }

    this.novoUsuario.cep = this.formatarCEP(cepNums);
    this.limparCampoCadastroInvalido('cep');
    this.cepCadastroCarregando = true;

    this.http.get<any>(`https://viacep.com.br/ws/${cepNums}/json/`).subscribe({
      next: (resp) => {
        this.cepCadastroCarregando = false;

        if (resp?.erro) {
          this.cepCadastroErro = 'CEP não encontrado.';
          return;
        }

        this.novoUsuario.logradouro = resp.logradouro || '';
        this.novoUsuario.bairro = resp.bairro || '';
        this.novoUsuario.cidade = resp.localidade || '';
        this.novoUsuario.estado = (resp.uf || '').toUpperCase();

        if (!this.novoUsuario.complemento_endereco && resp.complemento) {
          this.novoUsuario.complemento_endereco = resp.complemento;
        }

        for (const campo of ['logradouro', 'bairro', 'cidade', 'estado']) {
          this.limparCampoCadastroInvalido(campo);
        }
      },
      error: (e) => {
        console.error(e);
        this.cepCadastroCarregando = false;
        this.cepCadastroErro = 'Falha ao consultar o CEP.';
      }
    });
  }

  private validarCadastroUsuario(marcarInvalidos: boolean): string | null {
    const erroCampos = this.validarCamposObrigatoriosCadastro(marcarInvalidos);
    if (erroCampos) {
      return erroCampos;
    }

    const validacoes: Array<() => string | null> = [
      () => this.validarCpfCnpjCadastro(marcarInvalidos),
      () => this.validarEmailCadastro(marcarInvalidos),
      () => this.validarTelefoneCadastro(marcarInvalidos),
      () => this.validarCepCadastro(marcarInvalidos),
      () => this.validarUfCadastro(marcarInvalidos),
      () => this.validarSenhaCadastro(marcarInvalidos),
      () => this.validarConfirmacaoSenhaCadastro(marcarInvalidos)
    ];

    for (const validar of validacoes) {
      const erro = validar();
      if (erro) {
        return erro;
      }
    }

    if (marcarInvalidos) {
      this.camposInvalidos = [];
    }

    return null;
  }

  private validarCamposObrigatoriosCadastro(marcarInvalidos: boolean): string | null {
    const faltando = this.camposObrigatoriosCadastro().filter(campo => !String(this.novoUsuario[campo] ?? '').trim());

    if (!faltando.length) {
      return null;
    }

    if (marcarInvalidos) {
      this.camposInvalidos = [...faltando];
      this.abaCadastroUsuario = this.abaPorCampoCadastro(faltando[0]);
    }

    return 'Preencha todos os campos obrigatórios antes de cadastrar o usuário.';
  }

  private validarCpfCnpjCadastro(marcarInvalidos: boolean): string | null {
    const cpfCnpj = this.onlyDigits(this.novoUsuario.cpf);

    if (cpfCnpj.length === 11 || cpfCnpj.length === 14) {
      return null;
    }

    if (marcarInvalidos) {
      this.camposInvalidos = ['cpf'];
      this.abaCadastroUsuario = 'dados';
    }

    return 'Informe um CPF com 11 dígitos ou CNPJ com 14 dígitos.';
  }

  private validarEmailCadastro(marcarInvalidos: boolean): string | null {
    const email = String(this.novoUsuario.email || '').trim();

    if (this.emailValido(email)) {
      return null;
    }

    if (marcarInvalidos) {
      this.camposInvalidos = ['email'];
      this.abaCadastroUsuario = 'contato';
    }

    return 'Informe um e-mail válido para o usuário.';
  }

  private validarTelefoneCadastro(marcarInvalidos: boolean): string | null {
    if (this.telefoneWhatsappValido(this.novoUsuario.telefone)) {
      return null;
    }

    if (marcarInvalidos) {
      this.camposInvalidos = ['telefone'];
      this.abaCadastroUsuario = 'contato';
    }

    return 'Informe um telefone com DDD válido para contato e notificações.';
  }

  private validarCepCadastro(marcarInvalidos: boolean): string | null {
    if (this.onlyDigits(this.novoUsuario.cep).length === 8) {
      return null;
    }

    if (marcarInvalidos) {
      this.camposInvalidos = ['cep'];
      this.abaCadastroUsuario = 'endereco';
    }

    return 'Informe um CEP com 8 dígitos.';
  }

  private validarUfCadastro(marcarInvalidos: boolean): string | null {
    if (String(this.novoUsuario.estado || '').trim().toUpperCase().length === 2) {
      return null;
    }

    if (marcarInvalidos) {
      this.camposInvalidos = ['estado'];
      this.abaCadastroUsuario = 'endereco';
    }

    return 'Informe a UF com 2 letras.';
  }

  private validarSenhaCadastro(marcarInvalidos: boolean): string | null {
    if (this.senhaCadastroAtendePolitica()) {
      return null;
    }

    if (marcarInvalidos) {
      this.camposInvalidos = ['senha'];
      this.abaCadastroUsuario = 'seguranca';
    }

    return 'Informe uma senha com pelo menos 8 caracteres, letra maiúscula, letra minúscula e número.';
  }

  private validarConfirmacaoSenhaCadastro(marcarInvalidos: boolean): string | null {
    if (!this.senhasCadastroDiferentes()) {
      return null;
    }

    if (marcarInvalidos) {
      this.camposInvalidos = ['senha', 'confirmarSenha'];
      this.abaCadastroUsuario = 'seguranca';
    }

    return 'As senhas informadas não coincidem.';
  }

  private camposObrigatoriosCadastro(): Array<keyof Usuario> {
    return [
      'cpf',
      'nome',
      'telefone',
      'email',
      'nascimento',
      'cep',
      'numero_endereco',
      'logradouro',
      'bairro',
      'cidade',
      'estado',
      'tipo_do_acesso',
      'status',
      'senha',
      'confirmarSenha'
    ];
  }

  private abaPorCampoCadastro(campo: string): AbaCadastroUsuario {
    if (['cpf', 'nome', 'nome_social', 'nascimento'].includes(campo)) {
      return 'dados';
    }

    if (['telefone', 'email', 'tipo_do_acesso'].includes(campo)) {
      return 'contato';
    }

    if (['cep', 'logradouro', 'numero_endereco', 'complemento_endereco', 'bairro', 'cidade', 'estado'].includes(campo)) {
      return 'endereco';
    }

    return 'seguranca';
  }

  private formatarCamposCadastroAntesSalvar(): void {
    this.novoUsuario.cpf = this.formatarCpfCnpj(this.novoUsuario.cpf);
    this.novoUsuario.telefone = this.exibirTelefoneFormatado(this.novoUsuario.telefone);
    this.novoUsuario.cep = this.formatarCEP(this.novoUsuario.cep);
    this.novoUsuario.estado = String(this.novoUsuario.estado || '').toUpperCase().trim();
    this.novoUsuario.email = String(this.novoUsuario.email || '').trim().toLowerCase();
    this.novoUsuario.nome = String(this.novoUsuario.nome || '').trim();
    this.novoUsuario.nome_social = String(this.novoUsuario.nome_social || '').trim();
    this.novoUsuario.logradouro = String(this.novoUsuario.logradouro || '').trim();
    this.novoUsuario.numero_endereco = String(this.novoUsuario.numero_endereco || '').trim();
    this.novoUsuario.complemento_endereco = String(this.novoUsuario.complemento_endereco || '').trim();
    this.novoUsuario.bairro = String(this.novoUsuario.bairro || '').trim();
    this.novoUsuario.cidade = String(this.novoUsuario.cidade || '').trim();
    this.novoUsuario.tipo_do_acesso = String(this.novoUsuario.tipo_do_acesso || 'cliente').toLowerCase().trim();
    this.novoUsuario.status = String(this.novoUsuario.status || 'ativo').toLowerCase().trim();
  }

  private emailValido(email: string): boolean {
    const valor = String(email || '').trim();
    const arroba = valor.indexOf('@');
    const ponto = valor.lastIndexOf('.');

    return arroba > 0 && ponto > arroba + 1 && ponto < valor.length - 1;
  }


  private aplicarErroUsuario(mensagem: string, cadastro: boolean): void {
    const texto = this.normalizarTexto(mensagem);

    if (texto.includes('e-mail') || texto.includes('email')) {
      if (cadastro) {
        this.camposInvalidos = Array.from(new Set([
          ...this.camposInvalidos,
          'email'
        ]));
        this.abaCadastroUsuario = 'contato';
      } else {
        this.camposInvalidosEdicao = Array.from(new Set([
          ...this.camposInvalidosEdicao,
          'email'
        ]));
        this.abaEdicaoUsuario = 'contato';
      }
    }
  }

  private extrairMensagemErro(err: any, mensagemPadrao: string): string {
    if (typeof err?.error === 'string') {
      return err.error;
    }

    if (typeof err?.error?.mensagem === 'string') {
      return err.error.mensagem;
    }

    if (typeof err?.error?.message === 'string') {
      return err.error.message;
    }

    if (typeof err?.message === 'string') {
      return err.message;
    }

    return mensagemPadrao;
  }

  toggleMostrarSenha(): void {
    this.mostrarSenha = !this.mostrarSenha;
  }

  voltar(): void {
    this.location.back();
  }

  formatarCPF(cpf: string | null | undefined): string {
    return this.formatarCpfCnpj(cpf);
  }

  formatarCpfCnpj(valor: string | null | undefined): string {
    const d = this.onlyDigits(valor);

    if (d.length === 11) {
      return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9, 11)}`;
    }

    if (d.length === 14) {
      return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12, 14)}`;
    }

    return valor ?? '';
  }

  formatarCEP(cep: string | null | undefined): string {
    const d = this.onlyDigits(cep);

    if (d.length !== 8) {
      return cep ?? '';
    }

    return `${d.slice(0, 5)}-${d.slice(5, 8)}`;
  }

  exibirTelefoneFormatado(telefone: string | null | undefined): string {
    if (!telefone) {
      return '';
    }

    const n = this.onlyDigits(telefone);
    const codigoPais = '55';

    if (n.length >= 11) {
      const ddd = n.slice(-11, -9);
      const parte1 = n.slice(-9, -4);
      const parte2 = n.slice(-4);
      return `+${codigoPais} (${ddd}) ${parte1}-${parte2}`;
    }

    if (n.length >= 10) {
      const ddd = n.slice(0, 2);
      const parte1 = n.slice(2, 6);
      const parte2 = n.slice(6, 10);
      return `+${codigoPais} (${ddd}) ${parte1}-${parte2}`;
    }

    if (n.length >= 8) {
      const ddd = '11';
      const parte1 = n.slice(0, -4);
      const parte2 = n.slice(-4);
      return `+${codigoPais} (${ddd}) ${parte1}-${parte2}`;
    }

    return n;
  }

  telefoneWhatsappValido(telefone: string | null | undefined): boolean {
    const numero = this.normalizarTelefoneWhatsapp(telefone);
    return numero.length === 12 || numero.length === 13;
  }

  whatsappDescricao(telefone: string | null | undefined): string {
    return this.telefoneWhatsappValido(telefone) ? 'WhatsApp válido' : 'Verificar telefone';
  }

  whatsappBadgeClass(telefone: string | null | undefined): string {
    return this.telefoneWhatsappValido(telefone) ? 'bg-success-subtle text-success border border-success-subtle' : 'bg-warning-subtle text-warning border border-warning-subtle';
  }

  private normalizarTelefoneWhatsapp(telefone?: string | null): string {
    const digitos = this.onlyDigits(telefone);

    if (!digitos) {
      return '';
    }

    if (digitos.startsWith('55')) {
      return digitos;
    }

    if (digitos.length === 10 || digitos.length === 11) {
      return `55${digitos}`;
    }

    if (digitos.length === 8 || digitos.length === 9) {
      return `5511${digitos}`;
    }

    return digitos;
  }

  capitalizar(s: string | null | undefined): string {
    if (!s) {
      return '';
    }

    return s
      .split(' ')
      .filter(parte => !!parte)
      .map(parte => parte.charAt(0).toUpperCase() + parte.slice(1).toLowerCase())
      .join(' ');
  }

  formatarStatus(status: string | null | undefined): string {
    const valor = this.normalizarTexto(status);

    if (valor === 'ativo') {
      return 'Ativo';
    }

    if (valor === 'inativo') {
      return 'Inativo';
    }

    return status ? this.capitalizar(status) : '—';
  }

  statusBadgeClass(status: string | null | undefined): string {
    const valor = this.normalizarTexto(status);

    if (valor === 'ativo') {
      return 'bg-success';
    }

    if (valor === 'inativo') {
      return 'bg-secondary';
    }

    return 'bg-light text-dark border';
  }

  tipoAcessoBadgeClass(tipo: string | null | undefined): string {
    const valor = this.normalizarTexto(tipo);

    if (valor === 'administrador') {
      return 'bg-primary';
    }

    if (valor === 'cliente') {
      return 'bg-secondary';
    }

    if (valor === 'colaborador') {
      return 'bg-info text-dark';
    }

    return 'bg-light text-dark border';
  }

  labelTipoAcesso(tipo: string | null | undefined): string {
    const valor = this.normalizarTexto(tipo);

    if (valor === 'administrador') {
      return 'Administrador';
    }

    if (valor === 'cliente') {
      return 'Cliente';
    }

    if (valor === 'colaborador') {
      return 'Colaborador';
    }

    return tipo ? this.capitalizar(tipo) : '—';
  }

  mfaDescricao(usuario: Usuario): string {
    const status = this.normalizarTexto(usuario.mfaStatus);

    if (usuario.mfaAtivo) {
      return 'Ativo';
    }

    if (status === 'pendente') {
      return 'Pendente';
    }

    if (status === 'resetado' || status === 'reset_solicitado') {
      return 'Reset solicitado';
    }

    return 'Não configurado';
  }

  mfaBadgeClass(usuario: Usuario): string {
    const descricao = this.normalizarTexto(this.mfaDescricao(usuario));

    if (descricao === 'ativo') {
      return 'bg-success';
    }

    if (descricao === 'pendente' || descricao === 'reset solicitado') {
      return 'bg-warning text-dark';
    }

    return 'bg-secondary';
  }

  classeLinhaUsuario(usuario: Usuario): string {
    return this.normalizarTexto(usuario.status) === 'inativo' ? 'usuario-inativo' : '';
  }

  formatarDataBR(valor: any): string {
    if (!valor) {
      return '—';
    }

    if (typeof valor === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(valor)) {
      const [ano, mes, dia] = valor.split('-');
      return `${dia}/${mes}/${ano}`;
    }

    const data = new Date(valor);

    if (Number.isNaN(data.getTime())) {
      return String(valor);
    }

    return data.toLocaleDateString('pt-BR');
  }

  enderecoCompleto(usuario: Usuario | null): string {
    if (!usuario) {
      return '—';
    }

    const partes = [
      usuario.logradouro,
      usuario.numero_endereco,
      usuario.complemento_endereco,
      usuario.bairro,
      usuario.cidade,
      usuario.estado,
      this.formatarCEP(usuario.cep)
    ].filter(valor => !!String(valor || '').trim());

    return partes.length ? partes.join(', ') : '—';
  }

  private normalizarUsuarioParaTela(usuario: any): Usuario {
    const tipoAcesso = usuario?.tipo_do_acesso ?? usuario?.tipoDoAcesso ?? usuario?.tipoAcesso ?? '';
    const mfaAtivo = usuario?.mfaAtivo ?? usuario?.mfa_ativo ?? usuario?.mfaConfigurado ?? false;

    return {
      ...usuario,
      cpf: this.formatarCpfCnpj(usuario?.cpf ?? usuario?.cnpj),
      cep: this.formatarCEP(usuario?.cep),
      telefone: this.exibirTelefoneFormatado(usuario?.telefone),
      nascimento: this.asInputDateString(usuario?.nascimento),
      tipo_do_acesso: (tipoAcesso || '').toString().toLowerCase(),
      status: (usuario?.status || 'ativo').toString().toLowerCase(),
      senha: '',
      confirmarSenha: '',
      mfaAtivo: this.booleanLike(mfaAtivo),
      mfaTipo: usuario?.mfaTipo ?? usuario?.mfa_tipo,
      mfaStatus: usuario?.mfaStatus ?? usuario?.mfa_status,
      criadoEm: usuario?.criadoEm ?? usuario?.criado_em,
      atualizadoEm: usuario?.atualizadoEm ?? usuario?.atualizado_em
    } as Usuario;
  }

  private montarPayloadUsuario(usuario: Partial<Usuario>, cadastro: boolean): Partial<Usuario> {
    const payload: Partial<Usuario> = {
      ...usuario,
      cpf: this.onlyDigits(usuario.cpf),
      cep: this.onlyDigits(usuario.cep),
      telefone: this.onlyDigits(usuario.telefone),
      email: (usuario.email || '').toString().trim().toLowerCase(),
      estado: (usuario.estado || '').toString().toUpperCase().trim(),
      tipo_do_acesso: (usuario.tipo_do_acesso || 'cliente').toString().toLowerCase().trim(),
      status: (usuario.status || 'ativo').toString().toLowerCase().trim()
    };

    if (!cadastro) {
      if (!payload.senha) {
        delete payload.senha;
      }

      delete payload.confirmarSenha;
    } else {
      delete payload.confirmarSenha;
    }

    return payload;
  }

  private booleanLike(valor: any): boolean {
    if (typeof valor === 'boolean') {
      return valor;
    }

    const texto = this.normalizarTexto(valor);

    return texto === 'true' || texto === '1' || texto === 'sim' || texto === 'ativo';
  }

  private onlyDigits(v: any): string {
    return (v ?? '').toString().replaceAll(/\D/g, '');
  }

  private normalizarTexto(valor: any): string {
    return (valor ?? '')
      .toString()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  private asInputDateString(v: any): string {
    if (!v) {
      return '';
    }

    if (typeof v === 'string') {
      if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
        return v;
      }

      const re = /^(\d{2})\/(\d{2})\/(\d{4})$/;
      const m = re.exec(v);

      if (m) {
        return `${m[3]}-${m[2]}-${m[1]}`;
      }

      const d = new Date(v);
      return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
    }

    if (v instanceof Date) {
      return v.toISOString().slice(0, 10);
    }

    try {
      const d = new Date(v);
      return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
    } catch {
      return '';
    }
  }
}
