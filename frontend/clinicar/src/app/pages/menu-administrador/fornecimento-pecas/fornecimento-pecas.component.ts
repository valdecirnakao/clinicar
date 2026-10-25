import { ContinuidadeService } from '../../../services/continuidade.service';
import { SelecaoCadastroComponent } from '../../../shared/tabelas/selecao-cadastro.component';
import { PaginacaoComponent } from '../../../shared/tabelas/paginacao.component';
import { ConsultaPaginadaService, PaginaCadastro } from '../../../shared/tabelas/consulta-paginada.service';
import { Subscription } from 'rxjs';
import { EstadoDuplicidade, ValidarDuplicidadeDirective } from '../../../shared/duplicidade/validar-duplicidade.directive';
import { UnidadePecaPipe } from '../../../shared/forms/unidade-peca.pipe';
import { podeAcessarEtapa } from '../../../shared/forms/etapas-cadastro';
import { FeedbackDirective } from '../../../shared/feedback/feedback.directive';
import { inject as injectFeedback } from '@angular/core';
import { NotificacaoService } from '../../../shared/feedback/notificacao.service';
import { Component, OnInit } from '@angular/core';
import { DestroyRef } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Observable, forkJoin, of, map, switchMap } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ContextoFornecedor, FluxoFornecedorService } from '../../../shared/fornecedores/fluxo-fornecedor.service';
import { fornecedorAtende } from '../../../shared/fornecedores/categorias-fornecedor';
import { aposFecharModal } from '../../../shared/fornecedores/transicao-modal';
import { FornecedorComponent } from '../fornecedor/fornecedor.component';
import { PecaComponent } from '../peca/peca.component';
import { FluxoPecaService } from '../../../shared/fornecedores/fluxo-peca.service';
import { FluxoEstoqueService } from '../../../shared/fornecedores/fluxo-estoque.service';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FieldHelpDirective } from '../../../shared/field-help/field-help.directive';
import { FieldHelpPanelComponent } from '../../../shared/field-help/field-help-panel.component';

import {
  FornecimentoPecasService,
  FornecimentoPeca,
  FornecimentoPecaRequest,
  FornecedorResumo,
  PecaResumo
} from './fornecimento-pecas.service';

import {
  FornecedorService,
  Fornecedor
} from '../fornecedor/fornecedor.service';

import {
  Peca,
  PecaService
} from '../peca/peca.service';

declare var bootstrap: any;

type ModoSelecao = 'cadastro' | 'edicao';
type AbaFornecimento = 'vinculo' | 'condicoes' | 'revisao';
type DirecaoOrdenacao = 'asc' | 'desc';
type ColunaOrdenacaoFornecimento =
  | 'fornecedor'
  | 'peca'
  | 'valorCusto'
  | 'prazoEntregaDias'
  | 'quantidadeMinima'
  | 'dataCadastro'
  | 'ativo';

type CampoObrigatorioFornecimento =
  | 'fornecedor'
  | 'peca'
  | 'valorCusto'
  | 'prazoEntregaDias'
  | 'quantidadeMinima'
  | 'dataCadastro';

@Component({
    selector: 'app-fornecimento-pecas',
    imports: [SelecaoCadastroComponent,PaginacaoComponent,FornecedorComponent, PecaComponent, ValidarDuplicidadeDirective, UnidadePecaPipe, FeedbackDirective, CommonModule, FormsModule, FieldHelpDirective, FieldHelpPanelComponent],
    templateUrl: './fornecimento-pecas.component.html',
    styleUrls: ['./fornecimento-pecas.component.css']
})
export class FornecimentoPecasComponent implements OnInit {
  cadastroAuxiliar: 'fornecedor' | 'peca' | null = null;
  iniciarCadastroAuxiliar(tipo: 'fornecedor' | 'peca'): void {
    if (this.cadastroAuxiliar) return;
    const modo = tipo === 'fornecedor' ? this.modoSelecaoFornecedor : this.modoSelecaoPeca;
    if (modo !== 'cadastro') return;
    aposFecharModal(tipo === 'fornecedor' ? 'modalFornecedor' : 'modalPeca', tipo === 'fornecedor' ? this.modalFornecedor : this.modalPeca,
      () => this.cadastroAuxiliar = tipo, this.destroyRef);
  }
  cancelarCadastroAuxiliar(): void {
    const tipo = this.cadastroAuxiliar;
    this.cadastroAuxiliar = null;
    if (tipo === 'fornecedor') this.modalFornecedor?.show();
    else if (tipo === 'peca') this.modalPeca?.show();
  }
  fornecedorCriadoNoFornecimento(fornecedor: Fornecedor): void {
    this.cadastroAuxiliar = null;
    if (!fornecedor.id || fornecedor.ativo === false) {
      this.notificacoes.aviso('O fornecedor foi salvo, mas não está disponível como ativo para este fornecimento.');
      this.modalFornecedor?.show(); return;
    }
    this.fornecedores = [...this.fornecedores.filter(f => f.id !== fornecedor.id), fornecedor];
    this.aplicarFiltroFornecedorEdit();
    this.novoFornecimento.fornecedor = { id: fornecedor.id, razaoSocial: fornecedor.razaoSocial, cnpj: fornecedor.cnpj };
    this.limparCampoInvalido('fornecedor');
    this.notificacoes.sucesso('Fornecedor cadastrado e selecionado para o fornecimento.');
    this.retomarFornecimentoAposCadastro();
  }
  pecaCriadaNoFornecimento(peca: Peca): void {
    this.cadastroAuxiliar = null;
    if (!peca.id) { this.notificacoes.aviso('Não foi possível selecionar a peça salva. Atualize a lista e selecione-a.'); this.modalPeca?.show(); return; }
    this.pecas = [...this.pecas.filter(p => p.id !== peca.id), peca];
    this.aplicarFiltroPecaEdit();
    this.novoFornecimento.peca = { id: peca.id, nome: peca.nome, fabricante: peca.fabricante, modelo: peca.modelo || '' };
    this.limparCampoInvalido('peca');
    this.notificacoes.sucesso('Peça cadastrada e selecionada para o fornecimento.');
    this.retomarFornecimentoAposCadastro();
  }
  private retomarFornecimentoAposCadastro(): void {
    if (this.novoFornecimento.fornecedor?.id && this.novoFornecimento.peca?.id) this.trocarAbaCadastroFornecimento('condicoes');
    else this.abaCadastroFornecimento = 'vinculo';
    this.modalCadastro?.show();
  }

  registrarDuplicidade(evento: { model: object; estado: EstadoDuplicidade }): void {
    this.duplicidades.set(evento.model, evento.estado);
    if (!evento.estado.duplicado) return;
    if (evento.model === this.novoFornecimento) this.abaCadastroFornecimento = 'vinculo'; else this.abaEdicaoFornecimento = 'vinculo';
  }
  duplicidades = new WeakMap<object, EstadoDuplicidade>();
  erroDuplicidade(model: object): string | null { return this.duplicidades.get(model)?.mensagem || null; }
  get fornecimentoNovoDuplicado(): boolean {
    return this.duplicidades.get(this.novoFornecimento)?.duplicado === true;
  }
  abrindoDuplicado = false;
  erroAoAbrirDuplicado = '';
  atualizarFornecimentoDuplicado(): void {
    const fornecedorId = this.novoFornecimento.fornecedor?.id;
    const pecaId = this.novoFornecimento.peca?.id;
    if (!this.fornecimentoNovoDuplicado || !fornecedorId || !pecaId || this.abrindoDuplicado) return;
    const rascunho = this.novoFornecimento;
    const origem = document.getElementById('modalCadastroFornecimento');
    const origemVisivel = origem?.classList.contains('show');
    this.abrindoDuplicado = true;
    this.erroAoAbrirDuplicado = '';
    this.fornecimentoPecaService.listarPorVinculo(fornecedorId,pecaId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: lista => {
        this.abrindoDuplicado = false;
        if (origemVisivel && !origem?.classList.contains('show')) return;
        if (rascunho !== this.novoFornecimento || fornecedorId !== this.novoFornecimento.fornecedor?.id || pecaId !== this.novoFornecimento.peca?.id) return;
        const existente = lista.find(f => f.fornecedor?.id === fornecedorId && f.peca?.id === pecaId);
        if (!existente) { this.erroAoAbrirDuplicado = 'O fornecimento não foi localizado. Confira a lista ou selecione novamente fornecedor e peça para refazer a verificação.'; return; }
        this.fornecimentoExistente = existente;
        aposFecharModal('modalCadastroFornecimento', this.modalCadastro, () => {
          this.abrirModalEdicao(existente);
          this.abaEdicaoFornecimento = 'condicoes';
          this.editandoExistenteNoFluxo = true;
          const el = document.getElementById('modalEdicaoFornecimento');
          const retornar = () => {
            if (this.editandoExistenteNoFluxo) {
              this.editandoExistenteNoFluxo = false;
              this.modalCadastro?.show();
            }
          };
          el?.addEventListener('hidden.bs.modal', retornar, { once: true });
          this.destroyRef.onDestroy(() => el?.removeEventListener('hidden.bs.modal', retornar));
        }, this.destroyRef);
      },
      error: () => { this.abrindoDuplicado = false; this.erroAoAbrirDuplicado = 'Não foi possível carregar o fornecimento existente. Tente novamente.'; }
    });
  }

  private readonly continuidade = injectFeedback(ContinuidadeService);
  private readonly notificacoes = injectFeedback(NotificacaoService);
  private readonly fluxoFornecedor = injectFeedback(FluxoFornecedorService);
  private readonly rota = injectFeedback(ActivatedRoute);
  private readonly destroyRef = injectFeedback(DestroyRef);
  private readonly fluxoEstoque = injectFeedback(FluxoEstoqueService);
  private readonly fluxoPeca = injectFeedback(FluxoPecaService);
  voltandoFornecedor = false;
  voltarAosFornecedores(origem: 'cadastro' | 'existente'): void {
    const id = origem === 'existente' ? this.fornecimentoExistente?.peca.id : this.novoFornecimento.peca?.id;
    if (!id || this.voltandoFornecedor) return;
    this.voltandoFornecedor = true;
    const modal = origem === 'existente' ? this.modalFornecimentoExistente : this.modalCadastro;
    aposFecharModal(origem === 'existente' ? 'modalFornecimentoExistente' : 'modalCadastroFornecimento', modal, () => {
      const falhou = () => { this.voltandoFornecedor = false; this.notificacoes.erro('Não foi possível retornar aos fornecedores. Tente novamente.'); modal?.show(); };
      this.fluxoPeca.continuar(id).then(ok => { if (!ok) falhou(); }).catch(falhou);
    }, this.destroyRef);
  }
  fornecimentoExistente: FornecimentoPeca | null = null;
  modalFornecimentoExistente: any;
  editandoExistenteNoFluxo = false;
  conferindoExistente = false;
  erroFornecimentoExistente = '';
  mostrarFornecimentoExistente(item: FornecimentoPeca): void {
    this.fornecimentoExistente = item;
    const el = document.getElementById('modalFornecimentoExistente');
    if (!el) return;
    this.modalFornecimentoExistente = bootstrap.Modal.getOrCreateInstance(el, { backdrop: 'static', keyboard: false });
    this.modalFornecimentoExistente.show();
  }
  editarFornecimentoExistente(): void {
    const item = this.fornecimentoExistente;
    if (!item) return;
    aposFecharModal('modalFornecimentoExistente', this.modalFornecimentoExistente, () => {
      this.abrirModalEdicao(item);
      this.editandoExistenteNoFluxo = true;
      document.getElementById('modalEdicaoFornecimento')?.addEventListener('hidden.bs.modal', () => {
        if (this.editandoExistenteNoFluxo && this.fornecimentoExistente) this.mostrarFornecimentoExistente(this.fornecimentoExistente);
        this.editandoExistenteNoFluxo = false;
      }, { once: true });
    }, this.destroyRef);
  }
  usarFornecimentoExistente(): void {
    const item = this.fornecimentoExistente;
    if (!item?.id || !item.ativo || this.conferindoExistente) return;
    this.conferindoExistente = true;
    this.erroFornecimentoExistente = '';
    forkJoin({ fornecimentos:this.consultaPaginada.registro<FornecimentoPeca>('fornecimento-pecas',item.id).pipe(map(atual=>[atual])),fornecedores:this.consultaPaginada.registro<Fornecedor>('fornecedor',item.fornecedor.id).pipe(map(fornecedor=>[fornecedor])) })
      .pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: ({ fornecimentos, fornecedores }) => {
          this.conferindoExistente = false;
          const atual = fornecimentos.find(f => f.id === item.id && f.fornecedor?.id === item.fornecedor.id && f.peca?.id === item.peca.id);
          const fornecedor = fornecedores.find(f => f.id === item.fornecedor.id);
          if (!atual || !atual.ativo || !fornecedor || fornecedor.ativo === false) {
            this.erroFornecimentoExistente = 'O fornecimento ou fornecedor não está mais disponível como ativo. Confira os cadastros antes de continuar.';
            return;
          }
          this.fornecimentoCadastrado = atual;
          aposFecharModal('modalFornecimentoExistente', this.modalFornecimentoExistente, () => this.mostrarContinuidadeEstoque(), this.destroyRef);
        },
        error: () => { this.conferindoExistente = false; this.erroFornecimentoExistente = 'Não foi possível conferir o fornecimento. Tente novamente.'; }
      });
  }
  mostrarContinuidadeEstoque(): void {
    const el = document.getElementById('modalContinuidadeEstoqueFornecedor');
    if (!el || !this.fornecimentoCadastrado?.peca?.id) return;
    this.continuidade.registrar('controleEstoquePecas',{continuarEstoque:'1',pecaId:String(this.fornecimentoCadastrado.peca.id)});
    this.mensagemContinuidadeEstoque = '';
    this.abrindoEstoque = false;
    this.modalContinuidadeEstoque = bootstrap.Modal.getOrCreateInstance(el, { backdrop: 'static', keyboard: false });
    this.modalContinuidadeEstoque.show();
  }
  fornecimentoCadastrado: Partial<FornecimentoPeca> | null = null;
  modalContinuidadeEstoque: any;
  salvandoCadastro = false;
  mensagemContinuidadeEstoque = '';
  abrindoEstoque = false;

  continuarCadastroEstoque(): void {
    const id = this.fornecimentoCadastrado?.peca?.id;
    if (!id || this.abrindoEstoque) return;
    this.abrindoEstoque = true;
    this.mensagemContinuidadeEstoque = '';
    aposFecharModal('modalContinuidadeEstoqueFornecedor', this.modalContinuidadeEstoque, () => {
      const falhou = () => {
        this.abrindoEstoque = false;
        this.mensagemContinuidadeEstoque = 'Não foi possível abrir o estoque. Tente novamente.';
        this.modalContinuidadeEstoque?.show();
      };
      this.fluxoEstoque.continuar(id).then(ok => { if (!ok) falhou(); }).catch(falhou);
    }, this.destroyRef);
  }
  fluxoFornecedorAtivo = false;
  modalContinuidadePeca: any;

  voltarOpcoesFornecedor(): void {
    if (!this.fluxoFornecedorAtivo || this.modoSelecaoPeca !== 'cadastro' || !this.novoFornecimento.fornecedor?.id) return;
    const elemento = document.getElementById('modalContinuidadePecaFornecedor');
    if (!elemento) return;
    aposFecharModal('modalPeca', this.modalPeca, () => {
      this.modalContinuidadePeca = bootstrap.Modal.getOrCreateInstance(elemento, { backdrop: 'static', keyboard: false });
      this.modalContinuidadePeca.show();
    }, this.destroyRef);
  }

  continuarEscolhaPeca(nova: boolean): void {
    const fornecedorId = this.novoFornecimento.fornecedor?.id;
    if (!this.fluxoFornecedorAtivo || !fornecedorId) return;
    aposFecharModal('modalContinuidadePecaFornecedor', this.modalContinuidadePeca, () => {
      if (nova) void this.fluxoFornecedor.iniciar('peca', true, fornecedorId);
      else this.abrirModalPeca('cadastro');
    }, this.destroyRef);
  }

  concluirContinuidadePeca(): void {
    this.fluxoFornecedorAtivo = false;
    this.modalContinuidadePeca?.hide();
  }

  iniciarFornecimentoDoFornecedor(): void {
    ((this.modoPaginado?this.fluxoFornecedor.carregarContexto(this.rota,'peca').pipe(switchMap(contexto=>{
      if(!contexto)return of({contexto:null,fornecedores:[],pecas:[],fornecimentos:[]});
      return forkJoin({contexto:of(contexto),fornecedores:of([contexto.fornecedor]),pecas:contexto.itemId?this.consultaPaginada.registro<Peca>('peca',contexto.itemId).pipe(map(item=>[item])):of([]),fornecimentos:contexto.itemId?this.fornecimentoPecaService.listarPorVinculo(contexto.fornecedor.id!,contexto.itemId):of([])});
    })): forkJoin({
      contexto: this.fluxoFornecedor.carregarContexto(this.rota, 'peca'),
      fornecedores: this.fornecedorService.listarTodos(),
      fornecimentos: this.fornecimentoPecaService.listarTodosFornecimentos(),
      pecas: this.pecaService.listarTodasPecas()
    })) as Observable<{contexto:ContextoFornecedor|null;fornecedores:Fornecedor[];pecas:Peca[];fornecimentos:FornecimentoPeca[]}>).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: ({ contexto, fornecedores, pecas, fornecimentos }) => {
        if (!contexto) return;
        this.fornecedores = (fornecedores ?? []).filter(f => f.ativo !== false && fornecedorAtende(f.itemFornecido, 'peca'));
        this.fornecedoresFiltrados = [...this.fornecedores];
        this.pecas = pecas ?? [];
        this.pecasFiltradas = [...this.pecas];
        const peca = contexto.itemId ? this.pecas.find(item => item.id === contexto.itemId) : undefined;
        this.abrirModalCadastro(false);
        if (contexto.itemId && !peca) {
          this.mensagemErroModal = 'A peça informada não está disponível. Selecione outra peça para este fornecedor.';
        }
        this.fluxoFornecedorAtivo = true;
        this.novoFornecimento.fornecedor = { ...contexto.fornecedor, id: contexto.fornecedor.id! };
        document.getElementById('modalCadastroFornecimento')?.addEventListener('hidden.bs.modal', () => {
          if (this.novoFornecimento.peca) this.fluxoFornecedorAtivo = false;
        }, { once: true });
        this.fluxoFornecedor.consumirContexto(this.rota);
        if (peca) {
          this.novoFornecimento.peca = { id: peca.id!, nome: peca.nome, fabricante: peca.fabricante, modelo: peca.modelo ?? '' };
          const existente = fornecimentos.find(f => f.fornecedor?.id === contexto.fornecedor.id && f.peca?.id === peca.id);
          if (existente) this.mostrarFornecimentoExistente(existente);
          else {
            this.trocarAbaCadastroFornecimento('condicoes');
            this.modalCadastro?.show();
          }
        } else {
          if (this.pecas.length === 0) this.voltarOpcoesFornecedor();
          else this.abrirModalPeca('cadastro');
        }
      },
      error: () => this.notificacoes.erro('Não foi possível carregar os dados para continuar o fornecimento da peça. Atualize a página para tentar novamente.')
    });
  }

  fornecimentosPeca: FornecimentoPeca[] = [];
  private todos: FornecimentoPeca[] = [];

  novoFornecimento: Partial<FornecimentoPeca> = {};
  edit: Partial<FornecimentoPeca> = {};
  editId: number | null = null;
  fornecimentoDetalhe: FornecimentoPeca | null = null;
  fornecimentoParaExcluir: FornecimentoPeca | null = null;

  modalCadastro: any;
  modalEdicao: any;
  modalFornecedor: any;
  modalPeca: any;
  modalDetalhes: any;
  modalConfirmacao: any;

  loading = false;
  errorMsg = '';
  mensagemErroModal = '';
  camposInvalidos: CampoObrigatorioFornecimento[] = [];

  fornecedores: Fornecedor[] = [];
  fornecedoresFiltrados: Fornecedor[] = [];
  razaoSocialFiltroEdit = '';

  pecas: Peca[] = [];
  pecasFiltradas: Peca[] = [];
  descricaoFiltroEdit = '';

  filtroTexto = '';
  filtroStatus = '';
  filtroFornecedor = '';
  filtroPeca = '';

  paginaAtual = 1;
  itensPorPagina = 10;
  opcoesItensPorPagina = [5, 10, 20, 50];

  colunaOrdenacao: ColunaOrdenacaoFornecimento = 'fornecedor';
  direcaoOrdenacao: DirecaoOrdenacao = 'asc';

  abaCadastroFornecimento: AbaFornecimento = 'vinculo';
  abaEdicaoFornecimento: AbaFornecimento = 'vinculo';

  modoSelecaoFornecedor: ModoSelecao = 'cadastro';
  modoSelecaoPeca: ModoSelecao = 'cadastro';

  private readonly camposObrigatorios: CampoObrigatorioFornecimento[] = [
    'fornecedor',
    'peca',
    'valorCusto',
    'prazoEntregaDias',
    'quantidadeMinima',
    'dataCadastro'
  ];

  constructor(
    private readonly fornecedorService: FornecedorService,
    private readonly pecaService: PecaService,
    private readonly fornecimentoPecaService: FornecimentoPecasService,
    private readonly location: Location
  ) {}

  modoPaginado=false;
  private readonly consultaPaginada=injectFeedback(ConsultaPaginadaService);
  private paginaServidor?:PaginaCadastro<FornecimentoPeca>;
  private consultaPagina?:Subscription;
  private filtroTimer?:ReturnType<typeof setTimeout>;
  private carregarPagina(esperar=false):void {
    if(!this.modoPaginado)return;
    clearTimeout(this.filtroTimer);
    if(esperar){this.filtroTimer=setTimeout(()=>this.carregarPagina(),250);return;}
    this.consultaPagina?.unsubscribe();this.loading=true;this.errorMsg='';
    this.consultaPagina=this.consultaPaginada.consultar<FornecimentoPeca>('fornecimento-pecas',{pagina:this.paginaAtual-1,tamanho:this.itensPorPagina,busca:this.filtroTexto,ordenar:({fornecedor:'fornecedor.razaoSocial',peca:'peca.nome'} as Record<string,string>)[this.colunaOrdenacao]??this.colunaOrdenacao,decrescente:this.direcaoOrdenacao==='desc',ativo:this.filtroStatus==='ativo'?'true':this.filtroStatus==='inativo'?'false':'','fornecedor.id':this.filtroFornecedor,'peca.id':this.filtroPeca}).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({next:pagina=>{
      this.paginaServidor=pagina;this.todos=pagina.content;this.fornecimentosPeca=pagina.content;this.loading=false;

      if(this.paginaAtual>Math.max(1,pagina.totalPages)){this.paginaAtual=Math.max(1,pagina.totalPages);this.carregarPagina();}
    },error:erro=>{this.loading=false;this.errorMsg=this.extrairMensagemErro(erro,'Não foi possível carregar a página.');}});
  }
  ngOnInit(): void {this.modoPaginado=true;this.destroyRef.onDestroy(()=>clearTimeout(this.filtroTimer));
    if (this.fluxoFornecedor.possuiContexto(this.rota)) {
      this.iniciarFornecimentoDoFornecedor();
    } else {
      this.carregarFornecedores();
      this.carregarPecas();
    }
    this.recarregarFornecimentos();
  }

  // ======================================================
  // CARREGAMENTO E LISTAGEM
  // ======================================================

  recarregarFornecimentos(): void {if(this.modoPaginado){this.carregarPagina();return;}
    this.loading = true;
    this.errorMsg = '';

    this.fornecimentoPecaService.listarTodosFornecimentos().subscribe({
      next: (lista) => {
        this.todos = lista ?? [];
        this.fornecimentosPeca = [...this.todos];
        this.loading = false;
        this.cancelarEdicao();
        this.ajustarPaginaAtual();
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

  get totalFornecimentos(): number {if(this.modoPaginado)return this.paginaServidor?.resumo['total']??0;
    return this.todos.length;
  }

  get totalAtivos(): number {if(this.modoPaginado)return this.paginaServidor?.resumo['ativos']??0;
    return this.todos.filter(item => this.fornecimentoAtivo(item)).length;
  }

  get totalInativos(): number {if(this.modoPaginado)return this.paginaServidor?.resumo['inativos']??0;
    return this.todos.filter(item => !this.fornecimentoAtivo(item)).length;
  }

  get totalFornecedoresVinculados(): number {if(this.modoPaginado)return this.paginaServidor?.resumo['fornecedores']??0;
    return new Set(
      this.todos
        .map(item => item.fornecedor?.id)
        .filter(id => id !== null && id !== undefined)
    ).size;
  }

  get totalPecasVinculadas(): number {if(this.modoPaginado)return this.paginaServidor?.resumo['itens']??0;
    return new Set(
      this.todos
        .map(item => item.peca?.id)
        .filter(id => id !== null && id !== undefined)
    ).size;
  }

  get valorMedioFornecimento(): number {if(this.modoPaginado)return this.paginaServidor?.resumo['valorMedio']??0;
    const valores = this.todos
      .map(item => this.moedaParaNumero(item.valorCusto))
      .filter(valor => valor > 0);

    if (!valores.length) {
      return 0;
    }

    return valores.reduce((acc, valor) => acc + valor, 0) / valores.length;
  }

  get fornecedoresFiltroDisponiveis(): FornecedorResumo[] {if(this.modoPaginado)return this.paginaServidor?.opcoes['fornecedores']??[];
    const mapa = new Map<number, FornecedorResumo>();

    this.todos.forEach(item => {
      const fornecedor = item.fornecedor;

      if (fornecedor?.id) {
        mapa.set(Number(fornecedor.id), fornecedor);
      }
    });

    return Array.from(mapa.values())
      .sort((a, b) => (a.razaoSocial || '').localeCompare(b.razaoSocial || '', 'pt-BR'));
  }

  get pecasFiltroDisponiveis(): PecaResumo[] {if(this.modoPaginado)return this.paginaServidor?.opcoes['itens']??[];
    const mapa = new Map<number, PecaResumo>();

    this.todos.forEach(item => {
      const peca = item.peca;

      if (peca?.id) {
        mapa.set(Number(peca.id), peca);
      }
    });

    return Array.from(mapa.values())
      .sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt-BR'));
  }

  get possuiFiltrosAplicados(): boolean {
    return !!(
      this.filtroTexto.trim() ||
      this.filtroStatus.trim() ||
      this.filtroFornecedor.trim() ||
      this.filtroPeca.trim()
    );
  }

  get fornecimentosFiltrados(): FornecimentoPeca[] {if(this.modoPaginado)return this.todos;
    const texto = this.normalizarTexto(this.filtroTexto);
    const textoNumerico = this.onlyDigits(this.filtroTexto);
    const status = this.filtroStatus.trim();
    const idFornecedor = Number(this.filtroFornecedor);
    const idPeca = Number(this.filtroPeca);

    const filtrados = this.todos.filter(item => {
      const atendeTexto = !texto ||
        this.normalizarTexto(this.fornecedorRazaoSocial(item)).includes(texto) ||
        this.onlyDigits(item.fornecedor?.cnpj).includes(textoNumerico) ||
        this.normalizarTexto(this.formatarCNPJ(item.fornecedor?.cnpj)).includes(texto) ||
        this.normalizarTexto(this.descricaoPeca(item)).includes(texto) ||
        this.normalizarTexto(item.peca?.fabricante).includes(texto) ||
        this.normalizarTexto(item.peca?.modelo).includes(texto) ||
        this.normalizarTexto(this.statusTexto(item)).includes(texto) ||
        this.normalizarTexto(this.formatarMoedaBR(item.valorCusto)).includes(texto);

      const atendeStatus = !status ||
        (status === 'ativo' && this.fornecimentoAtivo(item)) ||
        (status === 'inativo' && !this.fornecimentoAtivo(item));

      const atendeFornecedor = !idFornecedor || Number(item.fornecedor?.id) === idFornecedor;
      const atendePeca = !idPeca || Number(item.peca?.id) === idPeca;

      return atendeTexto && atendeStatus && atendeFornecedor && atendePeca;
    });

    return this.ordenarFornecimentos(filtrados);
  }

  get totalRegistrosFiltrados(): number {if(this.modoPaginado)return this.paginaServidor?.totalElements??0;
    return this.fornecimentosFiltrados.length;
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

  get fornecimentosPaginados(): FornecimentoPeca[] {if(this.modoPaginado)return this.todos;
    this.ajustarPaginaAtual();

    const inicio = (this.paginaAtual - 1) * this.itensPorPagina;
    const fim = inicio + this.itensPorPagina;

    return this.fornecimentosFiltrados.slice(inicio, fim);
  }

  aoAlterarFiltros(): void {
    this.paginaAtual = 1;
  this.carregarPagina(true); }

  limparFiltros(): void {
    this.filtroTexto = '';
    this.filtroStatus = '';
    this.filtroFornecedor = '';
    this.filtroPeca = '';
    this.paginaAtual = 1;
  this.carregarPagina(); }

  aoAlterarItensPorPagina(): void {
    this.paginaAtual = 1;
    this.ajustarPaginaAtual();
  this.carregarPagina(); }

  irParaPagina(pagina: number): void {
    if (pagina < 1 || pagina > this.totalPaginas) {
      this.carregarPagina();return;
    }

    this.paginaAtual = pagina;
  this.carregarPagina(); }

  paginaAnterior(): void {
    if (this.paginaAtual > 1) {
      this.paginaAtual--;
    }
  this.carregarPagina(); }

  proximaPagina(): void {
    if (this.paginaAtual < this.totalPaginas) {
      this.paginaAtual++;
    }
  this.carregarPagina(); }

  paginasVisiveis(): number[] {
    const inicio = Math.max(1, this.paginaAtual - 2);
    const fim = Math.min(this.totalPaginas, this.paginaAtual + 2);
    const paginas: number[] = [];

    for (let pagina = inicio; pagina <= fim; pagina++) {
      paginas.push(pagina);
    }

    return paginas;
  }

  ordenarPor(coluna: ColunaOrdenacaoFornecimento): void {
    if (this.colunaOrdenacao === coluna) {
      this.direcaoOrdenacao = this.direcaoOrdenacao === 'asc' ? 'desc' : 'asc';
      this.carregarPagina();return;
    }

    this.colunaOrdenacao = coluna;
    this.direcaoOrdenacao = 'asc';
  this.carregarPagina(); }

  iconeOrdenacao(coluna: ColunaOrdenacaoFornecimento): string {
    if (this.colunaOrdenacao !== coluna) {
      return 'bi-arrow-down-up';
    }

    return this.direcaoOrdenacao === 'asc'
      ? 'bi-sort-alpha-down'
      : 'bi-sort-alpha-up';
  }

  private ordenarFornecimentos(lista: FornecimentoPeca[]): FornecimentoPeca[] {
    const direcao = this.direcaoOrdenacao === 'asc' ? 1 : -1;

    return [...lista].sort((a, b) => {
      const va = this.valorOrdenacao(a, this.colunaOrdenacao);
      const vb = this.valorOrdenacao(b, this.colunaOrdenacao);

      if (typeof va === 'number' && typeof vb === 'number') {
        return (va - vb) * direcao;
      }

      return String(va).localeCompare(String(vb), 'pt-BR') * direcao;
    });
  }

  private valorOrdenacao(item: FornecimentoPeca, coluna: ColunaOrdenacaoFornecimento): string | number {
    switch (coluna) {
      case 'fornecedor':
        return this.fornecedorRazaoSocial(item).toLowerCase();
      case 'peca':
        return this.descricaoPeca(item).toLowerCase();
      case 'valorCusto':
        return this.moedaParaNumero(item.valorCusto);
      case 'prazoEntregaDias':
        return Number(item.prazoEntregaDias || 0);
      case 'quantidadeMinima':
        return Number(item.quantidadeMinima || 0);
      case 'dataCadastro':
        return this.asInputDateString(item.dataCadastro);
      case 'ativo':
        return this.fornecimentoAtivo(item) ? 1 : 0;
      default:
        return '';
    }
  }

  private ajustarPaginaAtual(): void {
    if (this.paginaAtual > this.totalPaginas) {
      this.paginaAtual = this.totalPaginas;
    }

    if (this.paginaAtual < 1) {
      this.paginaAtual = 1;
    }
  }

  trackByFornecimento(_: number, f: FornecimentoPeca): number {
    return f.id ?? 0;
  }

  trackByFornecedor(_: number, f: Fornecedor): number {
    return f.id ?? 0;
  }

  trackByPeca(_: number, p: Peca): number {
    return p.id ?? 0;
  }

  // ======================================================
  // CADASTRO E EDIÇÃO
  // ======================================================

  abrirModalCadastro(exibir = true): void {
    this.fluxoFornecedorAtivo = false;
    this.camposInvalidos = [];
    this.mensagemErroModal = '';
    this.abaCadastroFornecimento = 'vinculo';

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

    this.modalCadastro = bootstrap.Modal.getOrCreateInstance(el, {
      backdrop: 'static',
      keyboard: false
    });
    if (exibir) this.modalCadastro.show();
  }

  salvarNovoFornecimento(): void {
    if (this.salvandoCadastro) return;
    const erroValidacao = this.validarFornecimento(this.novoFornecimento, true);

    if (erroValidacao) {
      this.mensagemErroModal = erroValidacao;
      return;
    }

    this.mensagemErroModal = '';
    const payload = this.montarPayload(this.novoFornecimento);
    const rascunho = { ...this.novoFornecimento };
    this.salvandoCadastro = true;

    this.fornecimentoPecaService.cadastrar(payload).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (salvo) => {
        this.salvandoCadastro = false;
        this.fornecimentoCadastrado = { ...rascunho, ...salvo, peca: salvo.peca?.id ? salvo.peca : rascunho.peca };
        this.notificacoes.sucesso('Fornecimento de peça cadastrado com sucesso.');
        this.recarregarFornecimentos();
        aposFecharModal('modalCadastroFornecimento', this.modalCadastro, () => {
          const elemento = document.getElementById('modalContinuidadeEstoqueFornecedor');
          if (!elemento || !this.fornecimentoCadastrado?.peca?.id) return;
          this.mensagemContinuidadeEstoque = '';
          this.abrindoEstoque = false;
          this.modalContinuidadeEstoque = bootstrap.Modal.getOrCreateInstance(elemento, { backdrop: 'static', keyboard: false });
          this.modalContinuidadeEstoque.show();
        }, this.destroyRef);
      },
      error: (erro) => {
        this.salvandoCadastro = false;
        console.error('Erro ao cadastrar fornecimento:', erro);

        this.mensagemErroModal = this.extrairMensagemErro(
          erro,
          'Erro ao cadastrar fornecimento de peça.'
        );
      }
    });
  }

  abrirModalEdicao(fornecimento: FornecimentoPeca): void {
    this.camposInvalidos = [];
    this.mensagemErroModal = '';
    this.abaEdicaoFornecimento = 'vinculo';
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

    this.modalEdicao = bootstrap.Modal.getOrCreateInstance(el, {
      backdrop: 'static',
      keyboard: false
    });
    this.modalEdicao.show();
  }

  salvarEdicaoModal(): void {
    if (!this.editId) {
      return;
    }

    const erroValidacao = this.validarFornecimento(this.edit, true);

    if (erroValidacao) {
      this.mensagemErroModal = erroValidacao;
      return;
    }

    this.mensagemErroModal = '';
    const payload = this.montarPayload(this.edit);

    this.fornecimentoPecaService
      .atualizarFornecimentoPeca(this.editId, payload)
      .subscribe({
        next: (salvo) => {
          if (this.editandoExistenteNoFluxo) {
            this.fornecimentoExistente = { ...this.edit, ...salvo } as FornecimentoPeca;
          }
          if (this.editandoExistenteNoFluxo && this.fornecimentoExistente?.ativo) {
            this.editandoExistenteNoFluxo = false;
            this.fornecimentoCadastrado = this.fornecimentoExistente;
            aposFecharModal('modalEdicaoFornecimento', this.modalEdicao, () => this.mostrarContinuidadeEstoque(), this.destroyRef);
          } else this.modalEdicao?.hide();
          this.cancelarEdicao();
          this.notificacoes.sucesso('Fornecimento de peça atualizado com sucesso.');
          this.recarregarFornecimentos();
        },
        error: (erro) => {
          console.error('Erro ao salvar alterações:', erro);

          this.mensagemErroModal = this.extrairMensagemErro(
            erro,
            'Erro ao salvar alterações.'
          );
        }
      });
  }

  cancelarEdicao(): void {
    this.editId = null;
    this.edit = {};
    this.razaoSocialFiltroEdit = '';
    this.descricaoFiltroEdit = '';
    this.mensagemErroModal = '';
    this.camposInvalidos = [];
  }

  abrirDetalhes(fornecimento: FornecimentoPeca): void {
    this.fornecimentoDetalhe = fornecimento;

    const el = document.getElementById('modalDetalhesFornecimento');

    if (!el) {
      console.error('Modal modalDetalhesFornecimento não encontrado.');
      return;
    }

    this.modalDetalhes = bootstrap.Modal.getOrCreateInstance(el);
    this.modalDetalhes.show();
  }

  solicitarExclusao(fornecimento: FornecimentoPeca): void {
    this.fornecimentoParaExcluir = fornecimento;

    const el = document.getElementById('modalConfirmacaoExclusaoFornecimento');

    if (!el) {
      console.error('Modal modalConfirmacaoExclusaoFornecimento não encontrado.');
      return;
    }

    this.modalConfirmacao = bootstrap.Modal.getOrCreateInstance(el);
    this.modalConfirmacao.show();
  }

  confirmarExclusao(): void {
    const id = this.fornecimentoParaExcluir?.id;

    if (!id) {
      return;
    }

    this.fornecimentoPecaService.removerFornecimentoPeca(id).subscribe({
      next: () => {
        this.modalConfirmacao?.hide();
        this.fornecimentoParaExcluir = null;
        this.notificacoes.sucesso('Fornecimento de peça removido com sucesso.');
        this.recarregarFornecimentos();
      },
      error: (erro) => {
        console.error('Erro ao excluir fornecimento:', erro);

        this.errorMsg = this.extrairMensagemErro(
          erro,
          'Erro ao excluir fornecimento.'
        );
      }
    });
  }

  excluir(id?: number): void {
    const fornecimento = this.todos.find(item => item.id === id);

    if (fornecimento) {
      this.solicitarExclusao(fornecimento);
    }
  }

  voltar(): void {
    this.location.back();
  }

  // ======================================================
  // ABAS, VALIDAÇÃO E PROGRESSO
  // ======================================================

  podeAcessarAbaCadastro(aba: AbaFornecimento): boolean {
    if (aba !== 'vinculo' && this.erroDuplicidade(this.novoFornecimento)) return false;
    const ordem: (AbaFornecimento)[] = ['vinculo', 'condicoes', 'revisao'];
    return podeAcessarEtapa(ordem, this.abaCadastroFornecimento, aba, etapa => {
      switch (etapa) {
        case 'vinculo': return !this.vinculoPendente(this.novoFornecimento);
        case 'condicoes': return !this.condicoesPendentes(this.novoFornecimento);
        case 'revisao': return true;
      }
    });
  }

  get podeAvancarCadastro(): boolean {
    const ordem: (AbaFornecimento)[] = ['vinculo', 'condicoes', 'revisao'];
    const proxima = ordem[ordem.indexOf(this.abaCadastroFornecimento) + 1];
    return !!proxima && this.podeAcessarAbaCadastro(proxima);
  }

  trocarAbaCadastroFornecimento(aba: AbaFornecimento): void {
    if (!this.podeAcessarAbaCadastro(aba)) return;
    this.abaCadastroFornecimento = aba;
  }

  trocarAbaEdicaoFornecimento(aba: AbaFornecimento): void {
    this.abaEdicaoFornecimento = aba;
  }

  cadastroAbaAnterior(): void {
    const ordem: AbaFornecimento[] = ['vinculo', 'condicoes', 'revisao'];
    const indice = ordem.indexOf(this.abaCadastroFornecimento);

    if (indice > 0) {
      this.abaCadastroFornecimento = ordem[indice - 1];
    }
  }

  cadastroAbaProxima(): void {
    if (!this.podeAvancarCadastro) return;
    const ordem: AbaFornecimento[] = ['vinculo', 'condicoes', 'revisao'];
    const indice = ordem.indexOf(this.abaCadastroFornecimento);

    if (indice >= 0 && indice < ordem.length - 1) {
      this.abaCadastroFornecimento = ordem[indice + 1];
    }
  }

  edicaoAbaAnterior(): void {
    const ordem: AbaFornecimento[] = ['vinculo', 'condicoes', 'revisao'];
    const indice = ordem.indexOf(this.abaEdicaoFornecimento);

    if (indice > 0) {
      this.abaEdicaoFornecimento = ordem[indice - 1];
    }
  }

  edicaoAbaProxima(): void {
    const ordem: AbaFornecimento[] = ['vinculo', 'condicoes', 'revisao'];
    const indice = ordem.indexOf(this.abaEdicaoFornecimento);

    if (indice >= 0 && indice < ordem.length - 1) {
      this.abaEdicaoFornecimento = ordem[indice + 1];
    }
  }

  cadastroEhPrimeiraAba(): boolean {
    return this.abaCadastroFornecimento === 'vinculo';
  }

  cadastroEhUltimaAba(): boolean {
    return this.abaCadastroFornecimento === 'revisao';
  }

  edicaoEhPrimeiraAba(): boolean {
    return this.abaEdicaoFornecimento === 'vinculo';
  }

  edicaoEhUltimaAba(): boolean {
    return this.abaEdicaoFornecimento === 'revisao';
  }

  get cadastroProntoParaSalvar(): boolean {
    return this.validarFornecimento(this.novoFornecimento, false) === null;
  }

  get edicaoProntaParaSalvar(): boolean {
    return this.validarFornecimento(this.edit, false) === null;
  }

  get mensagemBloqueioCadastro(): string {
    return this.validarFornecimento(this.novoFornecimento, false) || '';
  }

  get mensagemBloqueioEdicao(): string {
    return this.validarFornecimento(this.edit, false) || '';
  }

  get progressoCadastroFornecimento(): number {
    return this.progressoFormulario(this.novoFornecimento);
  }

  get progressoEdicaoFornecimento(): number {
    return this.progressoFormulario(this.edit);
  }

  vinculoPendente(model: Partial<FornecimentoPeca>): boolean {
    return this.fornecedorInvalido(model) || this.pecaInvalida(model);
  }

  condicoesPendentes(model: Partial<FornecimentoPeca>): boolean {
    return this.valorCustoInvalido(model) ||
      this.prazoEntregaInvalido(model) ||
      this.quantidadeMinimaInvalida(model) ||
      this.dataCadastroInvalida(model);
  }

  campoMarcadoInvalido(campo: CampoObrigatorioFornecimento, model: Partial<FornecimentoPeca> = this.novoFornecimento): boolean {
    const validacoes = {
      fornecedor: () => this.fornecedorInvalido(model), peca: () => this.pecaInvalida(model),
      valorCusto: () => this.valorCustoInvalido(model), prazoEntregaDias: () => this.prazoEntregaInvalido(model),
      quantidadeMinima: () => this.quantidadeMinimaInvalida(model), dataCadastro: () => this.dataCadastroInvalida(model)
    };
    return (model === this.novoFornecimento || this.camposInvalidos.includes(campo)) && validacoes[campo]();
  }

  limparCampoInvalido(campo: CampoObrigatorioFornecimento): void {
    if (!this.camposInvalidos.includes(campo)) {
      return;
    }

    this.camposInvalidos = this.camposInvalidos.filter(item => item !== campo);

    if (!this.camposInvalidos.length) {
      this.mensagemErroModal = '';
    }
  }

  fornecedorInvalido(model: Partial<FornecimentoPeca>): boolean {
    return !model.fornecedor?.id;
  }

  pecaInvalida(model: Partial<FornecimentoPeca>): boolean {
    return !model.peca?.id;
  }

  valorCustoInvalido(model: Partial<FornecimentoPeca>): boolean {
    return this.moedaParaNumero(model.valorCusto) <= 0;
  }

  prazoEntregaInvalido(model: Partial<FornecimentoPeca>): boolean {
    const numero = Number(model.prazoEntregaDias);
    return String(model.prazoEntregaDias ?? '').trim() === '' || !Number.isInteger(numero) || numero < 0;
  }

  quantidadeMinimaInvalida(model: Partial<FornecimentoPeca>): boolean {
    const numero = Number(model.quantidadeMinima);

    return Number.isNaN(numero) || numero <= 0;
  }

  dataCadastroInvalida(model: Partial<FornecimentoPeca>): boolean {
    return !this.asInputDateString(model.dataCadastro);
  }

  normalizarPrazoEntregaCadastro(): void {
    if (String(this.novoFornecimento.prazoEntregaDias ?? '').trim() === '') return;
    this.novoFornecimento.prazoEntregaDias = this.normalizarNumeroInteiroMinimo(
      this.novoFornecimento.prazoEntregaDias,
      0
    );
    this.limparCampoInvalido('prazoEntregaDias');
  }

  normalizarPrazoEntregaEdicao(): void {
    if (String(this.edit.prazoEntregaDias ?? '').trim() === '') return;
    this.edit.prazoEntregaDias = this.normalizarNumeroInteiroMinimo(
      this.edit.prazoEntregaDias,
      0
    );
    this.limparCampoInvalido('prazoEntregaDias');
  }

  normalizarQuantidadeMinimaCadastro(): void {
    if (String(this.novoFornecimento.quantidadeMinima ?? '').trim() === '') return;
    this.novoFornecimento.quantidadeMinima = this.normalizarNumeroInteiroMinimo(
      this.novoFornecimento.quantidadeMinima,
      1
    );
    this.limparCampoInvalido('quantidadeMinima');
  }

  normalizarQuantidadeMinimaEdicao(): void {
    if (String(this.edit.quantidadeMinima ?? '').trim() === '') return;
    this.edit.quantidadeMinima = this.normalizarNumeroInteiroMinimo(
      this.edit.quantidadeMinima,
      1
    );
    this.limparCampoInvalido('quantidadeMinima');
  }

  // ======================================================
  // FORNECEDORES
  // ======================================================

  private carregarFornecedores(): void {if(this.modoPaginado)return;
    this.fornecedorService.listarTodos().subscribe({
      next: (lista) => {
        this.fornecedores = (lista ?? []).filter(f => f.ativo !== false && fornecedorAtende(f.itemFornecido, 'peca'));
        this.fornecedoresFiltrados = [...this.fornecedores];
      },
      error: (erro) => {
        console.error('Falha ao carregar fornecedores:', erro);
      }
    });
  }

  abrirModalFornecedor(modo: ModoSelecao): void {
    if (modo === 'edicao' && this.editandoExistenteNoFluxo) return;
    this.modoSelecaoFornecedor = modo;
    this.razaoSocialFiltroEdit = '';
    this.aplicarFiltroFornecedorEdit();

    aposFecharModal(modo === 'cadastro' ? 'modalCadastroFornecimento' : 'modalEdicaoFornecimento', modo === 'cadastro' ? this.modalCadastro : this.modalEdicao, () => {
      const el = document.getElementById('modalFornecedor');

      if (!el) {
        console.error('Modal modalFornecedor não encontrado.');
        return;
      }

      this.modalFornecedor = bootstrap.Modal.getOrCreateInstance(el, {
        backdrop: 'static',
        keyboard: false
      });
      this.modalFornecedor.show();
    }, this.destroyRef);
  }

  fecharModalFornecedor(): void {
    aposFecharModal('modalFornecedor', this.modalFornecedor, () => this.reabrirModalOrigemFornecedor(), this.destroyRef);
  }

  aplicarFiltroFornecedorEdit(): void {
    const t = this.normalizarTexto(this.razaoSocialFiltroEdit);
    const tNum = this.onlyDigits(this.razaoSocialFiltroEdit);

    if (!t) {
      this.fornecedoresFiltrados = [...this.fornecedores];
      return;
    }

    this.fornecedoresFiltrados = this.fornecedores.filter(f => {
      const razao = this.normalizarTexto(f.razaoSocial);
      const fantasia = this.normalizarTexto(f.nomeFantasia);
      const cnpj = this.onlyDigits(f.cnpj);
      const item = this.normalizarTexto(f.itemFornecido);

      return razao.includes(t) ||
        fantasia.includes(t) ||
        (!!tNum && cnpj.includes(tNum)) ||
        item.includes(t);
    });
  }

  selecionarFornecedorModal(fornecedor: Fornecedor): void {
    if (!fornecedor.id || fornecedor.ativo === false) {
      return;
    }

    const fornecedorResumo: FornecedorResumo = {
      id: fornecedor.id,
      razaoSocial: fornecedor.razaoSocial,
      cnpj: fornecedor.cnpj
    };

    if (this.modoSelecaoFornecedor === 'cadastro') {
      this.novoFornecimento.fornecedor = fornecedorResumo;
    } else {
      this.edit.fornecedor = fornecedorResumo;
    }

    this.limparCampoInvalido('fornecedor');
    this.fecharModalFornecedor();
  }

  fornecedorTexto(model: Partial<FornecimentoPeca>): string {
    return model.fornecedor?.razaoSocial || '';
  }

  fornecedorRazaoSocial(fornecimento: Partial<FornecimentoPeca>): string {
    return this.capitalizar(fornecimento.fornecedor?.razaoSocial) || '—';
  }

  // ======================================================
  // PEÇAS
  // ======================================================

  private carregarPecas(): void {if(this.modoPaginado)return;
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
    if (modo === 'edicao' && this.editandoExistenteNoFluxo) return;
    this.modoSelecaoPeca = modo;
    this.descricaoFiltroEdit = '';
    this.aplicarFiltroPecaEdit();

    aposFecharModal(modo === 'cadastro' ? 'modalCadastroFornecimento' : 'modalEdicaoFornecimento', modo === 'cadastro' ? this.modalCadastro : this.modalEdicao, () => {
      const el = document.getElementById('modalPeca');

      if (!el) {
        console.error('Modal modalPeca não encontrado.');
        return;
      }

      this.modalPeca = bootstrap.Modal.getOrCreateInstance(el, {
        backdrop: 'static',
        keyboard: false
      });
      this.modalPeca.show();
    }, this.destroyRef);
  }

  fecharModalPeca(): void {
    if (this.fluxoFornecedorAtivo && this.modoSelecaoPeca === 'cadastro' && !this.novoFornecimento.peca) {
      this.voltarOpcoesFornecedor();
      return;
    }
    if (this.fluxoFornecedorAtivo) {
      aposFecharModal('modalPeca', this.modalPeca, () => this.reabrirModalOrigemPeca(), this.destroyRef);
      return;
    }
    aposFecharModal('modalPeca', this.modalPeca, () => this.reabrirModalOrigemPeca(), this.destroyRef);
  }

  aplicarFiltroPecaEdit(): void {
    const t = this.normalizarTexto(this.descricaoFiltroEdit);

    if (!t) {
      this.pecasFiltradas = [...this.pecas];
      return;
    }

    this.pecasFiltradas = this.pecas.filter(p => {
      const nome = this.normalizarTexto(p.nome);
      const fabricante = this.normalizarTexto(p.fabricante);
      const modelo = this.normalizarTexto(p.modelo);
      const norma = this.normalizarTexto(p.norma);
      const tipo = this.normalizarTexto(p.tipo);
      const unidade = this.normalizarTexto(p.unidade);

      return nome.includes(t) ||
        fabricante.includes(t) ||
        modelo.includes(t) ||
        norma.includes(t) ||
        tipo.includes(t) ||
        unidade.includes(t);
    });
  }

  selecionarPecaModal(peca: Peca): void {
    if (!peca.id) {
      return;
    }

    const pecaResumo: PecaResumo = {
      id: peca.id,
      nome: peca.nome ?? '',
      fabricante: peca.fabricante ?? '',
      modelo: peca.modelo ?? ''
    };

    if (this.modoSelecaoPeca === 'cadastro') {
      this.novoFornecimento.peca = pecaResumo;
      if (this.fluxoFornecedorAtivo) this.trocarAbaCadastroFornecimento('condicoes');
    } else {
      this.edit.peca = pecaResumo;
    }

    this.limparCampoInvalido('peca');
    this.fecharModalPeca();
  }

  pecaTexto(model: Partial<FornecimentoPeca>): string {
    if (!model.peca) {
      return '';
    }

    const nome = this.capitalizar(model.peca.nome);
    const fabricante = this.capitalizar(model.peca.fabricante);
    const modelo = this.capitalizar(model.peca.modelo);

    return [nome, fabricante, modelo].filter(Boolean).join(' · ');
  }

  descricaoPeca(fornecimento: Partial<FornecimentoPeca>): string {
    return this.capitalizar(fornecimento.peca?.nome) || '—';
  }

  // ======================================================
  // HELPERS DE EXIBIÇÃO
  // ======================================================

  fornecimentoAtivo(item: Partial<FornecimentoPeca>): boolean {
    return this.normalizarAtivo(item.ativo);
  }

  statusTexto(item: Partial<FornecimentoPeca>): string {
    return this.fornecimentoAtivo(item) ? 'Ativo' : 'Inativo';
  }

  statusBadgeClass(item: Partial<FornecimentoPeca>): string {
    return this.fornecimentoAtivo(item)
      ? 'bg-success-subtle text-success border border-success-subtle'
      : 'bg-secondary-subtle text-secondary border border-secondary-subtle';
  }

  prazoTexto(item: Partial<FornecimentoPeca>): string {
    if (String(item.prazoEntregaDias ?? '').trim() === '') return '—';
    const prazo = Number(item.prazoEntregaDias ?? 0);

    if (Number.isNaN(prazo)) {
      return '—';
    }

    if (prazo === 0) {
      return 'Imediato';
    }

    return `${prazo} dia${prazo === 1 ? '' : 's'}`;
  }

  quantidadeMinimaTexto(item: Partial<FornecimentoPeca>): string {
    const quantidade = Number(item.quantidadeMinima ?? 0);

    if (Number.isNaN(quantidade) || quantidade <= 0) {
      return '—';
    }

    return quantidade.toLocaleString('pt-BR');
  }

  resumoFornecimento(model: Partial<FornecimentoPeca>): string {
    const fornecedor = this.fornecedorTexto(model) || 'Fornecedor não selecionado';
    const peca = this.pecaTexto(model) || 'Peça não selecionada';

    return `${fornecedor} · ${peca}`;
  }

  capitalizar(texto?: string): string {
    const valor = (texto ?? '').toString().replace(/\s+/g, ' ').trim();

    if (!valor) {
      return '';
    }

    return valor
      .split(' ')
      .filter(parte => parte.length > 0)
      .map(parte => {
        if (/^(vw|gm|bmw|gwm|byd|jac|api|dot)$/i.test(parte)) {
          return parte.toUpperCase();
        }

        if (/^(i|ii|iii|iv|v|vi|vii|viii|ix|x)$/i.test(parte)) {
          return parte.toUpperCase();
        }

        return parte.charAt(0).toUpperCase() + parte.slice(1).toLowerCase();
      })
      .join(' ');
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

    const numero = this.moedaParaNumero(valor);

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
    this.novoFornecimento.valorCusto = this.formatarMoedaBR(this.novoFornecimento.valorCusto);
    this.limparCampoInvalido('valorCusto');
  }

  formatarValorCustoEdicao(): void {
    this.edit.valorCusto = this.formatarMoedaBR(this.edit.valorCusto);
    this.limparCampoInvalido('valorCusto');
  }

  formatarDataBr(data: string | Date | null | undefined): string {
    const input = this.asInputDateString(data);

    if (!input) {
      return '';
    }

    const [ano, mes, dia] = input.split('-');

    return `${dia}/${mes}/${ano}`;
  }

  // ======================================================
  // HELPERS INTERNOS
  // ======================================================

  private validarFornecimento(model: Partial<FornecimentoPeca>, marcarInvalidos: boolean): string | null {
    const duplicidade = this.erroDuplicidade(model);
    if (duplicidade) return duplicidade;
    const invalidos: CampoObrigatorioFornecimento[] = [];

    if (this.fornecedorInvalido(model)) {
      invalidos.push('fornecedor');
    }

    if (this.pecaInvalida(model)) {
      invalidos.push('peca');
    }

    if (this.valorCustoInvalido(model)) {
      invalidos.push('valorCusto');
    }

    if (this.prazoEntregaInvalido(model)) {
      invalidos.push('prazoEntregaDias');
    }

    if (this.quantidadeMinimaInvalida(model)) {
      invalidos.push('quantidadeMinima');
    }

    if (this.dataCadastroInvalida(model)) {
      invalidos.push('dataCadastro');
    }

    if (marcarInvalidos) {
      this.camposInvalidos = invalidos;

      if (invalidos.includes('fornecedor') || invalidos.includes('peca')) {
        this.abaCadastroFornecimento = 'vinculo';
        this.abaEdicaoFornecimento = 'vinculo';
      } else if (invalidos.length) {
        this.abaCadastroFornecimento = 'condicoes';
        this.abaEdicaoFornecimento = 'condicoes';
      }
    }

    if (invalidos.includes('fornecedor')) {
      return 'Selecione um fornecedor.';
    }

    if (invalidos.includes('peca')) {
      return 'Selecione uma peça ou insumo.';
    }

    if (invalidos.includes('valorCusto')) {
      return 'Informe um valor unitário maior que zero.';
    }

    if (invalidos.includes('prazoEntregaDias')) {
      return 'Informe o prazo de entrega em dias. Use 0 para pronta entrega.';
    }

    if (invalidos.includes('quantidadeMinima')) {
      return 'Informe uma quantidade mínima maior que zero.';
    }

    if (invalidos.includes('dataCadastro')) {
      return 'Informe a data de cadastro.';
    }

    if (marcarInvalidos) {
      this.camposInvalidos = [];
    }

    return null;
  }

  private progressoFormulario(model: Partial<FornecimentoPeca>): number {
    if (this.validarFornecimento(model, false) === null) {
      return 100;
    }

    const preenchidos = this.camposObrigatorios.filter(campo => {
      switch (campo) {
        case 'fornecedor':
          return !this.fornecedorInvalido(model);
        case 'peca':
          return !this.pecaInvalida(model);
        case 'valorCusto':
          return !this.valorCustoInvalido(model);
        case 'prazoEntregaDias':
          return !this.prazoEntregaInvalido(model);
        case 'quantidadeMinima':
          return !this.quantidadeMinimaInvalida(model);
        case 'dataCadastro':
          return !this.dataCadastroInvalida(model);
        default:
          return false;
      }
    }).length;

    const percentual = Math.round((preenchidos / this.camposObrigatorios.length) * 100);
    return Math.max(0, Math.min(99, percentual));
  }

  private montarPayload(model: Partial<FornecimentoPeca>): FornecimentoPecaRequest {
    return {
      idFornecedor: model.fornecedor?.id,
      idPeca: model.peca?.id,
      valorCusto: this.converterMoedaParaNumero(model.valorCusto),
      prazoEntregaDias: this.normalizarNumeroInteiroMinimo(model.prazoEntregaDias, 0),
      quantidadeMinima: this.normalizarNumeroInteiroMinimo(model.quantidadeMinima, 1),
      ativo: this.fornecimentoAtivo(model),
      dataCadastro: this.asInputDateString(model.dataCadastro)
    };
  }

  converterMoedaParaNumero(valor: any): string {
    return this.moedaParaNumero(valor).toFixed(2);
  }

  private moedaParaNumero(valor: any): number {
    if (valor === null || valor === undefined || valor === '') {
      return 0;
    }

    if (typeof valor === 'number') {
      return Number.isNaN(valor) ? 0 : valor;
    }

    let texto = valor
      .toString()
      .replace('R$', '')
      .replace(/\s/g, '')
      .trim();

    if (/^\d+\.\d{1,4}$/.test(texto)) {
      return Number(texto);
    }

    if (texto.includes(',')) {
      texto = texto.replace(/\./g, '').replace(',', '.');
    }

    const numero = Number(texto);

    return Number.isNaN(numero) ? 0 : numero;
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

  private normalizarTexto(valor: any): string {
    return (valor ?? '')
      .toString()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  private onlyDigits(v: any): string {
    return (v ?? '').toString().replace(/\D/g, '');
  }

  private normalizarNumeroInteiroMinimo(valor: any, minimo: number): number {
    const numero = Number(valor);

    if (Number.isNaN(numero) || numero < minimo) {
      return minimo;
    }

    return Math.floor(numero);
  }

  private normalizarAtivo(valor: any): boolean {
    if (typeof valor === 'boolean') {
      return valor;
    }

    if (typeof valor === 'number') {
      return valor === 1;
    }

    const texto = String(valor ?? '').trim().toLowerCase();

    if (!texto) {
      return false;
    }

    return texto === 'true' ||
      texto === 'ativo' ||
      texto === '1' ||
      texto === 'sim' ||
      texto === 's';
  }

  private reabrirModalOrigemFornecedor(): void {
    if (this.modoSelecaoFornecedor === 'cadastro') {
      this.modalCadastro?.show();
    } else {
      this.modalEdicao?.show();
    }
  }

  private reabrirModalOrigemPeca(): void {
    if (this.modoSelecaoPeca === 'cadastro') {
      this.modalCadastro?.show();
    } else {
      this.modalEdicao?.show();
    }
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
