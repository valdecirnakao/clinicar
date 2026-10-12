import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subscription } from 'rxjs';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { PaginacaoComponent } from '../../../shared/tabelas/paginacao.component';
@Component({
  selector: 'app-painel-operacional',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, PaginacaoComponent],
  templateUrl: './painel-operacional.component.html',
  styleUrl: './painel-operacional.component.css'
})
export class PainelOperacionalComponent implements OnInit {
  private destroy=inject(DestroyRef); private consulta?:Subscription; private http=inject(HttpClient); dados:Record<string,any>={}; notificacoes:any[]=[]; erro=''; carregando=false; pagina=0;tamanho=10;total=0;estado='';
  cards=[{campo:'agendamentos',titulo:'Agendamentos pendentes',rota:'../agendamento'},{campo:'atendimentos',titulo:'Atendimentos em andamento',rota:'../atendimento'},{campo:'estoqueCritico',titulo:'Estoque crítico / zerado',rota:'../controleEstoquePecas'},{campo:'notificacoesPendentes',titulo:'Notificações pendentes',rota:'.'},{campo:'notificacoesComFalha',titulo:'Notificações com falha',rota:'.'}];
  estados=[{valor:'PENDENTE',rotulo:'Aguardando envio'},{valor:'PROCESSANDO',rotulo:'Em processamento'},{valor:'TENTAR_NOVAMENTE',rotulo:'Nova tentativa agendada'},{valor:'ACEITA',rotulo:'Aceita pelo provedor'},{valor:'ENTREGUE',rotulo:'Entregue'},{valor:'LIDA',rotulo:'Lida'},{valor:'ERRO',rotulo:'Falha confirmada'},{valor:'INDETERMINADO',rotulo:'Sem confirmação'},{valor:'EXPIRADA',rotulo:'Expirada'},{valor:'CANCELADA',rotulo:'Cancelada'}];
  ngOnInit():void{this.carregar();}
  carregar():void{this.erro='';this.http.get<Record<string,any>>('/api/painel-operacional').pipe(takeUntilDestroyed(this.destroy)).subscribe({next:r=>this.dados=r,error:()=>this.erro='Não foi possível carregar o painel.'});this.carregarNotificacoes();}
  carregarNotificacoes():void{this.consulta?.unsubscribe();this.carregando=true;this.consulta=this.http.get<any>('/api/notificacoes',{params:{pagina:this.pagina,tamanho:this.tamanho,estado:this.estado}}).pipe(takeUntilDestroyed(this.destroy)).subscribe({next:r=>{this.notificacoes=r.itens;this.total=r.total;this.carregando=false;},error:()=>{this.carregando=false;this.erro='Não foi possível consultar as notificações.';}});}
  reenviar(id:number):void{this.carregando=true;this.http.post('/api/notificacoes/'+id+'/reenviar',{}).pipe(takeUntilDestroyed(this.destroy)).subscribe({next:()=>this.carregar(),error:()=>{this.carregando=false;this.erro='Não foi possível agendar a nova tentativa.';}});}
  rotulo(estado:string):string{return this.estados.find(item=>item.valor===estado)?.rotulo||estado;}
  contexto(texto:string,id:number):Record<string,string>{try{return {...JSON.parse(texto),retomarCadastro:String(id)};}catch{return {};}}
}
