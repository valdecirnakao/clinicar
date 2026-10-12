import { provideZoneChangeDetection } from '@angular/core';
import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpClient, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AlertasClientesComponent } from './alertas-clientes.component';
import { AlertasColaboradoresComponent } from './alertas-colaboradores.component';
import { ConfiguracaoAlertasComponent } from './configuracao-alertas.component';
import { ConfiguracaoAlertasEstoqueComponent } from './configuracao-alertas-estoque.component';

describe('Tabelas de configurações de alertas',()=>{
  let http:HttpTestingController; let cliente:AlertasClientesComponent;
  beforeEach(()=>{TestBed.configureTestingModule({providers:[provideZoneChangeDetection(), provideHttpClient(),provideHttpClientTesting()]});http=TestBed.inject(HttpTestingController);cliente=new AlertasClientesComponent(TestBed.inject(HttpClient));});
  afterEach(()=>{cliente.ngOnDestroy();http.verify();});
  const resposta=(number=0)=>({content:[{usuarioId:2,nome:'Cliente',email:'cliente@example.test',configurada:false,configuracao:{ativo:false}}],totalElements:12,totalPages:2,number});
  it('consulta somente a página escolhida e limita a navegação',()=>{
    cliente.ngOnInit();http.expectOne(r=>r.url.endsWith('/clientes')&&r.params.get('pagina')==='0').flush(resposta());
    expect(cliente.primeiro).toBe(1);expect(cliente.ultimo).toBe(10);expect(cliente.numerosPaginas).toEqual([0,1]);
    cliente.mudarPagina(1);http.expectOne(r=>r.params.get('pagina')==='1').flush(resposta(1));
    expect(cliente.primeiro).toBe(11);expect(cliente.ultimo).toBe(12);cliente.mudarPagina(2);http.expectNone(r=>r.url.endsWith('/clientes'));
    cliente.tamanho=5;cliente.alterarTamanho();http.expectOne(r=>r.params.get('pagina')==='0'&&r.params.get('tamanho')==='5').flush({...resposta(),totalPages:3});
  });
  it('pesquisa após uma pausa e cancela consultas antigas',fakeAsync(()=>{
    cliente.ngOnInit();const antiga=http.expectOne(r=>r.url.endsWith('/clientes'));
    cliente.busca='Cliente novo';cliente.filtrar();tick(300);
    expect(antiga.cancelled).toBeTrue();http.expectOne(r=>r.params.get('busca')==='Cliente novo').flush({...resposta(),content:[],totalElements:0,totalPages:0});
    expect(cliente.clientes).toEqual([]);expect(cliente.primeiro).toBe(0);
  }));
  it('detalhes de manutenção e estoque não permitem salvar nem reenviar',()=>{
    const manutencao=new ConfiguracaoAlertasComponent(TestBed.inject(HttpClient));manutencao.usuarioId=2;
    manutencao.config={id:2,versao:0,ativo:true,antecedenciaDias:15,intervaloDias:7,maximoEnvios:3,diasAposVencimento:30,horaInicio:9,horaFim:18,fusoHorario:'America/Sao_Paulo'};
    manutencao.modoLeitura=true;manutencao.salvar();
    const estoque=new ConfiguracaoAlertasEstoqueComponent(TestBed.inject(HttpClient));
    estoque.config={versao:0,ativo:true,idResponsavel:3,telefoneAdministrador:'5511999999999',reenviarAlertaAposHoras:24};
    estoque.responsaveis=[{id:3,nome:'Responsável',telefone:'5511999999999',status:'ATIVO',tipo_do_acesso:'COLABORADOR'}];estoque.whatsappHabilitado=true;
    expect(estoque.configuracaoValida).toBeTrue();estoque.modoLeitura=true;estoque.salvar();estoque.reenviarPendentes();
    http.expectNone(r=>r.method==='PUT'||r.method==='POST');
  });
  it('mantém uma única configuração de estoque e bloqueia reenvio desativado',()=>{
    const colaboradores=new AlertasColaboradoresComponent(TestBed.inject(HttpClient));colaboradores.ngOnInit();
    http.expectOne('/api/configuracao-alerta-estoque').flush({whatsappHabilitado:true,configuracao:{ativo:false,idResponsavel:3,nomeResponsavel:'Responsável',reenviarAlertaAposHoras:24}});
    expect(colaboradores.consulta!.configuracao.idResponsavel).toBe(3);colaboradores.reenviar();http.expectNone('/api/configuracao-alerta-estoque/reenviar-pendentes');colaboradores.ngOnDestroy();
  });
});
