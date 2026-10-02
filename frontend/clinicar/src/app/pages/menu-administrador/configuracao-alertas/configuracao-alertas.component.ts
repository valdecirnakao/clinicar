import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { finalize } from 'rxjs';
interface Configuracao {
  id: number; versao: number | null; ativo: boolean; antecedenciaDias: number;
  intervaloDias: number; maximoEnvios: number; diasAposVencimento: number;
  horaInicio: number; horaFim: number; fusoHorario: string;
}
interface Envio {
  id: number; previsaoId: number; destinatario: string; status: string;
  criadoEm: string; detalhe: string;
}
@Component({
  selector: 'app-configuracao-alertas', standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './configuracao-alertas.component.html',
  styleUrl: './configuracao-alertas.component.css'
})
export class ConfiguracaoAlertasComponent implements OnInit {
  config: Configuracao | null = null;
  envios: Envio[] = [];
  carregando = false; salvando = false; erro = ''; sucesso = '';
  private readonly url = '/api/configuracao-alerta-manutencao';
  constructor(private readonly http: HttpClient) {}
  ngOnInit(): void { this.carregar(); }
  carregar(): void {
    this.carregando = true; this.erro = ''; this.sucesso = '';
    this.http.get<Configuracao>(this.url, {withCredentials: true})
      .pipe(finalize(() => this.carregando = false)).subscribe({
        next: c => { this.config = c; this.historico(); },
        error: e => this.erro = e.error?.mensagem || 'Não foi possível carregar a configuração.'
      });
  }
  salvar(): void {
    if (!this.config || this.salvando) return;
    if (this.config.horaFim <= this.config.horaInicio) {
      this.erro = 'O horário final deve ser posterior ao inicial.'; return;
    }
    this.salvando = true; this.erro = ''; this.sucesso = '';
    this.http.put<Configuracao>(this.url, this.config, {withCredentials: true})
      .pipe(finalize(() => this.salvando = false)).subscribe({
        next: c => { this.config = c; this.sucesso = 'Configuração salva.'; },
        error: e => this.erro = e.error?.mensagem || 'Não foi possível salvar. Recarregue e tente novamente.'
      });
  }
  historico(): void {
    this.http.get<Envio[]>(this.url + '/historico', {withCredentials: true}).subscribe({
      next: e => this.envios = e,
      error: () => this.erro = 'Não foi possível carregar o histórico.'
    });
  }
  conciliar(envio: Envio, enviado: boolean): void {
    const pergunta = enviado ? 'Você confirmou que o servidor enviou este e-mail?'
      : 'Após verificar o servidor, deseja liberar nova tentativa? Se o e-mail anterior chegou, poderá haver duplicidade.';
    if (!window.confirm(pergunta)) return;
    this.http.post(this.url + '/historico/' + envio.id + '/conciliar', {enviado}, {withCredentials: true})
      .subscribe({next: () => this.historico(), error: e => this.erro = e.error?.mensagem || 'Falha na conciliação.'});
  }
}
