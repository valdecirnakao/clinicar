import { provideZoneChangeDetection } from '@angular/core';
import { TestBed, ComponentFixture, fakeAsync, tick } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { ConfiguracaoAlertasEstoqueComponent } from './configuracao-alertas-estoque.component';
import { By } from '@angular/platform-browser';
import { SeletorRemotoComponent } from '../../../shared/tabelas/seletor-remoto.component';

describe('Configuração de alertas de estoque', () => {
  let fixture: ComponentFixture<ConfiguracaoAlertasEstoqueComponent>;
  let component: ConfiguracaoAlertasEstoqueComponent;
  let http: HttpTestingController;
  const usuario = { id: 2, nome: 'Responsável', telefone: '+55 (11) 99999-9999', status: 'ATIVO', tipo_do_acesso: 'COLABORADOR' };
  const administrador = { id: 3, nome: 'Admin', telefone: '+55 (11) 98888-8888', status: 'ATIVO', tipo_do_acesso: 'ADMINISTRADOR' };
  beforeEach(async () => {
    await TestBed.configureTestingModule({imports: [ConfiguracaoAlertasEstoqueComponent], providers: [provideZoneChangeDetection(), provideHttpClient(), provideHttpClientTesting()]}).compileComponents();
    fixture = TestBed.createComponent(ConfiguracaoAlertasEstoqueComponent); component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController); fixture.detectChanges();
    http.expectOne('/api/configuracao-alerta-estoque').flush({whatsappHabilitado: true,
      configuracao: {ativo: false, versao: 0, idResponsavel: null, telefoneAdministrador: '', idAdministradorCritico: null, telefoneAdministradorCritico: '', reenviarAlertaAposHoras: 24}});
    http.expectNone('/api/usuario');
    component.registrarResponsavel(usuario); component.registrarAdministrador(administrador);
    fixture.detectChanges();
  });
  afterEach(() => {fixture.destroy();http.verify({ignoreCancelled:true});});
  it('formata os telefones dos responsáveis sem alterar os valores cadastrados', () => {
    component.administradores.push({ ...administrador, id: 5, telefone: '5511987654321' });
    component.config!.idAdministradorCritico = 5; component.selecionarAdministrador(); fixture.detectChanges();
    const admin: HTMLInputElement = fixture.nativeElement.querySelector('#estoqueTelefoneAdminCritico');
    expect(admin.value).toBe('+55 (11) 98765-4321'); expect(admin.readOnly).toBeTrue();
    expect(component.config!.telefoneAdministradorCritico).toBe('5511987654321');
    component.config!.idAdministradorCritico = 3; component.selecionarAdministrador(); fixture.detectChanges();
    expect(admin.value).toBe('+55 (11) 98888-8888');
    component.responsaveis.push({ ...usuario, id: 5, telefone: '5511987654321' });
    component.config!.idResponsavel = 5; component.selecionarResponsavel(); fixture.detectChanges();
    const input: HTMLInputElement = fixture.nativeElement.querySelector('#estoqueTelefone');
    expect(input.value).toBe('+55 (11) 98765-4321'); expect(input.readOnly).toBeTrue();
    expect(component.config!.telefoneAdministrador).toBe('5511987654321');
    component.config!.idResponsavel = 2; component.selecionarResponsavel(); fixture.detectChanges();
    expect(input.value).toBe('+55 (11) 99999-9999');
  });
  it('recupera os nomes dos dois destinatários ao reabrir a configuração salva', fakeAsync(() => {
    component.carregar();
    http.expectOne('/api/configuracao-alerta-estoque').flush({whatsappHabilitado: true,
      configuracao: {ativo: true, versao: 1, idResponsavel: 2, nomeResponsavel: usuario.nome,
        telefoneAdministrador: usuario.telefone, idAdministradorCritico: 3,
        nomeAdministradorCritico: administrador.nome, telefoneAdministradorCritico: administrador.telefone,
        reenviarAlertaAposHoras: 24}});
    fixture.detectChanges();
    tick();
    http.expectOne('/api/usuario/2').flush(usuario);
    http.expectOne('/api/usuario/3').flush(administrador);
    fixture.detectChanges();
    const colaborador: HTMLInputElement = fixture.nativeElement.querySelector('#estoqueResponsavel');
    const admin: HTMLInputElement = fixture.nativeElement.querySelector('#estoqueAdminCritico');
    expect(colaborador.value).toContain(usuario.nome);
    expect(admin.value).toContain(administrador.nome);
    expect(component.configuracaoValida).toBeTrue();
  }));
  it('mostra somente responsáveis ativos internos e exige telefone ao ativar', () => {
    expect(component.responsaveis.length).toBe(1); expect(component.administradores.length).toBe(1);
    component.config!.ativo = true; expect(component.configuracaoValida).toBeFalse();
    component.config!.idResponsavel = 2; component.selecionarResponsavel();
    component.config!.idAdministradorCritico = 3; component.selecionarAdministrador();
    expect(component.config!.telefoneAdministrador).toBe(usuario.telefone); expect(component.configuracaoValida).toBeTrue();
    component.config!.telefoneAdministrador = ''; expect(component.configuracaoValida).toBeFalse();
  });
  it('não envia configuração incompleta nem intervalo inválido', () => {
    component.config!.ativo = true; component.salvar(); http.expectNone('/api/configuracao-alerta-estoque');
    component.config!.idResponsavel = 2; component.selecionarResponsavel(); component.config!.idAdministradorCritico = 3; component.selecionarAdministrador(); component.config!.reenviarAlertaAposHoras = 0;
    component.salvar(); http.expectNone('/api/configuracao-alerta-estoque');
  });
  it('salva e libera o formulário para reenviar pendências', () => {
    component.config!.ativo = true; component.config!.idResponsavel = 2; component.selecionarResponsavel(); component.config!.idAdministradorCritico = 3; component.selecionarAdministrador();
    component.formulario!.form.markAsDirty(); component.salvar();
    const request = http.expectOne('/api/configuracao-alerta-estoque'); expect(request.request.method).toBe('PUT');
    expect(Object.keys(request.request.body).sort()).toEqual(['ativo', 'idAdministradorCritico', 'idResponsavel', 'reenviarAlertaAposHoras', 'versao']);
    expect(fixture.nativeElement.querySelector('#estoqueTemplate')).toBeNull();
    expect(fixture.nativeElement.querySelector('#estoqueIdioma')).toBeNull();
    request.flush({...component.config, versao: 1}); expect(component.formulario!.dirty).toBeFalse();
    component.reenviarPendentes(); const reenvio = http.expectOne('/api/configuracao-alerta-estoque/reenviar-pendentes');
    expect(reenvio.request.method).toBe('POST'); reenvio.flush({estoquesVerificados: 2, enviosAceitos: 1, falhas: 1});
    expect(component.sucesso).toContain('1 envio(s) aceito(s)'); expect(component.erro).toContain('1 estoque(s) com falha');
  });
  it('envia os dois destinatários escolhidos na interface mesmo com o WhatsApp desativado', () => {
    const seletores = fixture.debugElement.queryAll(By.directive(SeletorRemotoComponent));
    (seletores[0].componentInstance as SeletorRemotoComponent).escolher(usuario);
    (seletores[1].componentInstance as SeletorRemotoComponent).escolher(administrador);
    fixture.detectChanges();
    expect(component.config!.idResponsavel).toBe(2);
    expect(component.config!.idAdministradorCritico).toBe(3);
    component.salvar();
    const request = http.expectOne('/api/configuracao-alerta-estoque');
    expect(request.request.body.idResponsavel).toBe(2);
    expect(request.request.body.idAdministradorCritico).toBe(3);
    request.flush({...component.config, versao: 1});
  });
  it('aceita somente o perfil correto ao selecionar no modal e preserva os dois destinatários', () => {
    component.definirDestinatario('COLABORADOR', administrador);
    expect(component.config!.idResponsavel).toBeNull();
    component.definirDestinatario('COLABORADOR', usuario);
    component.definirDestinatario('ADMINISTRADOR', administrador);
    fixture.detectChanges();
    expect(component.config!.idResponsavel).toBe(usuario.id);
    expect(component.config!.idAdministradorCritico).toBe(administrador.id);
    expect(component.config!.telefoneAdministrador).toBe(usuario.telefone);
    expect(component.config!.telefoneAdministradorCritico).toBe(administrador.telefone);
    expect(component.formulario!.dirty).toBeTrue();
  });
  it('bloqueia reenvio com integração desabilitada', () => {
    component.config!.ativo = true; component.whatsappHabilitado = false; component.reenviarPendentes();
    http.expectNone('/api/configuracao-alerta-estoque/reenviar-pendentes'); fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('integração WhatsApp está desativada');
  });
});
