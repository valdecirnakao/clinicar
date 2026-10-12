import { provideZoneChangeDetection } from '@angular/core';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { ConfiguracaoAlertasEstoqueComponent } from './configuracao-alertas-estoque.component';

describe('Configuração de alertas de estoque', () => {
  let fixture: ComponentFixture<ConfiguracaoAlertasEstoqueComponent>;
  let component: ConfiguracaoAlertasEstoqueComponent;
  let http: HttpTestingController;
  const usuario = { id: 2, nome: 'Responsável', telefone: '+55 (11) 99999-9999', status: 'ATIVO', tipo_do_acesso: 'COLABORADOR' };
  beforeEach(async () => {
    await TestBed.configureTestingModule({imports: [ConfiguracaoAlertasEstoqueComponent], providers: [provideZoneChangeDetection(), provideHttpClient(), provideHttpClientTesting()]}).compileComponents();
    fixture = TestBed.createComponent(ConfiguracaoAlertasEstoqueComponent); component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController); fixture.detectChanges();
    http.expectOne('/api/configuracao-alerta-estoque').flush({whatsappHabilitado: true,
      configuracao: {ativo: false, versao: 0, idResponsavel: null, telefoneAdministrador: '', reenviarAlertaAposHoras: 24}});
    http.expectOne('/api/usuario').flush([usuario, {...usuario, id: 3, status: 'INATIVO'}, {...usuario, id: 4, tipo_do_acesso: 'CLIENTE'}]);
    fixture.detectChanges();
  });
  afterEach(() => http.verify());
  it('formata o telefone bruto do administrador na edição sem alterar o valor cadastrado', () => {
    component.responsaveis.push({ ...usuario, id: 5, tipo_do_acesso: 'ADMINISTRADOR', telefone: '5511989142127' });
    component.config!.idResponsavel = 5; component.selecionarResponsavel(); fixture.detectChanges();
    const input: HTMLInputElement = fixture.nativeElement.querySelector('#estoqueTelefone');
    expect(input.value).toBe('+55 (11) 98914-2127'); expect(input.readOnly).toBeTrue();
    expect(component.config!.telefoneAdministrador).toBe('5511989142127');
    component.config!.idResponsavel = 2; component.selecionarResponsavel(); fixture.detectChanges();
    expect(input.value).toBe('+55 (11) 99999-9999');
  });
  it('mostra somente responsáveis ativos internos e exige telefone ao ativar', () => {
    expect(component.responsaveis.length).toBe(1);
    component.config!.ativo = true; expect(component.configuracaoValida).toBeFalse();
    component.config!.idResponsavel = 2; component.selecionarResponsavel();
    expect(component.config!.telefoneAdministrador).toBe(usuario.telefone); expect(component.configuracaoValida).toBeTrue();
    component.config!.telefoneAdministrador = ''; expect(component.configuracaoValida).toBeFalse();
  });
  it('não envia configuração incompleta nem intervalo inválido', () => {
    component.config!.ativo = true; component.salvar(); http.expectNone('/api/configuracao-alerta-estoque');
    component.config!.idResponsavel = 2; component.selecionarResponsavel(); component.config!.reenviarAlertaAposHoras = 0;
    component.salvar(); http.expectNone('/api/configuracao-alerta-estoque');
  });
  it('salva e libera o formulário para reenviar pendências', () => {
    component.config!.ativo = true; component.config!.idResponsavel = 2; component.selecionarResponsavel();
    component.formulario!.form.markAsDirty(); component.salvar();
    const request = http.expectOne('/api/configuracao-alerta-estoque'); expect(request.request.method).toBe('PUT');
    expect(Object.keys(request.request.body).sort()).toEqual(['ativo', 'idResponsavel', 'reenviarAlertaAposHoras', 'versao']);
    expect(fixture.nativeElement.querySelector('#estoqueTemplate')).toBeNull();
    expect(fixture.nativeElement.querySelector('#estoqueIdioma')).toBeNull();
    request.flush({...component.config, versao: 1}); expect(component.formulario!.dirty).toBeFalse();
    component.reenviarPendentes(); const reenvio = http.expectOne('/api/configuracao-alerta-estoque/reenviar-pendentes');
    expect(reenvio.request.method).toBe('POST'); reenvio.flush({estoquesVerificados: 2, enviosAceitos: 1, falhas: 1});
    expect(component.sucesso).toContain('1 envio(s) aceito(s)'); expect(component.erro).toContain('1 estoque(s) com falha');
  });
  it('bloqueia reenvio com integração desabilitada', () => {
    component.config!.ativo = true; component.whatsappHabilitado = false; component.reenviarPendentes();
    http.expectNone('/api/configuracao-alerta-estoque/reenviar-pendentes'); fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('integração WhatsApp está desativada');
  });
});
