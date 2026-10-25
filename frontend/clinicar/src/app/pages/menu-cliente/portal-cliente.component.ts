import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { LoginService } from '../login/login.service';
import { HistoricoVeicularComponent } from '../menu-administrador/historico-veicular/historico-veicular.component';
import { formatarPlacaExibicao } from '../../shared/forms/formatar-placa';
import { FeedbackDirective } from '../../shared/feedback/feedback.directive';

interface PerfilCliente {
  id: number; nome: string; nome_social?: string; email: string; cpf: string; nascimento?: string;
  telefone?: string; cep?: string; logradouro?: string; numero_endereco?: string;
  complemento_endereco?: string; bairro?: string; cidade?: string; estado?: string;
}
interface VeiculoCliente {
  id: number; placa: string; fabricante: string; modelo: string; cor: string; anoModeloCombustivel: string;
}
interface EdicaoVeiculoCliente { veiculoId: number; possuiHistorico: boolean;
  pendente?: { id: number; status: string } | null;
  ultimaSolicitacao?: { id: number; status: string; motivoDecisao?: string } | null }
interface CorrecaoVeiculoCliente { veiculoId: number; placa: string; fabricante: string; modelo: string;
  anoModeloCombustivel: string; justificativa: string }
interface AlertasCliente {
  id: number; versao?: number; ativo: boolean; antecedenciaDias: number; intervaloDias: number;
  maximoEnvios: number; diasAposVencimento: number; horaInicio: number; horaFim: number; fusoHorario: string;
}
interface Portal { usuario: PerfilCliente; veiculos: VeiculoCliente[]; alertas: AlertasCliente; avisosServicoWhatsapp: boolean }
interface Acompanhamento { id: number; codigo: string; placa: string; servico: string; status: string; data?: string }
interface OrcamentoCliente { id: number; atendimentoId: number; versao: number; status: string; codigo: string;
  placa: string; servico: string; diagnostico: string; itens: string; valorMaoObra: number; valorPecas: number;
  valorTerceiros: number; desconto: number; valorTotal: number; prazoEstimadoEntrega?: string; criadoEm: string; decididoEm?: string }
interface OpcaoAgenda { id: number; nome: string; materiaisReferencia?: string;
  duracaoEstimada?: number; unidadeDuracao?: string }
interface PecaAgenda { idPeca: number; nome: string; quantidade: string; unidadeMedida?: string }
interface AgendamentoCliente {
  id: number; codigoAgendamento: string; idVeiculo: number; placaVeiculo: string; idServico: number;
  nomeServico: string; idResponsavel?: number; nomeResponsavel?: string; dataHoraInicio: string;
  dataHoraFim: string; statusAgendamento: string; queixaCliente?: string; observacoes?: string;
  sugestaoMateriaisCliente?: string;
  tipoExecucao?: string; idFornecedor?: number; razaoSocialFornecedor?: string;
  preferenciaExecucaoCliente?: string;
}
interface ItemAgenda { agendamento: AgendamentoCliente; pecas: PecaAgenda[] }
interface PaginaAgenda { itens: ItemAgenda[]; total: number; pagina: number; tamanho: number; indicadores: Record<string, number> }
interface FormAgenda { id?: number; idVeiculo: number | null; idServico: number | null;
  dataHoraInicio: string; dataHoraFim: string; queixaCliente: string; observacoes: string;
  sugestaoMateriaisCliente: string; preferenciaExecucaoCliente: string }

@Component({
  selector: 'app-portal-cliente', standalone: true, imports: [CommonModule, FormsModule, RouterLink, HistoricoVeicularComponent, FeedbackDirective],
  templateUrl: './portal-cliente.component.html', styleUrl: './portal-cliente.component.css'
})
export class PortalClienteComponent implements OnInit {
  readonly formatarPlaca = formatarPlacaExibicao;
  private readonly http = inject(HttpClient);
  private readonly login = inject(LoginService);
  private readonly router = inject(Router);
  portal: Portal | null = null;
  guia: 'dados' | 'veiculos' | 'historico' | 'alertas' | 'agendamentos' | 'atendimentos' = 'dados';
  historicoVeiculoId: number | null = null;
  dadosEditando: PerfilCliente | null = null;
  agendamentos: Acompanhamento[] = []; atendimentos: Acompanhamento[] = [];
  orcamentos: OrcamentoCliente[] = []; decisaoPendente: number | null = null;
  paginaAgenda: PaginaAgenda | null = null;
  buscaAgenda = ''; statusAgenda = ''; agendaForm: FormAgenda | null = null;
  agendaItemSelecionado: ItemAgenda | null = null;
  modoAgenda: 'editar' | 'reagendar' = 'editar';
  etapaAgenda: 'dados' | 'pecas' | 'informacoes' | 'revisao' = 'dados';
  etapaAgendaMaxima = 0;
  readonly etapasAgenda = ['dados', 'pecas', 'informacoes', 'revisao'] as const;
  private agendaFormOriginal = '';
  selecionandoVeiculoAgenda = false; buscaVeiculoAgenda = ''; paginaVeiculoAgenda = 0;
  readonly tamanhoPaginaVeiculoAgenda = 5;
  servicosAgenda: OpcaoAgenda[] = []; carregandoAgenda = false;
  cancelandoAgendaId: number | null = null;
  veiculoEditando: VeiculoCliente | null = null;
  edicoesVeiculo: Record<number, EdicaoVeiculoCliente> = {};
  correcaoVeiculo: CorrecaoVeiculoCliente | null = null;
  novoVeiculo = false;
  etapaCadastroCliente: 'veiculos' | 'decisao' | 'alertas' | null = null;
  carregando = false; salvando = false; mensagem = ''; erro = '';

  ngOnInit(): void { this.carregar(); }
  abrirGuia(guia: typeof this.guia): void {
    this.guia = guia; this.limparFeedback();
    if (guia === 'historico') this.historicoVeiculoId = null;
    if (guia === 'veiculos') this.carregarEdicoesVeiculo();
    if (guia === 'agendamentos') { this.carregarAgenda(); return; }
    if (guia === 'atendimentos') this.carregarAtendimentos();
  }
  carregarAtendimentos(): void {
    this.http.get<Acompanhamento[]>('/api/cliente/portal/atendimentos', { withCredentials: true }).subscribe({
      next: itens => this.atendimentos = itens, error: () => this.erro = 'Não foi possível consultar os atendimentos.'
    });
    this.http.get<OrcamentoCliente[]>('/api/cliente/portal/orcamentos', { withCredentials: true }).subscribe({
      next: itens => this.orcamentos = itens, error: () => this.erro = 'Não foi possível consultar os orçamentos.'
    });
  }
  decidirOrcamento(item: OrcamentoCliente, aceitar: boolean): void {
    if (this.decisaoPendente !== null || !confirm(`${aceitar ? 'Aceitar' : 'Recusar'} o orçamento ${item.codigo}, versão ${item.versao}, no valor de R$ ${item.valorTotal.toFixed(2)}?`)) return;
    this.decisaoPendente = item.id; this.limparFeedback();
    this.http.post(`/api/cliente/portal/orcamentos/${item.id}/decisao`, { aceitar }, { withCredentials: true }).subscribe({
      next: () => { this.decisaoPendente = null; this.mensagem = aceitar ? 'Orçamento aceito.' : 'Orçamento recusado. A oficina poderá enviar uma nova versão.'; this.carregarAtendimentos(); },
      error: erro => { this.decisaoPendente = null; this.erro = erro?.error?.mensagem || 'Não foi possível registrar sua decisão. Atualize a página e tente novamente.'; }
    });
  }
  carregarEdicoesVeiculo(): void {
    this.http.get<EdicaoVeiculoCliente[]>('/api/cliente/veiculos/edicao', { withCredentials: true }).subscribe({
      next: itens => this.edicoesVeiculo = Object.fromEntries(itens.map(item => [item.veiculoId, item])),
      error: () => this.erro = 'Não foi possível verificar quais veículos possuem histórico. Tente atualizar a página.'
    });
  }
  possuiHistoricoVeiculo(id: number): boolean { return this.edicoesVeiculo[id]?.possuiHistorico ?? true; }
  solicitarCorrecaoVeiculo(veiculo: VeiculoCliente): void {
    this.veiculoEditando = null; this.novoVeiculo = false;
    this.correcaoVeiculo = { veiculoId: veiculo.id, placa: veiculo.placa, fabricante: veiculo.fabricante,
      modelo: veiculo.modelo, anoModeloCombustivel: veiculo.anoModeloCombustivel, justificativa: '' };
    this.limparFeedback();
  }
  enviarCorrecaoVeiculo(): void {
    const correcao = this.correcaoVeiculo;
    if (!correcao || this.salvando || correcao.justificativa.trim().length < 10) return;
    this.salvando = true; this.limparFeedback();
    this.http.post(`/api/cliente/veiculos/${correcao.veiculoId}/correcoes`, correcao, { withCredentials: true }).subscribe({
      next: () => { this.salvando = false; this.correcaoVeiculo = null; this.carregarEdicoesVeiculo();
        this.mensagem = 'Correção enviada para análise da oficina.'; },
      error: erro => { this.salvando = false; this.erro = erro?.error?.mensagem || 'Não foi possível enviar a correção.'; }
    });
  }
  abrirHistorico(veiculoId: number): void {
    this.historicoVeiculoId = veiculoId;
    this.guia = 'historico';
    this.limparFeedback();
  }
  carregarAgenda(pagina = 0): void {
    this.carregandoAgenda = true;
    this.http.get<PaginaAgenda>('/api/cliente/agendamentos', { withCredentials: true,
      params: { pagina, tamanho: 10, busca: this.buscaAgenda, status: this.statusAgenda } }).subscribe({
      next: resultado => { this.paginaAgenda = resultado; this.carregandoAgenda = false; },
      error: () => { this.carregandoAgenda = false; this.erro = 'Não foi possível consultar os agendamentos.'; }
    });
  }
  totalAgenda(status: string): number { return this.paginaAgenda?.indicadores?.[status] || 0; }
  totalTodosAgenda(): number { return Object.values(this.paginaAgenda?.indicadores || {}).reduce((soma, valor) => soma + valor, 0); }
  ultimaPaginaAgenda(): number { return Math.max(0, Math.ceil((this.paginaAgenda?.total || 0) / 10) - 1); }
  statusAgendaLegivel(status: string): string { return status.replaceAll('_', ' ').toLowerCase().replace(/^./, letra => letra.toUpperCase()); }
  podeCancelarAgendamento(item: ItemAgenda): boolean {
    const status = item.agendamento.statusAgendamento;
    return ['AGENDADO', 'REAGENDADO', 'CONFIRMADO'].includes(status)
      && new Date(item.agendamento.dataHoraInicio).getTime() - Date.now() >= 24 * 60 * 60 * 1000;
  }
  podeConfirmarAgendamento(item: ItemAgenda): boolean {
    return ['AGENDADO', 'REAGENDADO'].includes(item.agendamento.statusAgendamento)
      && new Date(item.agendamento.dataHoraInicio).getTime() > Date.now()
      && (item.agendamento.tipoExecucao === 'INTERNA' && !!item.agendamento.idResponsavel
        || item.agendamento.tipoExecucao === 'EXTERNA' && !!item.agendamento.idFornecedor);
  }
  podeReagendarAgendamento(item: ItemAgenda): boolean {
    return ['AGENDADO', 'REAGENDADO', 'CONFIRMADO'].includes(item.agendamento.statusAgendamento)
      && this.podeCancelarAgendamento(item);
  }
  confirmarAgendamento(item: ItemAgenda): void {
    if (this.agendaForm?.id === item.agendamento.id
        && JSON.stringify(this.agendaForm) !== this.agendaFormOriginal) {
      this.erro = 'Salve ou descarte as alterações antes de confirmar o agendamento.';
      return;
    }
    if (this.cancelandoAgendaId !== null || !this.podeConfirmarAgendamento(item)
        || !confirm(`Confirmar o agendamento ${item.agendamento.codigoAgendamento} para ${new Date(item.agendamento.dataHoraInicio).toLocaleString('pt-BR')}?`)) return;
    this.cancelandoAgendaId = item.agendamento.id; this.limparFeedback();
    this.http.patch<ItemAgenda>(`/api/cliente/agendamentos/${item.agendamento.id}/confirmar`, {}, { withCredentials: true }).subscribe({
      next: () => { this.cancelandoAgendaId = null; this.agendaForm = null; this.agendaItemSelecionado = null;
        this.carregarAgenda(this.paginaAgenda?.pagina || 0); this.mensagem = 'Agendamento confirmado.'; },
      error: erro => { this.cancelandoAgendaId = null; this.carregarAgenda(this.paginaAgenda?.pagina || 0);
        this.erro = erro?.error?.message || erro?.error?.mensagem || 'Não foi possível confirmar. Confira a disponibilidade com a oficina.'; }
    });
  }
  cancelarAgendamento(item: ItemAgenda): void {
    if (this.cancelandoAgendaId !== null || !this.podeCancelarAgendamento(item)
        || !confirm(`Cancelar o agendamento ${item.agendamento.codigoAgendamento}? As peças reservadas serão liberadas.`)) return;
    this.cancelandoAgendaId = item.agendamento.id; this.limparFeedback();
    this.http.patch<ItemAgenda>(`/api/cliente/agendamentos/${item.agendamento.id}/cancelar`, {}, { withCredentials: true }).subscribe({
      next: () => { this.cancelandoAgendaId = null; this.agendaForm = null; this.agendaItemSelecionado = null;
        this.carregarAgenda(this.paginaAgenda?.pagina || 0);
        this.mensagem = 'Agendamento cancelado. As peças reservadas foram liberadas.'; },
      error: erro => { this.cancelandoAgendaId = null; this.carregarAgenda(this.paginaAgenda?.pagina || 0);
        this.erro = erro?.error?.message || erro?.error?.mensagem || 'Não foi possível cancelar. Confira o prazo ou contate a oficina.'; }
    });
  }
  abrirNovoAgendamento(): void {
    this.agendaItemSelecionado = null; this.modoAgenda = 'editar';
    this.etapaAgenda = 'dados';
    this.etapaAgendaMaxima = 0;
    this.agendaFormOriginal = '';
    this.selecionandoVeiculoAgenda = false;
    this.agendaForm = { idVeiculo: null, idServico: null, dataHoraInicio: '',
      dataHoraFim: '', queixaCliente: '', observacoes: '', sugestaoMateriaisCliente: '', preferenciaExecucaoCliente: '' };
    this.limparFeedback(); this.carregarCatalogosAgenda();
  }
  abrirSelecaoVeiculoAgenda(): void {
    this.buscaVeiculoAgenda = '';
    this.paginaVeiculoAgenda = 0;
    this.selecionandoVeiculoAgenda = true;
  }
  veiculosFiltradosAgenda(): VeiculoCliente[] {
    const busca = this.buscaVeiculoAgenda.trim().toLocaleLowerCase('pt-BR');
    return (this.portal?.veiculos || []).filter(v =>
      !busca || [v.placa, v.fabricante, v.modelo, v.cor].some(campo => campo?.toLocaleLowerCase('pt-BR').includes(busca)));
  }
  paginaVeiculosAgenda(): VeiculoCliente[] {
    const inicio = this.paginaVeiculoAgenda * this.tamanhoPaginaVeiculoAgenda;
    return this.veiculosFiltradosAgenda().slice(inicio, inicio + this.tamanhoPaginaVeiculoAgenda);
  }
  veiculoSelecionadoAgenda(): VeiculoCliente | undefined {
    return this.portal?.veiculos.find(v => v.id === this.agendaForm?.idVeiculo);
  }
  identificacaoVeiculoAgenda(): string {
    const veiculo = this.veiculoSelecionadoAgenda();
    return veiculo ? `${this.formatarPlaca(veiculo.placa)} · ${veiculo.modelo}` : '';
  }
  totalPaginasVeiculoAgenda(): number {
    return Math.max(1, Math.ceil(this.veiculosFiltradosAgenda().length / this.tamanhoPaginaVeiculoAgenda));
  }
  selecionarVeiculoAgenda(veiculo: VeiculoCliente): void {
    if (!this.agendaForm || !this.portal?.veiculos.some(item => item.id === veiculo.id)) return;
    this.agendaForm.idVeiculo = veiculo.id;
    this.selecionandoVeiculoAgenda = false;
  }
  editarAgendamento(item: ItemAgenda): void {
    this.agendaItemSelecionado = item; this.modoAgenda = 'editar';
    this.etapaAgenda = 'dados';
    this.etapaAgendaMaxima = 0;
    this.selecionandoVeiculoAgenda = false;
    const a = item.agendamento;
    this.agendaForm = { id: a.id, idVeiculo: a.idVeiculo, idServico: a.idServico,
      dataHoraInicio: a.dataHoraInicio?.slice(0, 16) || '',
      dataHoraFim: a.dataHoraFim?.slice(0, 16) || '', queixaCliente: a.queixaCliente || '',
      observacoes: item.pecas.length ? (a.observacoes || '').split('[PEÇAS PREVISTAS NO AGENDAMENTO]')[0].trim()
        : a.observacoes || '',
      sugestaoMateriaisCliente: a.sugestaoMateriaisCliente || '',
      preferenciaExecucaoCliente: a.preferenciaExecucaoCliente || '' };
    this.agendaFormOriginal = JSON.stringify(this.agendaForm);
    this.limparFeedback(); this.carregarCatalogosAgenda();
  }
  abrirReagendamento(item: ItemAgenda): void {
    if (!this.podeReagendarAgendamento(item)) return;
    this.editarAgendamento(item);
    this.modoAgenda = 'reagendar';
  }
  private carregarCatalogosAgenda(): void {
    this.http.get<{ servicos: OpcaoAgenda[] }>(
      '/api/cliente/agendamentos/catalogos', { withCredentials: true }).subscribe({
      next: catalogos => { this.servicosAgenda = catalogos.servicos; },
      error: () => this.erro = 'Não foi possível carregar os serviços.'
    });
  }
  periodoAgendaValido(): boolean {
    const f = this.agendaForm;
    return !!f?.dataHoraInicio && !!f.dataHoraFim && new Date(f.dataHoraFim).getTime() > new Date(f.dataHoraInicio).getTime();
  }
  duracaoServicoAgenda(): number | null {
    const servico = this.servicosAgenda.find(item => item.id === this.agendaForm?.idServico);
    const valor = Number(servico?.duracaoEstimada);
    if (!servico || !Number.isFinite(valor) || valor <= 0) return null;
    const unidade = (servico.unidadeDuracao || 'MINUTO').toLocaleLowerCase('pt-BR');
    const multiplicador = unidade.includes('hora') ? 60 : unidade.includes('dia') ? 1440 : 1;
    return Math.round(valor * multiplicador);
  }
  atualizarFimPelaDuracaoAgenda(): void {
    const f = this.agendaForm;
    if (!f?.dataHoraInicio) return;
    const duracao = this.duracaoServicoAgenda();
    const inicio = new Date(f.dataHoraInicio);
    if (!duracao || Number.isNaN(inicio.getTime())) return;
    inicio.setMinutes(inicio.getMinutes() + duracao);
    const local = (n: number) => String(n).padStart(2, '0');
    f.dataHoraFim = `${inicio.getFullYear()}-${local(inicio.getMonth() + 1)}-${local(inicio.getDate())}T${local(inicio.getHours())}:${local(inicio.getMinutes())}`;
  }
  alterarServicoAgenda(): void {
    if (this.agendaForm?.dataHoraInicio) this.atualizarFimPelaDuracaoAgenda();
  }
  alterarInicioAgenda(): void {
    if (this.agendaForm?.dataHoraInicio && this.duracaoServicoAgenda()) this.atualizarFimPelaDuracaoAgenda();
  }
  dadosAgendaValidos(): boolean {
    const f = this.agendaForm;
    return !!f?.idVeiculo && !!f.idServico && this.periodoAgendaValido();
  }
  podeAvancarEtapaAgenda(): boolean {
    return this.etapaAgenda !== 'revisao' && (this.etapaAgenda !== 'dados' || this.dadosAgendaValidos());
  }
  podeAcessarEtapaAgenda(etapa: typeof this.etapasAgenda[number]): boolean {
    const destino = this.etapasAgenda.indexOf(etapa);
    if (destino === 0) return true;
    return this.dadosAgendaValidos() && (destino <= this.etapaAgendaMaxima || destino === this.etapasAgenda.indexOf(this.etapaAgenda) + 1);
  }
  selecionarEtapaAgenda(etapa: typeof this.etapasAgenda[number]): void {
    if (!this.podeAcessarEtapaAgenda(etapa)) return;
    this.etapaAgenda = etapa;
    this.etapaAgendaMaxima = Math.max(this.etapaAgendaMaxima, this.etapasAgenda.indexOf(etapa));
  }
  progressoAgenda(): number {
    const f = this.agendaForm;
    const completos = Number(!!f?.idVeiculo) + Number(!!f?.idServico)
      + Number(!!f?.dataHoraInicio) + Number(this.periodoAgendaValido())
      + (this.dadosAgendaValidos() ? this.etapaAgendaMaxima : 0);
    return Math.round(completos / 7 * 100);
  }
  mensagemProgressoAgenda(): string {
    const f = this.agendaForm;
    if (!f?.idVeiculo) return 'Selecione um veículo para continuar.';
    if (!f.idServico) return 'Selecione o serviço desejado.';
    if (!f.dataHoraInicio || !f.dataHoraFim || !this.periodoAgendaValido()) return 'Informe um período válido para o atendimento.';
    return this.etapaAgenda === 'revisao' ? 'Confira o pedido antes de enviar à oficina.' : 'Dados obrigatórios completos. A oficina definirá quem executará o serviço.';
  }
  proximaEtapaAgenda(): void {
    if (!this.podeAvancarEtapaAgenda()) return;
    const indice = this.etapasAgenda.indexOf(this.etapaAgenda);
    if (indice < this.etapasAgenda.length - 1) this.selecionarEtapaAgenda(this.etapasAgenda[indice + 1]);
  }
  etapaAnteriorAgenda(): void {
    const indice = this.etapasAgenda.indexOf(this.etapaAgenda);
    if (indice > 0) this.etapaAgenda = this.etapasAgenda[indice - 1];
  }
  nomeServicoAgenda(): string {
    return this.servicosAgenda.find(s => s.id === this.agendaForm?.idServico)?.nome || 'Não selecionado';
  }
  materiaisReferenciaAgenda(): string {
    return this.servicosAgenda.find(s => s.id === this.agendaForm?.idServico)?.materiaisReferencia || '';
  }
  nomeResponsavelAgenda(): string {
    const item = this.agendaItemSelecionado?.agendamento;
    if (item?.tipoExecucao === 'EXTERNA') return item.razaoSocialFornecedor || 'Fornecedor a definir pela oficina';
    return item?.nomeResponsavel || 'A definir pela oficina';
  }
  salvarAgendamento(): void {
    const f = this.agendaForm;
    if (this.etapaAgenda !== 'revisao' || !f || !this.dadosAgendaValidos() || this.salvando) return;
    this.salvando = true; this.limparFeedback();
    const body = { idVeiculo: Number(f.idVeiculo), idServico: Number(f.idServico),
      dataHoraInicio: f.dataHoraInicio, dataHoraFim: f.dataHoraFim,
      queixaCliente: f.queixaCliente, observacoes: f.observacoes,
      sugestaoMateriaisCliente: f.sugestaoMateriaisCliente,
      preferenciaExecucaoCliente: f.preferenciaExecucaoCliente };
    const pedido = f.id && this.modoAgenda === 'reagendar'
      ? this.http.put<ItemAgenda>(`/api/cliente/agendamentos/${f.id}/reagendar`, body, { withCredentials: true })
      : f.id ? this.http.put<ItemAgenda>(`/api/cliente/agendamentos/${f.id}`, body, { withCredentials: true })
      : this.http.post<ItemAgenda>('/api/cliente/agendamentos', body, { withCredentials: true });
    pedido.subscribe({ next: () => { this.salvando = false; this.agendaForm = null; this.agendaItemSelecionado = null;
      this.carregarAgenda(); this.mensagem = this.modoAgenda === 'reagendar'
        ? 'Nova data solicitada. A oficina definirá a execução antes da confirmação.' : 'Solicitação enviada. A oficina definirá a execução antes da confirmação.'; },
      error: erro => { this.salvando = false; this.erro = erro?.error?.mensagem || 'Não foi possível salvar o agendamento.'; } });
  }
  carregar(): void {
    this.carregando = true; this.erro = '';
    this.http.get<Portal>('/api/cliente/portal', { withCredentials: true }).subscribe({
      next: portal => { this.portal = portal; this.carregando = false; this.retomarCadastroCliente(portal); },
      error: erro => { this.carregando = false; this.erro = 'Não foi possível carregar seus dados.';
        if (erro.status === 401 || erro.status === 403) void this.router.navigate(['/login']); }
    });
  }
  salvarDados(): void {
    if (!this.portal || !this.dadosEditando || this.salvando) return;
    this.salvando = true; this.limparFeedback();
    this.http.put<PerfilCliente>('/api/cliente/portal/dados', this.dadosEditando, { withCredentials: true }).subscribe({
      next: usuario => { if (this.portal) this.portal.usuario = usuario; this.dadosEditando = null; this.salvando = false; this.mensagem = 'Dados atualizados com sucesso.'; },
      error: erro => { this.salvando = false; this.erro = erro?.error?.mensagem || 'Não foi possível atualizar seus dados. Confira os campos.'; }
    });
  }
  editarDados(): void { if (this.portal) this.dadosEditando = { ...this.portal.usuario }; this.limparFeedback(); }
  cancelarEdicao(): void { this.dadosEditando = null; this.limparFeedback(); }
  formatarCpf(valor?: string): string { const digitos = (valor || '').replace(/\D/g, ''); return digitos.length === 11 ? digitos.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') : valor || '—'; }
  formatarTelefone(valor?: string): string { const digitos = (valor || '').replace(/\D/g, '').replace(/^55(?=\d{10,11}$)/, ''); return digitos.length === 11 ? `+55 (${digitos.slice(0, 2)}) ${digitos.slice(2, 7)}-${digitos.slice(7)}` : digitos.length === 10 ? `+55 (${digitos.slice(0, 2)}) ${digitos.slice(2, 6)}-${digitos.slice(6)}` : valor || '—'; }
  formatarCep(valor?: string): string { const digitos = (valor || '').replace(/\D/g, ''); return digitos.length === 8 ? `${digitos.slice(0, 5)}-${digitos.slice(5)}` : valor || '—'; }
  editarVeiculo(veiculo: VeiculoCliente): void { this.correcaoVeiculo = null; this.veiculoEditando = { ...veiculo }; this.novoVeiculo = false; this.limparFeedback(); }
  cadastrarVeiculo(): void { this.correcaoVeiculo = null; this.veiculoEditando = { id: 0, placa: '', fabricante: '', modelo: '', cor: '', anoModeloCombustivel: '' }; this.novoVeiculo = true; this.limparFeedback(); }
  salvarVeiculo(): void {
    if (!this.veiculoEditando || this.salvando) return;
    this.salvando = true; this.limparFeedback();
    const request = this.novoVeiculo
      ? this.http.post<VeiculoCliente>('/api/cliente/portal/veiculos', this.veiculoEditando, { withCredentials: true })
      : this.http.put<VeiculoCliente>(`/api/cliente/portal/veiculos/${this.veiculoEditando.id}`, this.veiculoEditando, { withCredentials: true });
    request.subscribe({
      next: veiculo => { if (this.portal) this.portal.veiculos = this.novoVeiculo ? [veiculo, ...this.portal.veiculos] : this.portal.veiculos.map(atual => atual.id === veiculo.id ? veiculo : atual);
        if (this.novoVeiculo) this.edicoesVeiculo[veiculo.id] = { veiculoId: veiculo.id, possuiHistorico: false, pendente: null, ultimaSolicitacao: null };
        this.veiculoEditando = null; this.novoVeiculo = false; this.salvando = false; this.mensagem = 'Veículo salvo com sucesso.';
        if (this.etapaCadastroCliente) this.definirEtapaCadastroCliente('decisao'); },
      error: erro => { this.salvando = false; this.erro = erro?.error?.mensagem || 'Não foi possível atualizar o veículo.'; }
    });
  }
  salvarAlertas(): void {
    if (!this.portal || this.salvando) return;
    this.salvando = true; this.limparFeedback();
    this.http.put<AlertasCliente>('/api/cliente/portal/alertas', this.portal.alertas, { withCredentials: true }).subscribe({
      next: alertas => { if (this.portal) this.portal.alertas = alertas; this.salvando = false; this.mensagem = 'Preferências de alertas atualizadas.';
        if (this.etapaCadastroCliente) { sessionStorage.removeItem('clinicar.cadastroCliente'); this.etapaCadastroCliente = null; } },
      error: () => { this.salvando = false; this.erro = 'Não foi possível salvar os alertas. Recarregue os dados e confira os valores.'; }
    });
  }
  salvarAvisosServico(): void {
    if (!this.portal || this.salvando) return;
    const ativo = this.portal.avisosServicoWhatsapp;
    this.salvando = true; this.limparFeedback();
    this.http.put<boolean>('/api/cliente/portal/avisos-servico-whatsapp', { ativo }, { withCredentials: true }).subscribe({
      next: valor => { if (this.portal) this.portal.avisosServicoWhatsapp = valor;
        this.salvando = false; this.mensagem = valor ? 'Avisos de agendamentos e atendimentos ativados.' : 'Avisos de agendamentos e atendimentos desativados.'; },
      error: () => { if (this.portal) this.portal.avisosServicoWhatsapp = !ativo;
        this.salvando = false; this.erro = 'Não foi possível atualizar a preferência de WhatsApp.'; }
    });
  }
  sair(): void { this.login.logout().subscribe({ next: () => void this.router.navigate(['/login']), error: () => void this.router.navigate(['/login']) }); }
  private retomarCadastroCliente(portal: Portal): void {
    const pendente = sessionStorage.getItem('clinicar.cadastroCliente');
    if (!pendente) return;
    const [id, etapa] = pendente.split(':');
    if (Number(id) !== portal.usuario.id || !['veiculos', 'decisao', 'alertas'].includes(etapa)) return;
    this.etapaCadastroCliente = etapa as 'veiculos' | 'decisao' | 'alertas';
    this.abrirGuia(etapa === 'alertas' ? 'alertas' : 'veiculos');
    if (etapa === 'veiculos') this.cadastrarVeiculo();
  }
  private definirEtapaCadastroCliente(etapa: 'veiculos' | 'decisao' | 'alertas'): void {
    if (!this.portal) return;
    this.etapaCadastroCliente = etapa;
    sessionStorage.setItem('clinicar.cadastroCliente', `${this.portal.usuario.id}:${etapa}`);
  }
  cadastrarOutroVeiculo(): void {
    this.definirEtapaCadastroCliente('veiculos');
    this.abrirGuia('veiculos');
    this.cadastrarVeiculo();
  }
  continuarCadastroParaAlertas(): void {
    if (!this.portal?.veiculos.length) { this.erro = 'Cadastre ao menos um veículo para continuar.'; return; }
    this.definirEtapaCadastroCliente('alertas');
    this.abrirGuia('alertas');
  }
  private limparFeedback(): void { this.mensagem = ''; this.erro = ''; }
}
