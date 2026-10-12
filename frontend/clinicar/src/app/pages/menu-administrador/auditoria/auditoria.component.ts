import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { FeedbackDirective } from '../../../shared/feedback/feedback.directive';
declare const bootstrap: any;
export interface EventoAuditoria {
  origem: string; id: number; dataHora: string; componente: string; operacao: string;
  responsavelId: number|null; responsavelNome: string|null; registroId: number|null; registroNome: string|null;
  resultado: string; justificativa: string|null; detalhes: Record<string,string>;
}
interface Pagina {content: EventoAuditoria[]; totalElements: number; totalPages: number; number: number;}
@Component({
    selector: 'app-auditoria', imports: [CommonModule, FormsModule, RouterLink, FeedbackDirective],
    templateUrl: './auditoria.component.html', styleUrl: './auditoria.component.css'
})
export class AuditoriaComponent implements OnInit, OnDestroy {
  inicio=''; fim=''; busca=''; componente=''; operacao=''; responsavelId:number|null=null; registroId:number|null=null;
  pagina=0; tamanho=10; total=0; totalPaginas=0; ordenar='dataHora'; decrescente=true;
  eventos:EventoAuditoria[]=[]; selecionado:EventoAuditoria|null=null;
  carregando=false; exportando=false; carregandoDetalhe=false; erro=''; erroDetalhe='';
  readonly operacoes:Record<string,string>={RESET_2FA:'Reset de 2FA',EXCLUSAO_USUARIO:'Exclusão de usuário',ENTRADA:'Entrada de estoque',
    SAIDA:'Saída de estoque',AJUSTE_ENTRADA:'Ajuste de entrada',AJUSTE_SAIDA:'Ajuste de saída',RESERVA:'Reserva',
    LIBERACAO_RESERVA:'Liberação de reserva',CONSULTA:'Consulta de auditoria',DETALHES:'Visualização de detalhes',EXPORTACAO:'Exportação',POST:'Cadastro / operação',PUT:'Atualização',PATCH:'Atualização parcial',DELETE:'Exclusão'};
  readonly componentes:Record<string,string>={USUARIOS:'Usuários',ESTOQUE:'Estoque',AUDITORIA:'Auditoria',PECA:'Peças',SERVICO:'Serviços',FORNECEDOR:'Fornecedores',VEICULO:'Veículos',FORNECIMENTOPECAS:'Fornecimento de peças',FORNECIMENTOSERVICO:'Fornecimento de serviços',AGENDAMENTO:'Agendamentos',ATENDIMENTO:'Atendimentos',REGRAMANUTENCAOPREVENTIVA:'Manutenção preventiva',ALERTAMANUTENCAO:'Alertas de manutenção',CONFIGURACAOALERTAESTOQUE:'Configuração do estoque',NOTIFICACAO:'Notificações'};
  readonly campos:Record<string,string>={saldo_anterior:'Saldo anterior',saldo_posterior:'Saldo posterior',quantidade:'Quantidade movimentada',
    valor_unitario:'Valor unitário',valor_total:'Valor total',documento:'Documento / referência',movimento_origem:'ID da movimentação de origem',estoque_id:'ID do controle de estoque'};
  private consulta?:Subscription; private detalhe?:Subscription; private exportacao?:Subscription; private modal:any;
  constructor(private http:HttpClient) {const hoje=new Date();this.fim=this.dataLocal(hoje);hoje.setDate(hoje.getDate()-30);this.inicio=this.dataLocal(hoje);}
  private dataLocal(d:Date):string{return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
  ngOnInit():void{this.carregar();}
  get filtrosValidos():boolean{return (!this.inicio||!this.fim||this.inicio<=this.fim)
    && (this.responsavelId==null||Number.isInteger(this.responsavelId)&&this.responsavelId>0)
    && (this.registroId==null||Number.isInteger(this.registroId)&&this.registroId>0);}
  private parametros():Record<string,string|number|boolean>{
    const p:Record<string,string|number|boolean>={busca:this.busca,componente:this.componente,operacao:this.operacao,pagina:this.pagina,
      tamanho:this.tamanho,ordenar:this.ordenar,decrescente:this.decrescente};
    if(this.inicio)p['inicio']=this.inicio;if(this.fim)p['fim']=this.fim;
    if(this.responsavelId!=null)p['responsavelId']=this.responsavelId;if(this.registroId!=null)p['registroId']=this.registroId;return p;
  }
  carregar():void {
    if(!this.filtrosValidos){this.erro='Verifique o período e os identificadores informados.';return;}
    this.consulta?.unsubscribe();this.carregando=true;this.erro='';
    this.consulta=this.http.get<Pagina>('/api/auditoria',{params:this.parametros(),withCredentials:true}).subscribe({next:p=>{
      this.total=p.totalElements;this.totalPaginas=p.totalPages;
      if(this.pagina>0&&!p.content.length){this.pagina=Math.max(0,p.totalPages-1);this.carregar();return;}
      this.eventos=p.content;this.carregando=false;
    },error:e=>{this.eventos=[];this.total=0;this.totalPaginas=0;this.carregando=false;this.erro=e.error?.mensagem||e.error?.detail||'Não foi possível consultar a auditoria.';}});
  }
  filtrar():void{this.pagina=0;this.carregar();}
  limpar():void{this.inicio='';this.fim='';this.busca='';this.componente='';this.operacao='';this.responsavelId=null;this.registroId=null;this.filtrar();}
  ordenarPor(campo:string):void{this.decrescente=this.ordenar===campo?!this.decrescente:false;this.ordenar=campo;this.filtrar();}
  mudarPagina(p:number):void{if(!this.carregando&&p>=0&&p<this.totalPaginas){this.pagina=p;this.carregar();}}
  get primeiro():number{return this.total?this.pagina*this.tamanho+1:0;}
  get ultimo():number{return Math.min((this.pagina+1)*this.tamanho,this.total);}
  get paginas():number[]{const inicio=Math.max(0,Math.min(this.pagina-2,this.totalPaginas-5));return Array.from({length:Math.min(5,this.totalPaginas)},(_,i)=>inicio+i);}
  abrir(e:EventoAuditoria):void{
    this.detalhe?.unsubscribe();this.selecionado=null;this.carregandoDetalhe=true;this.erroDetalhe='';
    const el=document.getElementById('modalDetalhesAuditoria');if(el&&typeof bootstrap!=='undefined'){this.modal=bootstrap.Modal.getOrCreateInstance(el);this.modal.show();}
    this.detalhe=this.http.get<EventoAuditoria>(`/api/auditoria/${e.origem}/${e.id}`,{withCredentials:true}).subscribe({
      next:d=>{this.selecionado=d;this.carregandoDetalhe=false;},error:erro=>{this.erroDetalhe=erro.error?.mensagem||'Não foi possível consultar os detalhes.';this.carregandoDetalhe=false;}});
  }
  fechar():void{this.detalhe?.unsubscribe();this.modal?.hide();this.selecionado=null;this.carregandoDetalhe=false;}
  valorDetalhe(chave:string,valor:string):string{
    if(['valor_unitario','valor_total'].includes(chave))return Number(valor).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
    if(['quantidade','saldo_anterior','saldo_posterior'].includes(chave))return Number(valor).toLocaleString('pt-BR',{maximumFractionDigits:3});return valor;
  }
  exportar():void{
    if(this.exportando||!this.filtrosValidos)return;this.exportando=true;this.erro='';
    this.exportacao=this.http.get('/api/auditoria/exportar',{params:this.parametros(),responseType:'blob',withCredentials:true}).subscribe({
      next:blob=>{const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='auditoria-clinicar.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);this.exportando=false;},
      error:async e=>{this.exportando=false;this.erro='Não foi possível exportar a auditoria.';
        if(e.error instanceof Blob){try{const corpo=JSON.parse(await e.error.text());this.erro=corpo.mensagem||corpo.detail||this.erro;}catch{}}}
    });
  }
  ngOnDestroy():void{this.consulta?.unsubscribe();this.detalhe?.unsubscribe();this.exportacao?.unsubscribe();this.modal?.hide();}
}
