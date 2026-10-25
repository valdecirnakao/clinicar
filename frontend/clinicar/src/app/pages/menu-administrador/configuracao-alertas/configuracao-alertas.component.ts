import { FieldHelpDirective } from '../../../shared/field-help/field-help.directive';
import { SeletorRemotoComponent } from '../../../shared/tabelas/seletor-remoto.component';
import { FieldHelpPanelComponent } from '../../../shared/field-help/field-help-panel.component';
import { FeedbackDirective } from '../../../shared/feedback/feedback.directive';
import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { finalize } from 'rxjs';
interface Configuracao {
  id: number; versao: number | null; ativo: boolean; antecedenciaDias: number;
  intervaloDias: number; maximoEnvios: number; diasAposVencimento: number;
  horaInicio: number; horaFim: number; fusoHorario: string;
}
type CampoConfiguracao = 'antecedenciaDias' | 'intervaloDias' | 'maximoEnvios' | 'diasAposVencimento' | 'horaInicio' | 'horaFim' | 'fusoHorario';
const LIMITES: Record<Exclude<CampoConfiguracao, 'fusoHorario'>, [number, number]> = {
  antecedenciaDias: [0, 365], intervaloDias: [1, 365], maximoEnvios: [1, 100],
  diasAposVencimento: [0, 365], horaInicio: [0, 23], horaFim: [1, 24]
};
interface Envio {
  id: number; previsaoId: number; destinatario: string; status: string;
  criadoEm: string; detalhe: string;
}
interface UsuarioAlerta { id: number; nome: string; email: string; status: string; telefone: string; }
@Component({
    selector: 'app-configuracao-alertas',
    imports: [SeletorRemotoComponent, FieldHelpDirective, FieldHelpPanelComponent, FeedbackDirective, CommonModule, FormsModule],
    templateUrl: './configuracao-alertas.component.html',
    styleUrl: './configuracao-alertas.component.css'
})
export class ConfiguracaoAlertasComponent implements OnInit {
  @Input() usuarioSelecionado: number | null = null;
  @Input() modoLeitura = false;
  @Output() configuracaoSalva = new EventEmitter<void>();
  config: Configuracao | null = null;
  usuarios: UsuarioAlerta[] = [];
  usuarioId: number | null = null;
  private requisicao = 0;
  envios: Envio[] = [];
  carregando = false; salvando = false; erro = ''; sucesso = '';
  private readonly url = '/api/configuracao-alerta-manutencao';
  constructor(private readonly http: HttpClient) {}
  readonly camposObrigatorios: CampoConfiguracao[] = ['antecedenciaDias', 'intervaloDias', 'maximoEnvios', 'diasAposVencimento', 'horaInicio', 'horaFim', 'fusoHorario'];
  campoValido(campo: CampoConfiguracao): boolean {
    if (!this.config) return false;
    const valor = this.config[campo];
    if (campo === 'fusoHorario') {
      if (typeof valor !== 'string' || !valor.trim()) return false;
      try { new Intl.DateTimeFormat('pt-BR', { timeZone: valor }); return true; } catch { return false; }
    }
    const [minimo, maximo] = LIMITES[campo];
    if (typeof valor !== 'number' || !Number.isInteger(valor) || valor < minimo || valor > maximo) return false;
    return campo !== 'horaFim' || !this.campoValido('horaInicio') || valor > this.config.horaInicio;
  }
  campoInvalido(campo: CampoConfiguracao): boolean { return !this.modoLeitura && !this.campoValido(campo); }
  mensagemCampo(campo: CampoConfiguracao): string {
    const valor = this.config?.[campo];
    if (valor == null || valor === '') return campo === 'fusoHorario' ? 'Selecione o fuso horário.' : 'Preencha este campo obrigatório.';
    if (campo === 'fusoHorario') return 'Selecione um fuso horário válido.';
    if (campo === 'horaFim' && this.campoValido('horaInicio') && typeof valor === 'number' && valor <= this.config!.horaInicio)
      return 'A hora final deve ser posterior à hora inicial.';
    const [minimo, maximo] = LIMITES[campo];
    return `Informe um número inteiro de ${minimo} a ${maximo}.`;
  }
  get camposPreenchidos(): number { return this.camposObrigatorios.filter(campo => this.campoValido(campo)).length; }
  get progresso(): number { return Math.round(this.camposPreenchidos / this.camposObrigatorios.length * 100); }
  get configuracaoValida(): boolean {
    return this.usuarioId != null && Number.isInteger(this.usuarioId) && this.usuarioId > 0
      && typeof this.config?.ativo === 'boolean' && this.camposPreenchidos === this.camposObrigatorios.length;
  }
  ngOnInit(): void {
    if (this.usuarioSelecionado != null) { this.usuarioId = this.usuarioSelecionado; this.carregar(); return; }
  }
  carregar(): void {
    const usuarioId = this.usuarioId;
    const requisicao = ++this.requisicao;
    this.config = null; this.envios = [];
    this.erro = ''; this.sucesso = '';
    if (usuarioId == null) { this.carregando = false; return; }
    this.carregando = true; this.erro = ''; this.sucesso = '';
    this.http.get<Configuracao>(this.url, {params: {usuarioId}, withCredentials: true})
      .pipe(finalize(() => { if (requisicao === this.requisicao) this.carregando = false; })).subscribe({
        next: c => { if (requisicao === this.requisicao) { this.config = c; this.historico(); } },
        error: e => { if (requisicao === this.requisicao) this.erro = e.error?.mensagem || 'Não foi possível carregar a configuração.'; }
      });
  }
  salvar(): void {
    if (this.modoLeitura || !this.config || this.usuarioId == null || this.salvando || this.carregando) return;
    if (!this.configuracaoValida) {
      this.erro = 'Preencha corretamente os campos obrigatórios antes de salvar a configuração.'; return;
    }
    this.salvando = true; this.erro = ''; this.sucesso = '';
    this.http.put<Configuracao>(this.url, this.config, {params: {usuarioId: this.usuarioId}, withCredentials: true})
      .pipe(finalize(() => this.salvando = false)).subscribe({
        next: c => { this.config = c; this.sucesso = 'Configuração salva.'; this.configuracaoSalva.emit(); },
        error: e => this.erro = e.error?.mensagem || 'Não foi possível salvar. Recarregue e tente novamente.'
      });
  }
  historico(): void {
    const usuarioId = this.usuarioId;
    if (usuarioId == null) return;
    const requisicao = this.requisicao;
    this.http.get<Envio[]>(this.url + '/historico', {params: {usuarioId}, withCredentials: true}).subscribe({
      next: e => { if (requisicao === this.requisicao) this.envios = e; },
      error: () => { if (requisicao === this.requisicao) this.erro = 'Não foi possível carregar o histórico.'; }
    });
  }
  conciliar(envio: Envio, enviado: boolean): void {
    if (this.modoLeitura) return;
    const pergunta = enviado ? 'Você confirmou o envio desta mensagem na Meta?'
      : 'Após verificar a Meta, deseja liberar nova tentativa? Se a mensagem anterior chegou, poderá haver duplicidade.';
    if (!window.confirm(pergunta)) return;
    this.http.post(this.url + '/historico/' + envio.id + '/conciliar', {enviado}, {withCredentials: true})
      .subscribe({next: () => this.historico(), error: e => this.erro = e.error?.mensagem || 'Falha na conciliação.'});
  }
}
