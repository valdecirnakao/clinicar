import { provideZoneChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, flushMicrotasks } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { UsuarioComponent } from './usuario.component';
import { VeiculoComponent } from '../veiculo/veiculo.component';
import { Usuario } from './usuario.service';

const usuario = { id: 77, nome: 'Pessoa de teste', email: 'pessoa@example.com', cpf: '22222222222', telefone: '11999999999', tipo_do_acesso: 'cliente', status: 'ativo' } as Usuario;
const veiculo = { id: 23, placa: 'ABC1234', fabricante: 'Toyota', modelo: 'Corolla', cor: 'Preto', anoModeloCombustivel: '2026 Flex', idProprietario: 77 };

describe('Continuação do usuário com veículo e alertas', () => {
  let fixture: ComponentFixture<UsuarioComponent>, component: UsuarioComponent, http: HttpTestingController;
  let bootstrapAnterior: unknown;
  beforeEach(async () => {
    bootstrapAnterior = (window as any).bootstrap;
    (window as any).bootstrap = { Modal: { getOrCreateInstance: (el: HTMLElement) => ({
      show: () => { el.classList.add('show'); el.dispatchEvent(new Event('shown.bs.modal')); },
      hide: () => { el.classList.remove('show'); el.dispatchEvent(new Event('hidden.bs.modal')); }, dispose: () => {}
    }) } };
    await TestBed.configureTestingModule({ imports: [UsuarioComponent], providers: [provideZoneChangeDetection(), provideHttpClient(), provideHttpClientTesting(), provideRouter([])] }).compileComponents();
    fixture = TestBed.createComponent(UsuarioComponent); component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges(); http.expectOne(r=>r.url==='/api/usuario/pagina').flush({content:[],totalElements:0,totalPages:1,number:0,resumo:{},opcoes:{}});
  });
  afterEach(() => { fixture.destroy(); http.verify(); (window as any).bootstrap = bootstrapAnterior; });

  it('continua somente após salvar e usa o identificador retornado pelo banco, sem enviar duas vezes', () => {
    spyOn<any>(component, 'validarCadastroUsuario').and.returnValue(null);
    component.novoUsuario = { ...usuario, id: undefined }; component.modalCadastro = { hide: () => {} };
    component.salvarNovoUsuario(); component.salvarNovoUsuario();
    const req = http.expectOne(r => r.url === '/api/usuario' && r.method === 'POST');
    expect(component.usuarioContinuacao).toBeNull();
    req.flush({ ...usuario, tipo_do_acesso: undefined, tipoDoAcesso: 'CLIENTE' });
    http.expectOne(r=>r.url==='/api/usuario/pagina').flush({content:[usuario],totalElements:[usuario].length,totalPages:1,number:0,resumo:{},opcoes:{}});
    expect(component.usuarioContinuacao?.id).toBe(77);
    expect(component.usuarioContinuacao?.tipo_do_acesso).toBe('cliente');
    expect(component.usuarioContinuacao?.senha).toBe('');
  });

  it('mantém o cadastro aberto e não continua quando o banco recusa o usuário', () => {
    spyOn<any>(component, 'validarCadastroUsuario').and.returnValue(null);
    component.novoUsuario = { ...usuario, id: undefined };
    component.salvarNovoUsuario();
    http.expectOne(r => r.method === 'POST').flush({ mensagem: 'CPF já cadastrado anteriormente.' }, { status: 409, statusText: 'Conflict' });
    expect(component.usuarioContinuacao).toBeNull(); expect(component.cadastrandoVeiculo).toBeFalse();
    expect(component.salvandoNovoUsuario).toBeFalse();
  });

  for (const perfil of ['cliente', 'administrador', 'colaborador']) {
  it(`abre e salva os alertas do ${perfil} identificado após o veículo ser salvo`, fakeAsync(() => {
    component.usuarioContinuacao = { ...usuario, tipo_do_acesso: perfil }; component.veiculoDoUsuarioCriado(veiculo);
    http.expectOne(r=>r.url==='/api/usuario/pagina').flush({content:[usuario],totalElements:[usuario].length,totalPages:1,number:0,resumo:{},opcoes:{}});
    flushMicrotasks(); fixture.detectChanges();
    const req = http.expectOne(r => r.url === '/api/configuracao-alerta-manutencao');
    expect(req.request.params.get('usuarioId')).toBe('77');
    const config = { id: 77, ativo: false, versao: null, antecedenciaDias: 15, intervaloDias: 7, maximoEnvios: 3, diasAposVencimento: 30, horaInicio: 9, horaFim: 18, fusoHorario: 'America/Sao_Paulo' };
    req.flush(config);
    http.expectOne(r => r.url.endsWith('/configuracao-alerta-manutencao/historico')).flush([]);
    expect(component.configurandoAlertas).toBeTrue();
    component.alertasDoNovoUsuario!.salvar();
    const salvamento = http.expectOne(r => r.url === '/api/configuracao-alerta-manutencao' && r.method === 'PUT');
    expect(salvamento.request.params.get('usuarioId')).toBe('77');
    expect(component.configurandoAlertas).toBeTrue();
    salvamento.flush({ ...config, versao: 0 }); flushMicrotasks();
    expect(component.configurandoAlertas).toBeFalse(); expect(component.usuarioContinuacao).toBeNull();
  }));

  }
  it('cancelar o veículo volta à escolha preservando o usuário já salvo', () => {
    component.usuarioContinuacao = usuario; component.cadastrandoVeiculo = true;
    component.abrirContinuacaoUsuario();
    expect(component.cadastrandoVeiculo).toBeFalse(); expect(component.usuarioContinuacao?.id).toBe(77);
    http.expectNone(r => r.method === 'DELETE' || r.method === 'POST');
  });
});

describe('Veículo integrado ao novo usuário', () => {
  let fixture: ComponentFixture<VeiculoComponent>, component: VeiculoComponent, http: HttpTestingController;
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [VeiculoComponent], providers: [provideZoneChangeDetection(), provideHttpClient(), provideHttpClientTesting(), provideRouter([])] }).compileComponents();
    fixture = TestBed.createComponent(VeiculoComponent); component = fixture.componentInstance; http = TestBed.inject(HttpTestingController);
    component.cadastroIntegrado = true; component.proprietarioIntegrado = usuario;
    // Abertura é exercitada pelo fluxo; aqui verificamos persistência e proteção do vínculo.
    spyOn(component, 'abrirModalCadastroVeiculo').and.returnValue(Promise.resolve()); fixture.detectChanges();
    (component as any).usuariosById.set(77, usuario);
    component.novoVeiculo = { ...veiculo, id: undefined, idProprietario: 999 };
    component.consultaPlaca.cadastro.verificada = true;
    component.modalCadastroVeiculo = { hide: () => {} };
  });
  afterEach(() => { fixture.destroy(); http.verify(); });
  it('preenche o proprietário ao abrir e desabilita sua troca no formulário reutilizado', () => {
    const anterior = (window as any).bootstrap;
    (window as any).bootstrap = { Modal: { getOrCreateInstance: () => ({ show: () => {}, hide: () => {}, dispose: () => {} }) } };
    try {
      component.marcas = [{ code: '1', name: 'Toyota' }];
      (component.abrirModalCadastroVeiculo as jasmine.Spy).and.callThrough();
      void component.abrirModalCadastroVeiculo();
      component.abaCadastroVeiculo = 'proprietario'; fixture.detectChanges();
      expect(component.novoVeiculo.idProprietario).toBe(77);
      expect(component.nomeProprietarioSelecionadoCadastro()).toBe(usuario.nome);
      const input: HTMLInputElement = fixture.nativeElement.querySelector('input[placeholder="Selecione um proprietário"]');
      expect(input.disabled).toBeTrue();
      component.modoProprietarioModal = 'cadastro';
      component.selecionarProprietarioModal({ ...usuario, id: 999 });
      expect(component.novoVeiculo.idProprietario).toBe(77);
    } finally { (window as any).bootstrap = anterior; }
  });
  it('salva uma única vez com o proprietário correto e só emite após a confirmação', () => {
    const emitido = spyOn(component.registroCriado, 'emit');
    component.salvarCadastroVeiculo(); component.salvarCadastroVeiculo();
    const req = http.expectOne(r => r.url === '/api/veiculo' && r.method === 'POST');
    expect(req.request.body.idProprietario).toBe(77); expect(emitido).not.toHaveBeenCalled();
    req.flush(veiculo); expect(emitido).toHaveBeenCalledWith(jasmine.objectContaining({ id: 23, idProprietario: 77 }));
    http.expectNone('/api/usuario'); http.expectNone(r => r.url === '/api/veiculo' && r.method === 'GET');
  });
  it('não avança nem perde os dados quando o veículo é recusado por placa duplicada', () => {
    const emitido = spyOn(component.registroCriado, 'emit');
    component.salvarCadastroVeiculo();
    http.expectOne(r => r.method === 'POST').flush({ mensagem: 'Placa já cadastrada anteriormente.' }, { status: 409, statusText: 'Conflict' });
    expect(emitido).not.toHaveBeenCalled(); expect(component.consultaPlaca.cadastro.duplicada).toBeTrue();
    expect(component.novoVeiculo.idProprietario).toBe(77); expect(component.salvandoCadastro).toBeFalse();
  });
});
