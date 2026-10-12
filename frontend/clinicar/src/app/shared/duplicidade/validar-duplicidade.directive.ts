import { AfterViewChecked, Directive, DoCheck, ElementRef, EventEmitter, Input, NgZone, OnDestroy, Output, Renderer2 } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Subscription } from 'rxjs';

export interface EstadoDuplicidade { duplicado: boolean; consultando: boolean; mensagem: string; id?: number | null; }
export interface ConfigDuplicidade { tipo: string; model: any; id?: number | null; campos: Record<string, string>; }
const chaves: Record<string, string[]> = {
  servico: ['nome', 'categoria'],
  peca: ['nome','fabricante','tipo','unidade','modelo','origemOleo','viscosidadeSae'],
  'fornecimento-peca': ['idFornecedor','idPeca'], 'fornecimento-servico': ['idFornecedor','idServico'],
  estoque: ['idPeca','idLocalEstoque'], local: ['nome'], regra: ['grupoManutencao','descricao']
};

@Directive({ selector: '[appValidarDuplicidade]', standalone: true })
export class ValidarDuplicidadeDirective implements DoCheck, AfterViewChecked, OnDestroy {
  @Input('appValidarDuplicidade') config!: ConfigDuplicidade;
  @Output() duplicidadeChange = new EventEmitter<{ model: any; estado: EstadoDuplicidade }>();
  private ativo = false;
  private assinatura = '';
  private geracao = 0;
  private timer?: ReturnType<typeof setTimeout>;
  private consulta?: Subscription;
  private estado: EstadoDuplicidade = { duplicado: false, consultando: false, mensagem: '' };
  private mensagens = new Map<HTMLElement, HTMLElement>();
  private remover: Array<() => void>;
  private observer: MutationObserver;
  private erroObservado = "";

  constructor(private el: ElementRef<HTMLElement>, private http: HttpClient, private renderer: Renderer2, private zone: NgZone) {
    this.observer = new MutationObserver(() => {
      if (!this.ativo || !this.config) return;
      const mensagem = el.nativeElement.querySelector('.alert-danger')?.textContent?.trim() || '';
      if (!mensagem) { this.erroObservado = ''; return; }
      if (!/já existe|já cadastrad/i.test(mensagem) || mensagem === this.erroObservado) return;
      this.erroObservado = mensagem;
      this.zone.run(() => { this.cancelar(); this.publicar({ duplicado: true, consultando: false, mensagem }); });
    });
    this.observer.observe(el.nativeElement, { childList: true, subtree: true, characterData: true });
    this.remover = [
      renderer.listen(el.nativeElement, 'show.bs.modal', () => this.zone.run(() => { this.ativo = true; this.assinatura = ''; this.erroObservado = '';  })),
      renderer.listen(el.nativeElement, 'hidden.bs.modal', () => this.zone.run(() => { this.ativo = false; this.cancelar(); this.limparVisual(); this.publicar({ duplicado: false, consultando: false, mensagem: '' }); })),
      renderer.listen(el.nativeElement, 'focusout', () => this.zone.run(() => { if (this.ativo && this.timer) this.consultar(); }))
    ];
  }
  ngDoCheck(): void {
    if (!this.ativo || !this.config) return;
    const valores = this.valores();
    const assinatura = JSON.stringify([this.config.tipo, this.config.id, valores]);
    if (assinatura === this.assinatura) return;
    this.assinatura = assinatura;
    this.cancelar();
    this.limparVisual();
    const obrigatorios = this.config.tipo === 'peca' ? chaves['peca'].slice(0,4) : chaves[this.config.tipo];
    if (!obrigatorios?.every(campo => valores[campo])) { this.publicar({ duplicado: false, consultando: false, mensagem: '' }); return; }
    this.publicar({ duplicado: false, consultando: true, mensagem: 'Verificando se este cadastro já existe...' });
    this.timer = setTimeout(() => this.consultar(), 350);
  }
  private valores(): Record<string,string> {
    const model = this.config.model;
    return Object.fromEntries((chaves[this.config.tipo] || []).map(campo => {
      const valor = campo === 'idFornecedor' ? model.idFornecedor ?? model.fornecedor?.id : campo === 'idPeca' ? model.idPeca ?? model.peca?.id : model[campo];
      return [campo, String(valor ?? '').replace(/\s+/g,' ').trim()];
    }));
  }
  private consultar(): void {
    clearTimeout(this.timer); this.timer = undefined;
    const geracao = this.geracao, model = this.config.model;
    let params = new HttpParams({ fromObject: this.valores() });
    if (this.config.id) params = params.set('idIgnorado',this.config.id);
    this.consulta = this.http.get<EstadoDuplicidade>(`/api/cadastros/duplicidade/${this.config.tipo}`, { params, withCredentials: true }).subscribe({
      next: resposta => { if (geracao === this.geracao) this.publicar({ ...resposta, consultando: false }, model); },
      error: () => { if (geracao === this.geracao) this.publicar({ duplicado: false, consultando: false, mensagem: 'Não foi possível verificar a duplicidade. Altere o campo para tentar novamente.' }, model); }
    });
  }
  private publicar(estado: EstadoDuplicidade, model = this.config?.model): void {
    if (!model) return;
    if (!estado.duplicado && !estado.consultando) this.limparVisual();
    this.estado = estado;
    const geracao = this.geracao;
    queueMicrotask(() => { if (geracao === this.geracao) this.zone.run(() => this.duplicidadeChange.emit({ model, estado })); });
  }
  ngAfterViewChecked(): void {
    if (!this.ativo || !this.config) return;
    for (const [nome, seletor] of Object.entries(this.config.campos)) {
      if (this.config.tipo === 'peca' && !chaves['peca'].includes(nome)) continue;
      const campo = this.el.nativeElement.querySelector<HTMLElement>(seletor);
      if (!campo) continue;
      if (!this.estado.mensagem) continue;
      if (this.estado.duplicado) {
        this.renderer.addClass(campo, campo.classList.contains('select-card') ? 'is-invalid-box' : 'is-invalid');
        this.renderer.setAttribute(campo,'aria-invalid','true');
      }
      let aviso = this.mensagens.get(campo);
      if (!aviso || !aviso.isConnected) {
        aviso = this.renderer.createElement('div');
        this.renderer.addClass(aviso, 'small'); this.renderer.addClass(aviso, 'mt-1');
        this.renderer.setAttribute(aviso,'role','status');
        const grupo = campo.closest('.input-group') ?? campo;
        this.renderer.insertBefore(grupo.parentElement, aviso, grupo.nextSibling);
        this.mensagens.set(campo,aviso!);
      }
      if (aviso?.textContent !== this.estado.mensagem) this.renderer.setProperty(aviso,'textContent',this.estado.mensagem);
      this.renderer.setAttribute(aviso,'class',`small mt-1 ${this.estado.consultando ? 'text-muted' : 'text-danger'}`);
    }
  }
  private limparVisual(): void {
    for (const [campo,aviso] of this.mensagens) {
      if (campo.getAttribute('data-obrigatorio-invalido') !== 'true') this.renderer.removeClass(campo,'is-invalid');
      this.renderer.removeClass(campo,'is-invalid-box');
      this.renderer.removeAttribute(campo,'aria-invalid'); aviso.remove();
    }
    this.mensagens.clear();
  }
  private cancelar(): void { ++this.geracao; clearTimeout(this.timer); this.timer = undefined; this.consulta?.unsubscribe(); }
  ngOnDestroy(): void { this.observer.disconnect(); this.cancelar(); this.limparVisual(); this.remover.forEach(remover => remover()); }
}
