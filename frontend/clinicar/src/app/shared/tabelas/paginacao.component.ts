import { Component, EventEmitter, Input, Output } from '@angular/core';
@Component({selector:'app-paginacao',standalone:true,template:`
  <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 py-2">
    <small>Mostrando {{ total ? pagina * tamanho + 1 : 0 }} a {{ fim }} de {{ total }} registro(s)</small>
    <label class="d-flex align-items-center gap-2 small">Exibir <select class="form-select form-select-sm w-auto" aria-label="Registros por página" [disabled]="carregando" [value]="tamanho" (change)="tamanhoChange.emit(+$any($event.target).value)">@for(opcao of tamanhos;track opcao){<option [value]="opcao" [selected]="opcao===tamanho">{{opcao}}</option>}</select> por página</label>
    <nav class="d-flex flex-wrap gap-1" aria-label="Paginação"><button type="button" class="btn btn-sm btn-outline-secondary" [disabled]="carregando || pagina <= 0" (click)="paginaChange.emit(pagina-1)"><i class="bi bi-chevron-left" aria-hidden="true"></i> Anterior</button>@for(p of paginas;track p){<button type="button" class="btn btn-sm" [class.btn-primary]="p===pagina" [class.btn-outline-primary]="p!==pagina" [attr.aria-current]="p===pagina?'page':null" [disabled]="carregando" (click)="paginaChange.emit(p)">{{p+1}}</button>}<button type="button" class="btn btn-sm btn-outline-secondary" [disabled]="carregando || fim >= total" (click)="paginaChange.emit(pagina+1)">Próxima <i class="bi bi-chevron-right" aria-hidden="true"></i></button></nav>
  </div>`,styles:[`:host{display:block;width:100%;color:inherit}.form-select{color:inherit}`]})
export class PaginacaoComponent {
  @Input() pagina=0; @Input() tamanho=10; @Input() total=0; @Input() carregando=false;
  @Input() tamanhos=[5,10,20,50];
  @Output() paginaChange=new EventEmitter<number>(); @Output() tamanhoChange=new EventEmitter<number>();
  get fim():number{return Math.min((this.pagina+1)*this.tamanho,this.total);}
  get paginas():number[]{const quantidade=Math.max(1,Math.ceil(this.total/this.tamanho));const inicio=Math.max(0,Math.min(this.pagina-2,quantidade-5));return Array.from({length:Math.min(5,quantidade-inicio)},(_,i)=>inicio+i);}
}
