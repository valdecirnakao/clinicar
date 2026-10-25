import { FieldHelpDirective } from '../../../shared/field-help/field-help.directive';
import { SeletorRemotoComponent } from '../../../shared/tabelas/seletor-remoto.component';
import { FieldHelpPanelComponent } from '../../../shared/field-help/field-help-panel.component';
import { UnidadePecaPipe } from '../../../shared/forms/unidade-peca.pipe';
import { FeedbackDirective } from '../../../shared/feedback/feedback.directive';
import { Component, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { FiltrosHistorico, HistoricoVeicular, HistoricoVeicularService } from './historico-veicular.service';

@Component({
    selector: 'app-historico-veicular',
    imports: [SeletorRemotoComponent, FieldHelpDirective, FieldHelpPanelComponent, UnidadePecaPipe, FeedbackDirective, CommonModule, FormsModule, RouterLink],
    templateUrl: './historico-veicular.component.html', styleUrls: ['./historico-veicular.component.css']
})
export class HistoricoVeicularComponent implements OnInit, OnChanges, OnDestroy {
  @Input() modoCliente = false;
  @Input() veiculosDoCliente: { id: number; placa: string; fabricante: string; modelo: string }[] = [];
  @Input() veiculoInicial: number | null = null;
  @Output() voltarAosVeiculos = new EventEmitter<void>();
  veiculos: { id: number; placa: string; fabricante: string; modelo: string }[] = [];
  veiculoId: number | null = null;
  inicio = ''; fim = ''; situacao = 'TODOS';
  relatorio: HistoricoVeicular | null = null;
  carregando = false; exportando = false; erro = ''; pagina = 1;
  itensPorPagina = 10;
  readonly opcoesItensPorPagina = [5, 10, 20, 50];
  private consulta?: Subscription;
  private exportacao?: Subscription;
  private lista?: Subscription;
  private rota?: Subscription;
  private versao = 0;
  constructor(private http: HttpClient, private route: ActivatedRoute, private service: HistoricoVeicularService) {}
  ngOnInit(): void {
    if (this.modoCliente) return;
    this.rota = this.route.queryParamMap.subscribe(params => {
      this.limparResultado();
      const id = Number(params.get('veiculoId'));
      this.veiculoId = Number.isSafeInteger(id) && id > 0 ? id : null;
      if (this.veiculoId) this.consultar();
    });
  }
  ngOnChanges(changes: SimpleChanges): void {
    if (!this.modoCliente || !changes['veiculoInicial']) return;
    this.veiculoId = this.veiculoInicial;
    if (this.veiculoId) this.consultar();
    else this.limparResultado();
  }
  ngOnDestroy(): void { this.consulta?.unsubscribe(); this.exportacao?.unsubscribe(); this.lista?.unsubscribe(); this.rota?.unsubscribe(); }
  limparResultado(): void {
    this.versao++; this.consulta?.unsubscribe(); this.exportacao?.unsubscribe();
    this.relatorio = null; this.carregando = false; this.exportando = false; this.erro = ''; this.pagina = 1;
  }
  consultar(): void {
    this.limparResultado();
    if (!this.veiculoId) { this.erro = 'Selecione um veículo para consultar o histórico.'; return; }
    if (this.inicio && this.fim && this.fim < this.inicio) { this.erro = 'A data final deve ser igual ou posterior à inicial.'; return; }
    this.carregando = true;
    this.consulta = this.service.consultar(this.filtros()).subscribe({
      next: relatorio => { this.relatorio = relatorio; this.carregando = false; },
      error: erro => { this.erro = erro.error?.mensagem || erro.error?.message || 'Não foi possível consultar o histórico. Tente novamente.'; this.carregando = false; }
    });
  }
  exportar(): void {
    if (!this.relatorio || this.exportando) return;
    const filtros = this.filtros(); const versao = this.versao;
    this.exportando = true; this.erro = '';
    this.exportacao = this.service.exportar(filtros).subscribe({
      next: blob => {
        const url = URL.createObjectURL(blob); const link = document.createElement('a');
        link.href = url; link.download = `historico-veicular-${filtros.veiculoId}.pdf`; link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000); this.exportando = false;
      },
      error: async erro => {
        let mensagem = 'Não foi possível exportar o PDF. Tente novamente.';
        try { if (erro.error instanceof Blob) { const dados = JSON.parse(await erro.error.text()); mensagem = dados.mensagem || dados.message || mensagem; } } catch {}
        if (versao === this.versao) { this.erro = mensagem; this.exportando = false; }
      }
    });
  }
  private filtros(): FiltrosHistorico { return { veiculoId: this.veiculoId!, inicio: this.inicio, fim: this.fim, situacao: this.situacao }; }
  get totalRegistros(): number { return this.relatorio?.registros.length || 0; }
  get totalPaginas(): number { return Math.max(1, Math.ceil(this.totalRegistros / this.itensPorPagina)); }
  get indiceInicialPagina(): number { return this.totalRegistros ? (this.pagina - 1) * this.itensPorPagina + 1 : 0; }
  get indiceFinalPagina(): number { return Math.min(this.pagina * this.itensPorPagina, this.totalRegistros); }
  get registrosPagina() { return this.relatorio?.registros.slice((this.pagina - 1) * this.itensPorPagina, this.pagina * this.itensPorPagina) || []; }
  aoAlterarItensPorPagina(): void { this.pagina = 1; }
  irParaPagina(pagina: number): void {
    if (Number.isInteger(pagina) && pagina >= 1 && pagina <= this.totalPaginas) this.pagina = pagina;
  }
  paginasVisiveis(): number[] {
    const inicio = Math.max(1, this.pagina - 2);
    const fim = Math.min(this.totalPaginas, this.pagina + 2);
    return Array.from({ length: fim - inicio + 1 }, (_, indice) => inicio + indice);
  }
  formatarPlaca(valor: string | null | undefined): string {
    const placa = (valor ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 7);
    return placa.length > 3 ? `${placa.slice(0, 3)}-${placa.slice(3)}` : placa;
  }
  quilometragem(valor: number | null): string {
    return valor == null ? 'Não informada' : new Intl.NumberFormat('pt-BR').format(valor);
  }
  dinheiro(valor: number | null): string { return valor == null ? 'Não informado' : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor); }
  rotulo(valor: string): string {
    const labels: Record<string, string> = { AGENDAMENTO: 'Agendamento', ATENDIMENTO: 'Atendimento', CONCLUIDO: 'Concluído', ENTREGUE: 'Entregue', CANCELADO: 'Cancelado', NAO_COMPARECEU: 'Não compareceu', EM_EXECUCAO: 'Em execução', EM_ATENDIMENTO: 'Em atendimento', AGENDADO: 'Agendado', CONFIRMADO: 'Confirmado', ABERTO: 'Aberto', APROVADO: 'Aprovado', EM_DIAGNOSTICO: 'Em diagnóstico', AGUARDANDO_APROVACAO: 'Aguardando aprovação', AGUARDANDO_TERCEIRO: 'Aguardando terceiro' };
    return labels[valor] || valor.replace(/_/g, ' ');
  }
}
