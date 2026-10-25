import { Component, DestroyRef, ElementRef, EventEmitter, Input, OnChanges, Output, SimpleChanges, ViewChild, forwardRef, inject, booleanAttribute } from '@angular/core';
import { FormsModule, ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subscription } from 'rxjs';
import { ConsultaPaginadaService } from './consulta-paginada.service';
import { FieldHelpDirective } from '../field-help/field-help.directive';
import { CatalogosFormularioService } from './catalogos-formulario.service';

/** Seleção pesquisável que mantém em memória somente a página e o registro escolhido. */
@Component({
  selector: 'app-seletor-remoto', standalone: true, imports: [FormsModule, FieldHelpDirective],
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => SeletorRemotoComponent), multi: true }],
  template: `
    <input #valorCampo type="hidden" [name]="inputId || buscaId" [value]="valor || ''" />
    <div class="input-group">
      <input class="form-control" [id]="inputId" [value]="texto" [title]="texto" [placeholder]="placeholder" readonly [disabled]="desabilitado" [required]="required" [attr.aria-required]="required" (click)="abrir()" (blur)="tocado()" [attr.aria-label]="rotulo" />
      @if(valor){<button type="button" class="btn btn-outline-secondary" aria-label="Remover seleção" [disabled]="desabilitado" (click)="escolher(null)"><i class="bi bi-x" aria-hidden="true"></i></button>}
      <button type="button" class="btn btn-outline-primary" [disabled]="desabilitado" (click)="abrir()" [attr.aria-expanded]="aberto" [attr.aria-label]="'Buscar ' + rotulo"><i class="bi bi-search" aria-hidden="true"></i></button>
    </div>
    @if(aberto){
      <div class="resultados">
        <label class="visually-hidden" [for]="buscaId">Pesquisar {{rotulo}}</label>
        <input class="form-control mb-2" [id]="buscaId" placeholder="Digite para buscar..." [(ngModel)]="busca" [ngModelOptions]="{standalone:true}" (ngModelChange)="pesquisar()" [attr.aria-label]="'Pesquisar ' + rotulo" />
        @if(erro){<div class="small text-danger" role="alert">{{erro}}</div>}
        @for(item of registros;track item.id){<button type="button" class="opcao" [disabled]="carregando" (click)="escolher(item)">{{descricao(item)}}</button>}
        @if(!registros.length){<div class="small p-2" role="status">{{carregando?'Consultando...':'Nenhum registro encontrado.'}}</div>}
        <div class="d-flex align-items-center justify-content-between gap-2 mt-2">
          <button type="button" class="btn btn-sm btn-outline-secondary" [disabled]="carregando || pagina===0" (click)="pagina=pagina-1;carregar()">Anterior</button>
          <small>{{pagina+1}} / {{totalPaginas || 1}}</small>
          <button type="button" class="btn btn-sm btn-outline-secondary" [disabled]="carregando || pagina+1>=totalPaginas" (click)="pagina=pagina+1;carregar()">Próxima</button>
          <button type="button" class="btn btn-sm btn-outline-primary" (click)="aberto=false">Concluir busca</button>
        </div>
      </div>
    }
  `,
  styles: [`:host{display:block;min-width:0;color:#35689b}.form-control{color:inherit;border-color:#d0e2f2}.resultados{margin-top:.5rem;padding:.65rem;border:1px solid #d0e2f2;border-radius:10px;background:#f8fbff}.opcao{display:block;text-align:left;width:100%;border:0;border-bottom:1px solid #d0e2f2;padding:.5rem;background:white;color:inherit;overflow-wrap:anywhere}.opcao:hover,.opcao:focus-visible{background:#eef6ff}:host(.is-invalid) .input-group .form-control{border-color:#dc3545;background:#fffafa}.btn{white-space:nowrap}.resultados>.d-flex{flex-wrap:wrap}`]
})
export class SeletorRemotoComponent implements ControlValueAccessor, OnChanges {
  @Input({required:true}) recurso=''; @Input() filtros:Record<string,string|number|boolean>={};
  @Input() rotulo='registro'; @Input() inputId=''; @Input() placeholder='Selecione';
  @Input({transform:booleanAttribute}) somenteNome=false;
  @Input() registroInicial: {id?:number;nome?:string}|null=null;
  @Input() comFornecimento=false;
  @Input({transform:booleanAttribute}) selecaoEmModal=false;
  @Input({transform:booleanAttribute}) required=false;
  @Output() selecionado=new EventEmitter<any>(); @Output() change=new EventEmitter<void>();
  @Output() abrirSelecao=new EventEmitter<void>();
  private readonly api=inject(ConsultaPaginadaService); private readonly destroy=inject(DestroyRef);
  private readonly catalogos=inject(CatalogosFormularioService);
  @ViewChild('valorCampo') private valorCampo?:ElementRef<HTMLInputElement>;
  private vinculo?:Subscription;
  private requisicao?:Subscription; private registro?:Subscription; private timer?:ReturnType<typeof setTimeout>;
  private filtroAnterior=''; private geracao=0;
  valor:number|null=null; texto=''; desabilitado=false; aberto=false; busca=''; registros:any[]=[];
  pagina=0;totalPaginas=0;carregando=false;erro='';readonly buscaId='seletor-'+crypto.randomUUID();
  private alterar:(valor:number|null)=>void=()=>{};tocado:()=>void=()=>{};
  constructor(){this.destroy.onDestroy(()=>clearTimeout(this.timer));}
  ngOnChanges(changes:SimpleChanges):void {
    if(changes['registroInicial'] && this.valor && Number(this.registroInicial?.id)===this.valor && this.registroInicial?.nome){
      this.registro?.unsubscribe();this.texto=this.descricao(this.registroInicial);
    }
    const filtro=JSON.stringify(this.filtros);
    if(filtro!==this.filtroAnterior){this.filtroAnterior=filtro;this.requisicao?.unsubscribe();this.registros=[];this.pagina=0;if(this.aberto)this.carregar();}
    if(changes['recurso']&&this.valor)this.carregarRegistro();
  }
  writeValue(valor:unknown):void {const id=Number(valor)||null;if(id===this.valor)return;this.vinculo?.unsubscribe();this.carregando=false;this.valor=id;this.texto='';this.carregarRegistro();}
  registerOnChange(fn:(valor:number|null)=>void):void{this.alterar=fn;}
  registerOnTouched(fn:()=>void):void{this.tocado=fn;}
  setDisabledState(disabled:boolean):void{this.desabilitado=disabled;if(disabled)this.aberto=false;}
  abrir():void{if(this.desabilitado)return;if(this.selecaoEmModal){this.abrirSelecao.emit();return;}this.aberto=!this.aberto;if(this.aberto){this.pagina=0;this.carregar();}}
  pesquisar():void{clearTimeout(this.timer);this.requisicao?.unsubscribe();this.registros=[];this.carregando=true;this.timer=setTimeout(()=>{this.pagina=0;this.carregar();},250);}
  carregar():void{
    this.requisicao?.unsubscribe();this.carregando=true;this.erro='';
    this.requisicao=this.api.consultar<any>(this.recurso,{...this.filtros,selecao:true,pagina:this.pagina,tamanho:5,busca:this.busca,ordenar:'id'}).pipe(takeUntilDestroyed(this.destroy)).subscribe({
      next:p=>{this.registros=p.content;this.totalPaginas=p.totalPages;this.carregando=false;},
      error:()=>{this.registros=[];this.carregando=false;this.erro='Não foi possível consultar. Ajuste a busca para tentar novamente.';}
    });
  }
  escolher(item:any):void{
    const geracao=++this.geracao;this.registro?.unsubscribe();this.vinculo?.unsubscribe();
    if(item&&this.comFornecimento){
      this.carregando=true;
      this.vinculo=this.catalogos.fornecimentoPreferido(item.id).pipe(takeUntilDestroyed(this.destroy)).subscribe({
        next:fornecimento=>{if(geracao!==this.geracao)return;this.carregando=false;this.confirmar({...item,fornecimentoPreferido:fornecimento});},
        error:()=>{this.carregando=false;this.erro='Não foi possível consultar as condições de fornecimento. Tente novamente.';}
      });
    }else this.confirmar(item);
  }
  private confirmar(item:any):void {
    this.carregando=false;this.erro='';
    this.valor=item?.id??null;this.texto=item?this.descricao(item):'';this.selecionado.emit(item);this.alterar(this.valor);this.tocado();this.aberto=false;this.change.emit();
    if(this.valorCampo){this.valorCampo.nativeElement.value=String(this.valor??'');this.valorCampo.nativeElement.dispatchEvent(new Event('change',{bubbles:true}));}
  }
  private carregarRegistro():void{
    const geracao=++this.geracao;this.registro?.unsubscribe();if(!this.valor||!this.recurso)return;
    if(Number(this.registroInicial?.id)===this.valor && this.registroInicial?.nome){this.texto=this.descricao(this.registroInicial);return;}
    this.registro=this.api.registro<any>(this.recurso,this.valor).pipe(takeUntilDestroyed(this.destroy)).subscribe({next:item=>{if(geracao!==this.geracao)return;this.texto=this.descricao(item);this.selecionado.emit(item);},error:()=>{if(geracao===this.geracao)this.erro='Não foi possível carregar a seleção. Busque novamente.';}});
  }
  descricao(item:any):string {
    if(item.tipoMovimento){const data=new Date(item.criadoEm).toLocaleString('pt-BR');return `${item.tipoMovimento.replaceAll('_',' ')} #${item.id} · ${item.nomePeca || ''} · ${data} · Disponível: ${item.quantidadeDisponivelOriginal ?? item.quantidade}`;}
    if(this.somenteNome){const nome=item.nome||item.nomeSocial||item.nome_social||item.razaoSocial||item.razao_social||item.nomeFantasia||item.nome_fantasia;if(nome)return nome;}
    const placa=String(item.placa || '').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,7);
    const identificacao=placa.length>3 ? placa.slice(0,3)+'-'+placa.slice(3) : placa;
    const documento=String(item.cpf || item.cnpj || '');
    const digitos=documento.replace(/\D/g,'');
    const documentoFormatado=digitos.length===11
      ? `${digitos.slice(0,3)}.${digitos.slice(3,6)}.${digitos.slice(6,9)}-${digitos.slice(9)}`
      : digitos.length===14
        ? `${digitos.slice(0,2)}.${digitos.slice(2,5)}.${digitos.slice(5,8)}/${digitos.slice(8,12)}-${digitos.slice(12)}`
        : documento;
    return [item.codigoAgendamento||identificacao||item.nome||item.razaoSocial||item.nomeFantasia||'Registro '+item.id,item.modelo||item.categoria||documentoFormatado].filter(Boolean).join(' · ');
  }
}
