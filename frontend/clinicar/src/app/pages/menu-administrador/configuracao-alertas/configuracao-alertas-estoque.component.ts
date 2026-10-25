import { FieldHelpDirective } from '../../../shared/field-help/field-help.directive';
import { SeletorRemotoComponent } from '../../../shared/tabelas/seletor-remoto.component';
import { FieldHelpPanelComponent } from '../../../shared/field-help/field-help-panel.component';
import { Component, OnInit, ViewChild, Input, Output, EventEmitter } from '@angular/core';

import { FormsModule, NgForm } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { finalize } from 'rxjs';
import { FeedbackDirective } from '../../../shared/feedback/feedback.directive';
import { exibirTelefoneFormatado } from '../../../shared/contatos/telefone-whatsapp';

interface ConfiguracaoEstoque {
  versao: number | null; ativo: boolean; idResponsavel: number | null; nomeResponsavel?: string;
  telefoneAdministrador: string; idAdministradorCritico: number | null; nomeAdministradorCritico?: string;
  telefoneAdministradorCritico: string; reenviarAlertaAposHoras: number;
}
interface Responsavel { id: number; nome: string; telefone: string; status: string; tipo_do_acesso: string; }
@Component({
    selector: 'app-configuracao-alertas-estoque',
    imports: [SeletorRemotoComponent, FieldHelpDirective, FieldHelpPanelComponent, FormsModule, FeedbackDirective],
    templateUrl: './configuracao-alertas-estoque.component.html',
    styleUrl: './configuracao-alertas.component.css'
})
export class ConfiguracaoAlertasEstoqueComponent implements OnInit {
  readonly formatarTelefone = exibirTelefoneFormatado;
  @Input() modoLeitura = false;
  @Output() configuracaoSalva = new EventEmitter<void>();
  @Output() buscarResponsavel = new EventEmitter<'COLABORADOR' | 'ADMINISTRADOR'>();
  @ViewChild('form') formulario?: NgForm;
  config: ConfiguracaoEstoque | null = null;
  responsaveis: Responsavel[] = [];
  administradores: Responsavel[] = [];
  whatsappHabilitado = false;
  carregando = false; salvando = false; reenviando = false; erro = ''; sucesso = '';
  private readonly url = '/api/configuracao-alerta-estoque';
  constructor(private readonly http: HttpClient) {}
  ngOnInit(): void { this.carregar(); }
  carregar(): void {
    this.carregando = true; this.erro = '';
    this.http.get<{configuracao: ConfiguracaoEstoque; whatsappHabilitado: boolean}>(this.url, {withCredentials: true})
      .pipe(finalize(() => this.carregando = false)).subscribe({
        next: r => { this.config = r.configuracao; this.whatsappHabilitado = r.whatsappHabilitado; },
        error: e => this.erro = e.error?.mensagem || 'Não foi possível carregar a configuração de estoque.'
      });
  }
  registrarResponsavel(usuario: Responsavel | null): void {
    this.responsaveis = usuario?.status === 'ATIVO' && usuario.tipo_do_acesso === 'COLABORADOR' ? [usuario] : [];
    this.selecionarResponsavel();
  }
  registrarAdministrador(usuario: Responsavel | null): void {
    this.administradores = usuario?.status === 'ATIVO' && usuario.tipo_do_acesso === 'ADMINISTRADOR' ? [usuario] : [];
    this.selecionarAdministrador();
  }
  definirDestinatario(perfil: 'COLABORADOR' | 'ADMINISTRADOR', usuario: Responsavel): void {
    if (!this.config || usuario.status !== 'ATIVO' || usuario.tipo_do_acesso !== perfil) return;
    if (perfil === 'COLABORADOR') {
      this.config.idResponsavel = usuario.id;
      this.registrarResponsavel(usuario);
    } else {
      this.config.idAdministradorCritico = usuario.id;
      this.registrarAdministrador(usuario);
    }
    this.formulario?.form.markAsDirty();
  }
  selecionarResponsavel(): void {
    const usuario = this.responsaveis.find(u => u.id === this.config?.idResponsavel);
    if (this.config) { this.config.telefoneAdministrador = usuario?.telefone || ''; this.config.nomeResponsavel = usuario?.nome; }
  }
  selecionarAdministrador(): void {
    const usuario = this.administradores.find(u => u.id === this.config?.idAdministradorCritico);
    if (this.config) { this.config.telefoneAdministradorCritico = usuario?.telefone || ''; this.config.nomeAdministradorCritico = usuario?.nome; }
  }
  get responsavelValido(): boolean { return !!this.config?.idResponsavel && this.responsaveis.some(u => u.id === this.config?.idResponsavel); }
  get administradorValido(): boolean { return !!this.config?.idAdministradorCritico && this.administradores.some(u => u.id === this.config?.idAdministradorCritico); }
  get telefoneValido(): boolean { return /^[1-9][0-9]{9,14}$/.test((this.config?.telefoneAdministrador || '').replace(/\D/g, '')); }
  get telefoneAdministradorValido(): boolean { return /^[1-9][0-9]{9,14}$/.test((this.config?.telefoneAdministradorCritico || '').replace(/\D/g, '')); }
  get configuracaoValida(): boolean {
    const c = this.config;
    return !!c && (!c.ativo || (!!c.idResponsavel && this.responsaveis.some(u => u.id === c.idResponsavel) && this.telefoneValido
      && !!c.idAdministradorCritico && this.administradores.some(u => u.id === c.idAdministradorCritico) && this.telefoneAdministradorValido))
      && Number.isInteger(Number(c.reenviarAlertaAposHoras)) && c.reenviarAlertaAposHoras >= 1 && c.reenviarAlertaAposHoras <= 720;
  }
  salvar(): void {
    if (this.modoLeitura || !this.configuracaoValida || this.salvando) return;
    this.salvando = true; this.erro = ''; this.sucesso = '';
    this.http.put<ConfiguracaoEstoque>(this.url, { versao: this.config!.versao, ativo: this.config!.ativo, idResponsavel: this.config!.idResponsavel, idAdministradorCritico: this.config!.idAdministradorCritico, reenviarAlertaAposHoras: this.config!.reenviarAlertaAposHoras }, {withCredentials: true}).pipe(finalize(() => this.salvando = false))
      .subscribe({next: c => { this.config = c; this.formulario?.form.markAsPristine(); this.sucesso = 'Configuração de estoque salva. O acompanhamento automático verifica o estoque a cada minuto.'; this.configuracaoSalva.emit(); },
        error: e => this.erro = e.error?.mensagem || 'Não foi possível salvar. Atualize e tente novamente.'});
  }
  reenviarPendentes(): void {
    if (this.modoLeitura || this.reenviando || !this.config?.ativo || !this.whatsappHabilitado) return;
    this.reenviando = true; this.erro = ''; this.sucesso = '';
    this.http.post<{estoquesVerificados: number; enviosAceitos: number; falhas: number}>(this.url + '/reenviar-pendentes', {}, {withCredentials: true})
      .pipe(finalize(() => this.reenviando = false)).subscribe({
        next: r => { this.sucesso = `${r.enviosAceitos} envio(s) aceito(s) pela Meta em ${r.estoquesVerificados} estoque(s) verificado(s).`;
          if (r.falhas) this.erro = `${r.falhas} estoque(s) com falha. Consulte o motivo nos alertas de estoque.`; },
        error: e => this.erro = e.error?.mensagem || 'Não foi possível reenviar os alertas pendentes.'
      });
  }
}
