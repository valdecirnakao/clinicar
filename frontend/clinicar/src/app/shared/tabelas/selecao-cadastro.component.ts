import { AfterViewInit, Component, DestroyRef, ElementRef, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ConsultaPaginadaService } from './consulta-paginada.service';
import { PaginacaoComponent } from './paginacao.component';
import { UnidadePecaPipe } from '../forms/unidade-peca.pipe';
import { DocumentoPipe } from '../forms/documento.pipe';
import { TelefoneWhatsappComponent } from '../contatos/telefone-whatsapp.component';
import { formatarPlacaExibicao } from '../forms/formatar-placa';

export interface ColunaSelecao { titulo:string; campo:string; formato?:'moeda'|'unidade'|'documento'|'telefone'|'booleano'|'placa'; }

/** Consulta apenas a página visível; preserva o contexto e as ações do modal de origem. */
@Component({selector:'app-selecao-cadastro',standalone:true,imports:[CommonModule,FormsModule,PaginacaoComponent,UnidadePecaPipe,DocumentoPipe,TelefoneWhatsappComponent],template:`
  <label class="visually-hidden" [for]="idBusca">Buscar registros</label>
  <input [id]="idBusca" type="search" class="form-control mb-3" placeholder="Buscar registros cadastrados..." [(ngModel)]="busca" [ngModelOptions]="{standalone:true}" (ngModelChange)="alterarBusca()" data-help-options="Digite parte do nome ou da identificação para localizar um registro já cadastrado. Selecione o item que será associado ao cadastro de origem.">
  @if(erro){<div class="alert alert-danger" role="alert">{{erro}}</div>}
  <div class="table-responsive"><table class="table table-hover align-middle mb-0"><thead><tr>@for(coluna of colunas;track coluna.campo){<th scope="col">{{coluna.titulo}}</th>}<th scope="col" class="text-center">Ação</th></tr></thead><tbody>
  @for(item of registros;track item.id){<tr>@for(coluna of colunas;track coluna.campo){<td>@switch(coluna.formato){@case('moeda'){ {{valor(item,coluna.campo) | currency:'BRL'}} }@case('unidade'){ {{valor(item,coluna.campo) | unidadePeca}} }@case('documento'){ {{valor(item,coluna.campo) | documento}} }@case('telefone'){ <app-telefone-whatsapp [telefone]="valor(item,coluna.campo)" /> }@case('booleano'){ {{valor(item,coluna.campo) ? 'Sim' : 'Não'}} }@case('placa'){ {{formatarPlaca(valor(item,coluna.campo)) || '—'}} }@default{ {{valor(item,coluna.campo)||'—'}} }}</td>}<td class="text-center"><button type="button" class="btn btn-sm btn-outline-primary" (click)="selecionado.emit(item)" [disabled]="carregando"><i class="bi bi-check2-circle" aria-hidden="true"></i> Selecionar</button></td></tr>}
  @empty{<tr><td [attr.colspan]="colunas.length+1" class="text-center py-4" role="status">{{carregando?'Consultando registros...':'Nenhum registro encontrado.'}}</td></tr>}
  </tbody></table></div>
  <app-paginacao [pagina]="pagina" [tamanho]="tamanho" [total]="total" [carregando]="carregando" (paginaChange)="pagina=$event;carregar()" (tamanhoChange)="tamanho=$event;pagina=0;carregar()" />
`,styles:[`:host{display:block;color:inherit}.table{--bs-table-color:inherit;--bs-table-border-color:#cee0f5}thead{--bs-table-bg:#eef6ff}.form-control{color:inherit}.table-responsive{border:1px solid #cee0f5;border-radius:8px}`]})
export class SelecaoCadastroComponent implements AfterViewInit, OnChanges {
  readonly formatarPlaca = formatarPlacaExibicao;
  @Input({required:true}) recurso='';
  @Input() colunas:ColunaSelecao[]=[];
  @Input() filtros:Record<string,string|number|boolean>={};
  @Output() selecionado=new EventEmitter<any>();
  private readonly consulta=inject(ConsultaPaginadaService);
  private readonly destroy=inject(DestroyRef);
  private readonly el=inject(ElementRef<HTMLElement>);
  private requisicao?:Subscription;
  private temporizador?:ReturnType<typeof setTimeout>;
  private pronto=false;
  private filtrosAnteriores='';
  private readonly identificador=crypto.randomUUID();
  registros:any[]=[];busca='';pagina=0;tamanho=5;total=0;carregando=false;erro='';
  get idBusca():string{return 'buscar-'+this.identificador;}
  ngOnChanges(changes:SimpleChanges):void {
    const filtros=JSON.stringify(this.filtros);
    if(!changes['recurso']&&filtros===this.filtrosAnteriores)return;
    this.filtrosAnteriores=filtros;
    clearTimeout(this.temporizador);
    this.requisicao?.unsubscribe();
    this.registros=[];this.total=0;this.pagina=0;this.carregando=false;this.erro='';
    if(this.pronto&&this.el.nativeElement.closest('.modal.show'))this.carregar();
  }
  ngAfterViewInit():void {
    const modal=this.el.nativeElement.closest('.modal');
    this.pronto=true;
    const abrir=()=>{this.pagina=0;this.carregar();};
    modal?.addEventListener('shown.bs.modal',abrir);
    if(modal?.classList.contains('show'))abrir();
    this.destroy.onDestroy(()=>{modal?.removeEventListener('shown.bs.modal',abrir);clearTimeout(this.temporizador);});
  }
  alterarBusca():void {clearTimeout(this.temporizador);this.pagina=0;this.temporizador=setTimeout(()=>this.carregar(),250);}
  carregar():void {
    this.requisicao?.unsubscribe();this.carregando=true;this.erro='';
    this.requisicao=this.consulta.consultar<any>(this.recurso,{...this.filtros,selecao:true,pagina:this.pagina,tamanho:this.tamanho,busca:this.busca,ordenar:'id'}).pipe(takeUntilDestroyed(this.destroy)).subscribe({
      next:pagina=>{this.registros=pagina.content;this.total=pagina.totalElements;this.carregando=false;if(this.pagina>Math.max(0,pagina.totalPages-1)){this.pagina=Math.max(0,pagina.totalPages-1);this.carregar();}},
      error:()=>{this.registros=[];this.total=0;this.carregando=false;this.erro='Não foi possível consultar os registros. Ajuste a busca para tentar novamente.';}
    });
  }
  valor(item:any,campo:string):any{return campo.split('.').reduce((valor,parte)=>valor?.[parte],item);}
}
