import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

interface AtendimentoTecnico {
  id: number; codigoAtendimento: string; nomeCliente: string; placaVeiculo: string;
  nomeServico: string; statusAtendimento: string; relatoCliente?: string;
  diagnosticoTecnico?: string; servicoExecutado?: string; observacoesInternas?: string;
  recomendacoesCliente?: string; quilometragemEntrada?: number;
  quilometragemSaida?: number;
}
interface ItemChecklist { item: string; situacao: string; observacao: string }
interface FotoResumo { id: number; nomeArquivo: string; tamanhoBytes: number; registradoEm: string }
interface PausaResumo { id: number; autorId: number; motivo: string; pausadoEm: string; retomadoEm?: string; retomadoPorId?: number }

@Component({ selector: 'app-relato-tecnico', standalone: true, imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './relato-tecnico.component.html', styleUrl: './relato-tecnico.component.css' })
export class RelatoTecnicoComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  atendimento: AtendimentoTecnico | null = null;
  readonly itensPadrao = [
    { item: 'IDENTIFICACAO_VEICULO', nome: 'Identificação do veículo' },
    { item: 'NIVEIS_FLUIDOS', nome: 'Níveis de fluidos' },
    { item: 'FREIOS', nome: 'Freios' },
    { item: 'PNEUS', nome: 'Pneus' },
    { item: 'TESTE_FINAL', nome: 'Teste final' }
  ];
  checklist: ItemChecklist[] = this.itensPadrao.map(x => ({ item: x.item, situacao: '', observacao: '' }));
  fotos: FotoResumo[] = [];
  pausas: PausaResumo[] = [];
  motivoPausa = '';
  salvandoChecklist = false; enviandoFoto = false;
  avancando = false;
  get voltar(): string { return this.router.url.startsWith('/menuAdministrador') ? '/menuAdministrador/atendimento' : '/menuColaborador/painel'; }
  get progresso(): number {
    const etapas: Record<string, number> = { ABERTO: 0, EM_DIAGNOSTICO: 1, AGUARDANDO_APROVACAO: 2,
      APROVADO: 3, EM_EXECUCAO: 4, PAUSADO: 4, AGUARDANDO_TERCEIRO: 4, CONCLUIDO: 5, ENTREGUE: 6 };
    return etapas[this.atendimento?.statusAtendimento || 'ABERTO'] ?? 0;
  }
  carregando = false; salvando = false; erro = ''; mensagem = '';
  get encerrado(): boolean { return !!this.atendimento && ['CANCELADO', 'CONCLUIDO', 'ENTREGUE'].includes(this.atendimento.statusAtendimento); }
  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!Number.isInteger(id) || id < 1) { this.erro = 'Atendimento inválido.'; return; }
    this.carregando = true;
    this.http.get<AtendimentoTecnico>(`/api/colaborador/meus-atendimentos/${id}`, { withCredentials: true }).subscribe({
      next: atendimento => { this.atendimento = atendimento; this.carregando = false; this.carregarRegistros(); },
      error: () => { this.erro = 'Atendimento não encontrado entre os seus serviços atribuídos.'; this.carregando = false; }
    });
  }
  carregarRegistros(): void {
    if (!this.atendimento) return;
    const base = `/api/colaborador/meus-atendimentos/${this.atendimento.id}`;
    this.http.get<ItemChecklist[]>(`${base}/checklist`, { withCredentials: true }).subscribe({
      next: salvos => this.checklist = this.itensPadrao.map(padrao => {
        const item = salvos.find(registro => registro.item === padrao.item);
        return { item: padrao.item, situacao: item?.situacao || '', observacao: item?.observacao || '' };
      }), error: () => this.erro = 'Não foi possível carregar o checklist.'
    });
    this.http.get<FotoResumo[]>(`${base}/fotos`, { withCredentials: true }).subscribe({
      next: fotos => this.fotos = fotos, error: () => this.erro = 'Não foi possível carregar as fotos.'
    });
    this.http.get<PausaResumo[]>(`${base}/pausas`, { withCredentials: true }).subscribe({
      next: pausas => this.pausas = pausas, error: () => this.erro = 'Não foi possível carregar o histórico de pausas.'
    });
  }
  alterarPausa(acao: 'pausar' | 'retomar'): void {
    if (!this.atendimento || this.avancando) return;
    if (acao === 'pausar' && !this.motivoPausa.trim()) { this.erro = 'Informe o motivo da pausa.'; return; }
    this.avancando = true; this.erro = ''; this.mensagem = '';
    this.http.patch<AtendimentoTecnico>(`/api/colaborador/meus-atendimentos/${this.atendimento.id}/${acao}`,
      acao === 'pausar' ? {motivo: this.motivoPausa.trim()} : {}, {withCredentials: true}).subscribe({
        next: atendimento => { this.atendimento = atendimento; this.motivoPausa = ''; this.avancando = false;
          this.mensagem = acao === 'pausar' ? 'Atendimento pausado.' : 'Execução retomada.'; this.carregarRegistros(); },
        error: erro => { this.avancando = false; this.erro = erro?.error?.mensagem || 'Não foi possível alterar a pausa.'; }
      });
  }
  salvarChecklist(): void {
    if (!this.atendimento || this.encerrado || this.salvandoChecklist) return;
    const itens = this.checklist.filter(item => item.situacao);
    if (!itens.length) { this.erro = 'Marque ao menos um item do checklist.'; return; }
    this.salvandoChecklist = true; this.erro = ''; this.mensagem = '';
    this.http.put<ItemChecklist[]>(`/api/colaborador/meus-atendimentos/${this.atendimento.id}/checklist`, itens, { withCredentials: true })
      .subscribe({ next: () => { this.salvandoChecklist = false; this.mensagem = 'Checklist salvo com sucesso.'; },
        error: () => { this.salvandoChecklist = false; this.erro = 'Não foi possível salvar o checklist.'; } });
  }
  enviarFoto(evento: Event): void {
    const input = evento.target as HTMLInputElement;
    const arquivo = input.files?.[0];
    if (!this.atendimento || !arquivo || this.enviandoFoto || this.encerrado) return;
    if (arquivo.size > 3_000_000 || !['image/jpeg', 'image/png', 'image/webp'].includes(arquivo.type)) {
      this.erro = 'Selecione uma foto JPEG, PNG ou WebP de até 3 MB.'; input.value = ''; return;
    }
    this.enviandoFoto = true; this.erro = ''; this.mensagem = '';
    const leitor = new FileReader();
    leitor.onerror = () => { this.enviandoFoto = false; this.erro = 'Não foi possível ler a foto.'; };
    leitor.onload = () => {
      const conteudoBase64 = String(leitor.result || '').split(',')[1];
      this.http.post<FotoResumo>(`/api/colaborador/meus-atendimentos/${this.atendimento!.id}/fotos`,
        { nomeArquivo: arquivo.name, tipoMime: arquivo.type, conteudoBase64 }, { withCredentials: true }).subscribe({
          next: foto => { this.fotos = [...this.fotos, foto]; this.enviandoFoto = false; this.mensagem = 'Foto registrada no atendimento.'; input.value = ''; },
          error: () => { this.enviandoFoto = false; this.erro = 'Não foi possível salvar a foto.'; input.value = ''; }
        });
    };
    leitor.readAsDataURL(arquivo);
  }
  urlFoto(id: number): string { return `/api/colaborador/meus-atendimentos/${this.atendimento?.id}/fotos/${id}`; }
  avancar(etapa: 'diagnosticar' | 'solicitar-aprovacao' | 'iniciar' | 'concluir'): void {
    if (!this.atendimento || this.avancando) return;
    if (etapa === 'concluir' && (this.atendimento.quilometragemSaida == null || this.atendimento.quilometragemSaida < 0)) {
      this.erro = 'Informe a quilometragem de saída antes de concluir.'; return;
    }
    this.avancando = true; this.erro = ''; this.mensagem = '';
    const corpo = etapa === 'concluir' ? { quilometragemSaida: this.atendimento.quilometragemSaida } : {};
    this.http.patch<AtendimentoTecnico>(`/api/colaborador/meus-atendimentos/${this.atendimento.id}/${etapa}`, corpo,
      { withCredentials: true }).subscribe({
        next: atendimento => { this.atendimento = atendimento; this.avancando = false; this.mensagem = 'Etapa atualizada com sucesso.'; },
        error: erro => { this.avancando = false; this.erro = erro?.error?.mensagem || 'Não foi possível avançar a etapa. Confira os registros obrigatórios.'; }
      });
  }
  salvar(): void {
    if (!this.atendimento || this.salvando || this.encerrado) return;
    this.salvando = true; this.erro = ''; this.mensagem = '';
    const { diagnosticoTecnico, servicoExecutado, observacoesInternas, recomendacoesCliente, quilometragemEntrada } = this.atendimento;
    this.http.put<AtendimentoTecnico>(`/api/colaborador/meus-atendimentos/${this.atendimento.id}/relato`,
      { diagnosticoTecnico, servicoExecutado, observacoesInternas, recomendacoesCliente, quilometragemEntrada },
      { withCredentials: true }).subscribe({
        next: atendimento => { this.atendimento = atendimento; this.salvando = false; this.mensagem = 'Relato técnico salvo com sucesso.'; },
        error: () => { this.salvando = false; this.erro = 'Não foi possível salvar o relato. Confira os limites dos campos e tente novamente.'; }
      });
  }
}
