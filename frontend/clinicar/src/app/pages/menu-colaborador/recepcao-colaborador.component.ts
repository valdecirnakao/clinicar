import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SeletorRemotoComponent } from '../../shared/tabelas/seletor-remoto.component';

interface UsuarioCriado { id: number; nome: string; email: string; cpf: string; telefone: string; }
interface ConfiguracaoAlertas {
  id: number; versao: number | null; ativo: boolean; antecedenciaDias: number; intervaloDias: number;
  maximoEnvios: number; diasAposVencimento: number; horaInicio: number; horaFim: number; fusoHorario: string;
}

@Component({
  selector: 'app-recepcao-colaborador', standalone: true,
  imports: [CommonModule, FormsModule, SeletorRemotoComponent],
  templateUrl: './recepcao-colaborador.component.html', styleUrl: './recepcao-colaborador.component.css'
})
export class RecepcaoColaboradorComponent {
  private readonly http = inject(HttpClient);
  aba: 'cliente' | 'alertas' | 'agendamento' = 'cliente';
  clienteId: number | null = null;
  cliente: UsuarioCriado | null = null;
  clienteVeiculoId: number | null = null;
  clienteAgendamentoId: number | null = null;
  veiculoAgendamentoId: number | null = null;
  servicoAgendamentoId: number | null = null;
  responsavelId: number | null = null;
  erro = ''; sucesso = ''; salvando = false; carregandoConfiguracao = false;
  novoCliente = false;
  config: ConfiguracaoAlertas | null = null;
  clienteForm = { cpf: '', nome: '', nome_social: '', email: '', telefone: '', nascimento: '', senha: '', confirmarSenha: '' };
  veiculoForm = { placa: '', fabricante: '', modelo: '', cor: '', anoModeloCombustivel: '' };
  agendamentoForm = { dataHoraInicio: '', tipoAtendimento: 'PRESENCIAL', queixaCliente: '', observacoes: '' };

  constructor() {}

  selecionarCliente(item: any): void { this.cliente = item; this.clienteId = item?.id ?? null; this.config = null; this.sucesso = ''; this.erro = ''; }
  alterarClienteAgendamento(item: any): void { this.clienteAgendamentoId = item?.id ?? null; this.veiculoAgendamentoId = null; }

  cadastrarCliente(): void {
    this.erro = ''; this.sucesso = '';
    if (this.clienteForm.senha !== this.clienteForm.confirmarSenha) { this.erro = 'As senhas informadas não coincidem.'; return; }
    this.salvando = true;
    const { confirmarSenha, ...payload } = this.clienteForm;
    this.http.post<UsuarioCriado>('/api/usuario', payload, { withCredentials: true }).subscribe({
      next: cliente => { this.salvando = false; this.cliente = cliente; this.clienteId = cliente.id; this.config = null; this.sucesso = 'Cliente cadastrado. Agora você pode incluir um veículo, configurar os alertas ou agendar um serviço.'; this.novoCliente = false; },
      error: e => { this.salvando = false; this.erro = e.error?.mensagem || 'Não foi possível cadastrar o cliente. Confira os dados e tente novamente.'; }
    });
  }

  cadastrarVeiculo(): void {
    if (!this.clienteId) { this.erro = 'Selecione ou cadastre um cliente antes de incluir o veículo.'; return; }
    this.erro = ''; this.sucesso = ''; this.salvando = true;
    this.http.post<any>('/api/veiculo', { ...this.veiculoForm, idProprietario: this.clienteId }, { withCredentials: true }).subscribe({
      next: veiculo => { this.salvando = false; this.veiculoForm = { placa: '', fabricante: '', modelo: '', cor: '', anoModeloCombustivel: '' }; this.sucesso = `Veículo ${veiculo.placa} cadastrado para ${this.cliente?.nome || 'o cliente'}.`; },
      error: e => { this.salvando = false; this.erro = e.error?.mensagem || 'Não foi possível cadastrar o veículo. Confira os dados e a placa.'; }
    });
  }

  carregarConfiguracao(): void {
    if (!this.clienteId) { this.erro = 'Selecione um cliente para configurar os alertas.'; return; }
    this.erro = ''; this.sucesso = ''; this.carregandoConfiguracao = true;
    this.http.get<ConfiguracaoAlertas>('/api/configuracao-alerta-manutencao', { params: { usuarioId: this.clienteId }, withCredentials: true }).subscribe({
      next: config => { this.config = config; this.carregandoConfiguracao = false; },
      error: e => { this.carregandoConfiguracao = false; this.erro = e.error?.mensagem || 'Não foi possível carregar a configuração de alertas.'; }
    });
  }

  salvarConfiguracao(): void {
    if (!this.clienteId || !this.config || this.config.horaFim <= this.config.horaInicio) { this.erro = 'Confira os campos obrigatórios e informe uma hora final posterior à inicial.'; return; }
    this.erro = ''; this.sucesso = ''; this.salvando = true;
    this.http.put<ConfiguracaoAlertas>('/api/configuracao-alerta-manutencao', this.config, { params: { usuarioId: this.clienteId }, withCredentials: true }).subscribe({
      next: config => { this.config = config; this.salvando = false; this.sucesso = 'Configuração de alertas salva para o cliente.'; },
      error: e => { this.salvando = false; this.erro = e.error?.mensagem || 'Não foi possível salvar a configuração de alertas.'; }
    });
  }

  cadastrarAgendamento(): void {
    if (!this.clienteAgendamentoId || !this.veiculoAgendamentoId || !this.servicoAgendamentoId || !this.agendamentoForm.dataHoraInicio) { this.erro = 'Selecione cliente, veículo e serviço e informe a data e hora.'; return; }
    this.erro = ''; this.sucesso = ''; this.salvando = true;
    const payload = {
      idCliente: this.clienteAgendamentoId, idVeiculo: this.veiculoAgendamentoId,
      idServico: this.servicoAgendamentoId, idResponsavel: this.responsavelId,
      dataHoraInicio: this.agendamentoForm.dataHoraInicio, statusAgendamento: 'AGENDADO',
      canalOrigem: 'PRESENCIAL', prioridade: 'NORMAL', tipoAtendimento: this.agendamentoForm.tipoAtendimento,
      queixaCliente: this.agendamentoForm.queixaCliente, observacoes: this.agendamentoForm.observacoes,
      requerConfirmacao: true
    };
    this.http.post<any>('/api/agendamento', payload, { withCredentials: true }).subscribe({
      next: agendamento => { this.salvando = false; this.sucesso = `Agendamento ${agendamento.codigoAgendamento || ''} cadastrado com sucesso.`; this.agendamentoForm = { dataHoraInicio: '', tipoAtendimento: 'PRESENCIAL', queixaCliente: '', observacoes: '' }; this.veiculoAgendamentoId = null; this.servicoAgendamentoId = null; this.responsavelId = null; },
      error: e => { this.salvando = false; this.erro = e.error?.mensagem || 'Não foi possível cadastrar o agendamento. Verifique disponibilidade e dados selecionados.'; }
    });
  }
}
