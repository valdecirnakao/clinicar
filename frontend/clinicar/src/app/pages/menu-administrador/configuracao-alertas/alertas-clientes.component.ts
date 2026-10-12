
import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { FeedbackDirective } from '../../../shared/feedback/feedback.directive';
import { ConfiguracaoAlertasComponent } from './configuracao-alertas.component';
import { TelefoneWhatsappComponent } from '../../../shared/contatos/telefone-whatsapp.component';
declare const bootstrap: any;
interface ClienteAlerta {
  usuarioId: number; nome: string; email: string; telefone: string; statusUsuario: string; configurada: boolean;
  configuracao: {ativo: boolean; antecedenciaDias: number; intervaloDias: number; maximoEnvios: number;
    diasAposVencimento: number; horaInicio: number; horaFim: number; fusoHorario: string};
}
interface PaginaClientes {content: ClienteAlerta[]; totalElements: number; totalPages: number; number: number;}
@Component({
    selector: 'app-alertas-clientes',
    imports: [FormsModule, RouterLink, FeedbackDirective, ConfiguracaoAlertasComponent, TelefoneWhatsappComponent],
    templateUrl: './alertas-clientes.component.html', styleUrl: './alertas-tabelas.component.css'
})
export class AlertasClientesComponent implements OnInit, OnDestroy {
  clientes: ClienteAlerta[]=[]; busca=''; pagina=0; tamanho=10; total=0; totalPaginas=0;
  ordenar='nome'; decrescente=false; carregando=false; erro=''; sucesso='';
  selecionado: ClienteAlerta | null=null; modoLeitura=true;
  @ViewChild(ConfiguracaoAlertasComponent) editor?: ConfiguracaoAlertasComponent;
  private consulta?: Subscription; private modal:any; private buscaPendente?: ReturnType<typeof setTimeout>;
  constructor(private http:HttpClient) {}
  ngOnInit():void {this.carregar();}
  carregar():void {
    this.consulta?.unsubscribe(); this.carregando=true; this.erro='';
    this.consulta=this.http.get<PaginaClientes>('/api/configuracao-alerta-manutencao/clientes',
      {params:{busca:this.busca,pagina:this.pagina,tamanho:this.tamanho,ordenar:this.ordenar,decrescente:this.decrescente},withCredentials:true})
      .subscribe({next:p=>{
        this.total=p.totalElements; this.totalPaginas=p.totalPages;
        if (this.pagina>0 && !p.content.length) {this.pagina=Math.max(0,p.totalPages-1); this.carregar(); return;}
        this.clientes=p.content; this.carregando=false;
      },error:e=>{this.erro=e.error?.mensagem||'Não foi possível consultar as configurações dos clientes.';this.carregando=false;}});
  }
  filtrar():void {clearTimeout(this.buscaPendente);this.pagina=0;this.buscaPendente=setTimeout(()=>this.carregar(),300);}
  alterarTamanho():void {this.pagina=0;this.carregar();}
  mudarPagina(pagina:number):void {if(!this.carregando && pagina>=0 && pagina<this.totalPaginas){this.pagina=pagina;this.carregar();}}
  ordenarPor(coluna:string):void {this.decrescente=this.ordenar===coluna?!this.decrescente:false;this.ordenar=coluna;this.pagina=0;this.carregar();}
  get primeiro():number{return this.total?this.pagina*this.tamanho+1:0;}
  get ultimo():number{return Math.min((this.pagina+1)*this.tamanho,this.total);}
  get numerosPaginas():number[]{const inicio=Math.max(0,Math.min(this.pagina-2,this.totalPaginas-5));return Array.from({length:Math.min(5,this.totalPaginas)},(_,i)=>inicio+i);}
  hora(valor:number):string{return String(valor).padStart(2,'0')+':00';}
  abrir(cliente:ClienteAlerta,leitura:boolean):void {
    this.selecionado=cliente;this.modoLeitura=leitura;
    const elemento=document.getElementById('modalConfiguracaoCliente');
    if(elemento){elemento.addEventListener('hidden.bs.modal',()=>this.selecionado=null,{once:true});this.modal=bootstrap.Modal.getOrCreateInstance(elemento);this.modal.show();}
  }
  salvo():void {this.sucesso='Configuração do cliente salva.';this.carregar();}
  fechar():void {if(!this.editor?.salvando)this.modal?.hide();}
  ngOnDestroy():void {this.consulta?.unsubscribe();clearTimeout(this.buscaPendente);this.modal?.hide();}
}
