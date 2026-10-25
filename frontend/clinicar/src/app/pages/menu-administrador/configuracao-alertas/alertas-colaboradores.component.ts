
import { Component, OnInit, ViewChild, OnDestroy, DestroyRef, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { finalize, Subscription } from 'rxjs';
import { FeedbackDirective } from '../../../shared/feedback/feedback.directive';
import { ConfiguracaoAlertasEstoqueComponent } from './configuracao-alertas-estoque.component';
import { TelefoneWhatsappComponent } from '../../../shared/contatos/telefone-whatsapp.component';
import { SelecaoCadastroComponent } from '../../../shared/tabelas/selecao-cadastro.component';
import { aposFecharModal } from '../../../shared/fornecedores/transicao-modal';
declare const bootstrap:any;
interface ConsultaEstoque {whatsappHabilitado:boolean; configuracao:{ativo:boolean;idResponsavel:number|null;nomeResponsavel:string;telefoneAdministrador:string;idAdministradorCritico:number|null;nomeAdministradorCritico:string;telefoneAdministradorCritico:string;reenviarAlertaAposHoras:number;};}
@Component({
    selector: 'app-alertas-colaboradores',
    imports: [FormsModule, RouterLink, FeedbackDirective, ConfiguracaoAlertasEstoqueComponent, TelefoneWhatsappComponent, SelecaoCadastroComponent],
    templateUrl: './alertas-colaboradores.component.html', styleUrl: './alertas-tabelas.component.css'
})
export class AlertasColaboradoresComponent implements OnInit,OnDestroy {
  consulta:ConsultaEstoque|null=null;carregando=false;erro='';sucesso='';reenviando=false; tamanho=10;
  aberto=false; modoLeitura=true;
  perfilBusca: 'COLABORADOR' | 'ADMINISTRADOR' | null = null;
  @ViewChild(ConfiguracaoAlertasEstoqueComponent) editor?:ConfiguracaoAlertasEstoqueComponent;
  private modal:any;private modalSelecao:any;private requisicao?:Subscription;
  private readonly destroyRef = inject(DestroyRef);
  constructor(private http:HttpClient){}
  ngOnInit():void{this.carregar();}
  carregar():void{
    this.requisicao?.unsubscribe();this.carregando=true;this.erro='';
    this.requisicao=this.http.get<ConsultaEstoque>('/api/configuracao-alerta-estoque',{withCredentials:true})
      .pipe(finalize(()=>this.carregando=false)).subscribe({next:c=>this.consulta=c,error:e=>this.erro=e.error?.mensagem||'Não foi possível carregar os alertas de estoque.'});
  }
  abrir(leitura:boolean):void{this.aberto=true;this.modoLeitura=leitura;this.mostrarConfiguracao();}
  private mostrarConfiguracao():void{
    const elemento=document.getElementById('modalConfiguracaoColaborador');
    if(!elemento)return;
    elemento.addEventListener('hidden.bs.modal',()=>{if(!this.perfilBusca)this.aberto=false;},{once:true});
    this.modal=bootstrap.Modal.getOrCreateInstance(elemento);this.modal.show();
  }
  fechar():void{if(!this.editor?.salvando&&!this.editor?.reenviando)this.modal?.hide();}
  abrirBusca(perfil:'COLABORADOR'|'ADMINISTRADOR'):void{
    if(this.modoLeitura||this.editor?.salvando||this.editor?.reenviando)return;
    this.perfilBusca=perfil;
    aposFecharModal('modalConfiguracaoColaborador',this.modal,()=>{
      const elemento=document.getElementById('modalSelecionarDestinatarioEstoque');
      if(elemento){this.modalSelecao=bootstrap.Modal.getOrCreateInstance(elemento,{backdrop:'static',keyboard:false});this.modalSelecao.show();}
    },this.destroyRef);
  }
  selecionarDestinatario(usuario:any):void{
    if(!this.perfilBusca||!usuario?.id||usuario.status!=='ATIVO'||usuario.tipo_do_acesso!==this.perfilBusca)return;
    this.editor?.definirDestinatario(this.perfilBusca,usuario);
    this.fecharBusca();
  }
  fecharBusca():void{
    aposFecharModal('modalSelecionarDestinatarioEstoque',this.modalSelecao,()=>{
      this.perfilBusca=null;
      this.mostrarConfiguracao();
    },this.destroyRef);
  }
  salvo():void{this.sucesso='Configuração de estoque salva.';this.carregar();}
  reenviar():void{
    if(this.reenviando||!this.consulta?.configuracao.ativo||!this.consulta.whatsappHabilitado)return;
    this.reenviando=true;this.erro='';this.sucesso='';
    this.http.post<{estoquesVerificados:number;enviosAceitos:number;falhas:number}>('/api/configuracao-alerta-estoque/reenviar-pendentes',{}, {withCredentials:true})
      .pipe(finalize(()=>this.reenviando=false)).subscribe({next:r=>{this.sucesso=`${r.enviosAceitos} envio(s) aceito(s) pela Meta em ${r.estoquesVerificados} estoque(s) verificado(s).`;if(r.falhas)this.erro=`${r.falhas} estoque(s) com falha. Consulte os alertas de estoque.`;},error:e=>this.erro=e.error?.mensagem||'Não foi possível reenviar os avisos.'});
  }
  ngOnDestroy():void{this.requisicao?.unsubscribe();this.modalSelecao?.hide();this.modal?.hide();}
}
