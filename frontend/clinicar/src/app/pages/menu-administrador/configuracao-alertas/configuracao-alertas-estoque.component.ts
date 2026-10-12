import { FieldHelpDirective } from '../../../shared/field-help/field-help.directive';
import { FieldHelpPanelComponent } from '../../../shared/field-help/field-help-panel.component';
import { Component, OnInit, ViewChild, Input, Output, EventEmitter } from '@angular/core';

import { FormsModule, NgForm } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { finalize } from 'rxjs';
import { FeedbackDirective } from '../../../shared/feedback/feedback.directive';
import { exibirTelefoneFormatado } from '../../../shared/contatos/telefone-whatsapp';

interface ConfiguracaoEstoque {
  versao: number | null; ativo: boolean; idResponsavel: number | null; nomeResponsavel?: string;
  telefoneAdministrador: string; reenviarAlertaAposHoras: number;
}
interface Responsavel { id: number; nome: string; telefone: string; status: string; tipo_do_acesso: string; }
@Component({
    selector: 'app-configuracao-alertas-estoque',
    imports: [FieldHelpDirective, FieldHelpPanelComponent, FormsModule, FeedbackDirective],
    templateUrl: './configuracao-alertas-estoque.component.html',
    styleUrl: './configuracao-alertas.component.css'
})
export class ConfiguracaoAlertasEstoqueComponent implements OnInit {
  readonly formatarTelefone = exibirTelefoneFormatado;
  @Input() modoLeitura = false;
  @Output() configuracaoSalva = new EventEmitter<void>();
  @ViewChild('form') formulario?: NgForm;
  config: ConfiguracaoEstoque | null = null;
  responsaveis: Responsavel[] = [];
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
    this.http.get<Responsavel[]>('/api/usuario', {withCredentials: true}).subscribe({
      next: usuarios => this.responsaveis = usuarios.filter(u => u.status === 'ATIVO' && ['ADMINISTRADOR', 'COLABORADOR'].includes(u.tipo_do_acesso)),
      error: () => this.erro = 'Não foi possível consultar os responsáveis. Clique em Atualizar.'
    });
  }
  selecionarResponsavel(): void {
    const usuario = this.responsaveis.find(u => u.id === this.config?.idResponsavel);
    if (this.config) { this.config.telefoneAdministrador = usuario?.telefone || ''; this.config.nomeResponsavel = usuario?.nome; }
  }
  get responsavelValido(): boolean { return !!this.config?.idResponsavel && this.responsaveis.some(u => u.id === this.config?.idResponsavel); }
  get telefoneValido(): boolean { return /^[1-9][0-9]{9,14}$/.test((this.config?.telefoneAdministrador || '').replace(/\D/g, '')); }
  get configuracaoValida(): boolean {
    const c = this.config;
    return !!c && (!c.ativo || (!!c.idResponsavel && this.responsaveis.some(u => u.id === c.idResponsavel) && this.telefoneValido))
      && Number.isInteger(Number(c.reenviarAlertaAposHoras)) && c.reenviarAlertaAposHoras >= 1 && c.reenviarAlertaAposHoras <= 720;
  }
  salvar(): void {
    if (this.modoLeitura || !this.configuracaoValida || this.salvando) return;
    this.salvando = true; this.erro = ''; this.sucesso = '';
    this.http.put<ConfiguracaoEstoque>(this.url, { versao: this.config!.versao, ativo: this.config!.ativo, idResponsavel: this.config!.idResponsavel, reenviarAlertaAposHoras: this.config!.reenviarAlertaAposHoras }, {withCredentials: true}).pipe(finalize(() => this.salvando = false))
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
