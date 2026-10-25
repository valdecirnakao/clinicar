import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { PaginacaoComponent } from '../../shared/tabelas/paginacao.component';
import { AlertaTrabalhoColaborador, ItemTrabalhoColaborador, PaginaTrabalhoColaborador, TrabalhoColaboradorService } from './trabalho-colaborador.service';

type Secao = 'agendamentos' | 'atendimentos';
interface EstadoSecao { itens: ItemTrabalhoColaborador[]; pagina: number; tamanho: number; total: number; busca: string; carregando: boolean; carregado: boolean; erro: string; }

@Component({
  selector: 'app-rotina-colaborador', standalone: true,
  imports: [CommonModule, FormsModule, PaginacaoComponent, RouterLink],
  templateUrl: './rotina-colaborador.component.html', styleUrl: './rotina-colaborador.component.css'
})
export class RotinaColaboradorComponent implements OnInit {
  private readonly service = inject(TrabalhoColaboradorService);
  private readonly destroy = inject(DestroyRef);
  private readonly router = inject(Router);
  private readonly http = inject(HttpClient);
  podeMecanica = false;
  private readonly consultas: Partial<Record<Secao, Subscription>> = {};
  readonly secoes: Secao[] = ['agendamentos', 'atendimentos'];
  secaoAtiva: Secao | 'estoque' = 'agendamentos';
  get somentePendentes(): boolean { return this.router.url.startsWith('/menuColaborador/painel'); }
  resumo = {agendamentos: 0, atendimentos: 0, alertasEstoque: 0};
  estoque = {itens: [] as AlertaTrabalhoColaborador[], pagina: 0, tamanho: 10, total: 0, busca: '', carregando: false, carregado: false, erro: ''};
  private consultaEstoque?: Subscription;
  readonly estado: Record<Secao, EstadoSecao> = {
    agendamentos: { itens: [], pagina: 0, tamanho: 10, total: 0, busca: '', carregando: false, carregado: false, erro: '' },
    atendimentos: { itens: [], pagina: 0, tamanho: 10, total: 0, busca: '', carregando: false, carregado: false, erro: '' }
  };

  ngOnInit(): void {
    this.http.get<{podeMecanica: boolean}>('/api/colaborador/permissoes/minhas', {withCredentials: true})
      .pipe(takeUntilDestroyed(this.destroy)).subscribe({next: permissoes => this.podeMecanica = permissoes.podeMecanica});
    this.carregar('agendamentos');
    if (this.somentePendentes) this.carregarResumo();
  }

  selecionarSecao(secao: Secao | 'estoque'): void {
    this.secaoAtiva = secao;
    if (secao === 'estoque') {
      if (!this.estoque.carregado && !this.estoque.carregando) this.carregarEstoque();
    } else if (!this.estado[secao].carregado && !this.estado[secao].carregando) this.carregar(secao);
  }

  carregarResumo(): void {
    this.service.pendencias().pipe(takeUntilDestroyed(this.destroy)).subscribe({next: resumo => this.resumo = resumo});
  }

  carregar(secao: Secao): void {
    const estado = this.estado[secao];
    this.consultas[secao]?.unsubscribe();
    estado.carregando = true; estado.erro = '';
    this.consultas[secao] = this.service.consultar(secao, estado.pagina, estado.tamanho, estado.busca, this.somentePendentes)
      .pipe(takeUntilDestroyed(this.destroy)).subscribe({
        next: (pagina: PaginaTrabalhoColaborador) => {
          estado.itens = pagina.content; estado.total = pagina.totalElements; estado.carregando = false; estado.carregado = true;
          if (estado.pagina > Math.max(0, pagina.totalPages - 1)) { estado.pagina = Math.max(0, pagina.totalPages - 1); this.carregar(secao); }
        },
        error: erro => {
          estado.carregando = false;
          estado.erro = erro.status === 401 ? 'Sua sessão expirou. Entre novamente.' : 'Não foi possível carregar estes registros. Tente atualizar.';
          if (erro.status === 401) void this.router.navigate(['/login']);
        }
      });
  }

  pesquisar(secao: Secao): void { this.estado[secao].pagina = 0; this.carregar(secao); }
  mudarPagina(secao: Secao, pagina: number): void { this.estado[secao].pagina = pagina; this.carregar(secao); }
  mudarTamanho(secao: Secao, tamanho: number): void { this.estado[secao].tamanho = tamanho; this.estado[secao].pagina = 0; this.carregar(secao); }

  carregarEstoque(): void {
    this.consultaEstoque?.unsubscribe(); this.estoque.carregando=true; this.estoque.erro='';
    this.consultaEstoque=this.service.alertasEstoque(this.estoque.pagina,this.estoque.tamanho,this.estoque.busca)
      .pipe(takeUntilDestroyed(this.destroy)).subscribe({
        next: pagina => {
          this.estoque.itens=pagina.content;this.estoque.total=pagina.totalElements;this.estoque.carregando=false;this.estoque.carregado=true;
          if(this.estoque.pagina>Math.max(0,pagina.totalPages-1)){this.estoque.pagina=Math.max(0,pagina.totalPages-1);this.carregarEstoque();}
        },
        error: erro => {
          this.estoque.carregando=false;
          this.estoque.erro=erro.status===401?'Sua sessão expirou. Entre novamente.':'Não foi possível carregar os alertas. Tente atualizar.';
          if(erro.status===401) void this.router.navigate(['/login']);
        }
      });
  }
  pesquisarEstoque(): void {this.estoque.pagina=0;this.carregarEstoque();}
  mudarPaginaEstoque(pagina:number):void {this.estoque.pagina=pagina;this.carregarEstoque();}
  mudarTamanhoEstoque(tamanho:number):void {this.estoque.tamanho=tamanho;this.estoque.pagina=0;this.carregarEstoque();}
}
