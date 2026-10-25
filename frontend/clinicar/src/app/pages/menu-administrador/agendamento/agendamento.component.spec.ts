import { provideZoneChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AgendamentoComponent } from './agendamento.component';

describe('AgendamentoComponent', () => {
  let component: AgendamentoComponent;
  let fixture: ComponentFixture<AgendamentoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideZoneChangeDetection(), provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
      imports: [AgendamentoComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AgendamentoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
  it('carrega peças persistidas na edição mesmo sem catálogo local', () => {
    spyOn(document, 'getElementById').and.returnValue(null);
    component.abrirModalEdicao({
      id: 4, idServico: 2, valorEstimado: 115,
      observacoes: 'Teste\n[PEÇAS PREVISTAS NO AGENDAMENTO]\n- Filtro | Qtd: 1 Unidade | Unitário: R$ 35,00 | Total: R$ 35,00\n[/PEÇAS PREVISTAS NO AGENDAMENTO]'
    });
    const http = TestBed.inject(HttpTestingController);
    http.expectOne('/api/agendamento/4/pecas-previstas').flush([{
      id: 9, idPeca: 2, idEstoquePeca: 1, nomePeca: 'Filtro',
      descricaoPeca: 'Filtro', quantidade: 1, unidadeMedida: 'Unidade',
      valorUnitario: 35, valorTotal: 35
    }]);
    expect(component.pecasNovoAgendamento[0].idPeca).toBe(2);
    expect(component.valorServicoSelecionado()).toBe(80);
    expect(String(component.novoAgendamento.valorEstimado)).toContain('115,00');
  });
  it('mantém dados históricos ao abrir a edição e selecionar o mesmo veículo', () => {
    spyOn(document, 'getElementById').and.returnValue(null);
    component.veiculos = [{ id: 7, placa: 'XYZ9999', fabricante: 'Toyota', modelo: 'Yaris', cor: 'Branco', anoModeloCombustivel: '2025/2026 Flex' }];
    component.abrirModalEdicao({ id: 4, idVeiculo: 7, placaVeiculo: 'ABC1234', fabricanteVeiculo: 'Toyota', modeloVeiculo: 'Corolla', corVeiculo: 'Preto', anoModeloCombustivelVeiculo: '2020/2021 Flex' });
    component.selecionarVeiculo();
    expect(component.novoAgendamento.placaVeiculo).toBe('ABC1234');
    expect(component.novoAgendamento.modeloVeiculo).toBe('Corolla');
    expect(component.novoAgendamento.corVeiculo).toBe('Preto');
    expect(component.novoAgendamento.anoModeloCombustivelVeiculo).toBe('2020/2021 Flex');
    expect(component.labelVeiculo(component.veiculos[0])).toContain('Corolla');
  });
  it('mostra o responsável gravado ao editar sem buscar o usuário por ID', async () => {
    spyOn(document, 'getElementById').and.returnValue(null);
    component.abrirModalEdicao({
      id:4, idResponsavel:10, nomeResponsavel:'Caio Teste Mecânico', tipoExecucao:'INTERNA',
      dataHoraInicio:'2026-10-22T10:00:00', dataHoraFim:'2026-10-22T11:00:00'
    });
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const http = TestBed.inject(HttpTestingController);
    expect(component.novoAgendamento.idResponsavel).toBe(10);
    expect((fixture.nativeElement.querySelector('#agendamento-novoAgendamento-idResponsavel') as HTMLInputElement).value).toBe('Caio Teste Mecânico');
    http.expectNone('/api/usuario/10');
    http.expectOne(request => request.url === '/api/agendamento/disponibilidade').flush([]);
    fixture.detectChanges();
    expect(component.responsavelDisponivelInvalido()).toBeFalse();
    expect(fixture.nativeElement.textContent).not.toContain('O responsável selecionado não está disponível neste período.');
  });

  it('bloqueia o responsável salvo quando a consulta aponta outro compromisso confirmado', async () => {
    spyOn(document, 'getElementById').and.returnValue(null);
    component.abrirModalEdicao({
      id:4, idResponsavel:10, nomeResponsavel:'Caio Teste Mecânico', tipoExecucao:'INTERNA',
      dataHoraInicio:'2026-10-22T10:00:00', dataHoraFim:'2026-10-22T11:00:00'
    });
    fixture.detectChanges();
    await fixture.whenStable();
    TestBed.inject(HttpTestingController)
      .expectOne(request => request.url === '/api/agendamento/disponibilidade').flush([10]);
    fixture.detectChanges();
    expect(component.novoAgendamento.idResponsavel).toBeUndefined();
    expect(component.responsavelDisponivelInvalido()).toBeTrue();
  });

  it('usa outro veículo escolhido e restaura o histórico ao voltar ao original', () => {
    spyOn(document, 'getElementById').and.returnValue(null);
    component.veiculos = [{ id: 7, placa: 'XYZ9999', modelo: 'Yaris' }, { id: 8, placa: 'DEF5678', modelo: 'Civic' }];
    component.abrirModalEdicao({ id: 4, idVeiculo: 7, placaVeiculo: 'ABC1234', modeloVeiculo: 'Corolla' });
    component.novoAgendamento.idVeiculo = 8;
    component.selecionarVeiculo();
    expect(component.novoAgendamento.placaVeiculo).toBe('DEF5678');
    component.novoAgendamento.idVeiculo = 7;
    component.selecionarVeiculo();
    expect(component.novoAgendamento.placaVeiculo).toBe('ABC1234');
  });

  it('novo agendamento usa os dados atuais sem reutilizar o histórico da edição', () => {
    spyOn(document, 'getElementById').and.returnValue(null);
    component.veiculos = [{ id: 7, placa: 'XYZ9999', modelo: 'Yaris' }];
    component.abrirModalEdicao({ id: 4, idVeiculo: 7, placaVeiculo: 'ABC1234', modeloVeiculo: 'Corolla' });
    component.abrirModalCadastro();
    component.novoAgendamento.idVeiculo = 7;
    component.selecionarVeiculo();
    expect(component.novoAgendamento.placaVeiculo).toBe('XYZ9999');
    expect(component.novoAgendamento.modeloVeiculo).toBe('Yaris');
  });

  it('seleciona o cliente pesquisado e conserva os demais dados do agendamento', () => {
    spyOn(component, 'fecharSelecaoCliente');
    component.novoAgendamento = {idVeiculo: 7, placaVeiculo: 'ABC1234', prioridade: 'ALTA'};
    component.escolherCliente({id: 12, nome: 'Cliente Teste', cpf: '12345678901', tipo_do_acesso: 'CLIENTE'});
    expect(component.novoAgendamento.idCliente).toBe(12);
    expect(component.novoAgendamento.nomeCliente).toBe('Cliente Teste');
    expect(component.novoAgendamento.idVeiculo).toBeUndefined();
    expect(component.novoAgendamento.prioridade).toBe('ALTA');
    fixture.detectChanges();
    expect((fixture.nativeElement.querySelector('#agendamento-novoAgendamento-idCliente') as HTMLInputElement).value).toBe('Cliente Teste');
    expect(component.fecharSelecaoCliente).toHaveBeenCalled();
  });

  it('associa somente um veículo do cliente selecionado na pesquisa da frota', () => {
    spyOn(component, 'fecharSelecaoVeiculo');
    component.novoAgendamento = {idCliente: 12, prioridade: 'ALTA'};
    component.escolherVeiculo({id: 8, idProprietario: 13, placa: 'OUT1234'});
    expect(component.novoAgendamento.idVeiculo).toBeUndefined();
    component.escolherVeiculo({id: 9, idProprietario: 12, placa: 'ABC1234', modelo: 'Frota'});
    expect(component.novoAgendamento.idVeiculo).toBe(9);
    expect(component.novoAgendamento.placaVeiculo).toBe('ABC1234');
    expect(component.novoAgendamento.modeloVeiculo).toBe('Frota');
    expect(component.novoAgendamento.prioridade).toBe('ALTA');
    fixture.detectChanges();
    expect((fixture.nativeElement.querySelector('#agendamento-novoAgendamento-idVeiculo') as HTMLInputElement).value).toBe('ABC-1234 · Frota');
    TestBed.inject(HttpTestingController).expectNone('/api/veiculo/9');
    expect(component.fecharSelecaoVeiculo).toHaveBeenCalledTimes(1);
  });

  it('seleciona o serviço no modal e atualiza duração e descrição do agendamento', () => {
    spyOn(component, 'fecharSelecaoServico');
    component.novoAgendamento = {prioridade: 'ALTA'};
    component.escolherServico({id: 4, nome: 'Troca de filtro', categoria: 'Motor', duracaoEstimada: 90});
    expect(component.novoAgendamento.idServico).toBe(4);
    expect(component.novoAgendamento.nomeServico).toBe('Troca de filtro');
    expect(component.novoAgendamento.prioridade).toBe('ALTA');
    fixture.detectChanges();
    expect((fixture.nativeElement.querySelector('#agendamento-novoAgendamento-idServico') as HTMLInputElement).value).toContain('Troca de filtro');
    expect(component.fecharSelecaoServico).toHaveBeenCalledTimes(1);
  });

  it('aceita somente responsável disponível no período informado', () => {
    spyOn(component, 'fecharSelecaoResponsavel');
    component.novoAgendamento = {dataHoraInicio:'2026-10-22T10:00',dataHoraFim:'2026-10-22T11:00'};
    (component as any).periodoConsultado = '2026-10-22T10:00|2026-10-22T11:00';
    (component as any).ocupadosServidor = new Set([8]);
    component.escolherResponsavel({id:8,nome:'Ocupado',tipo_do_acesso:'COLABORADOR'});
    expect(component.novoAgendamento.idResponsavel).toBeUndefined();
    component.escolherResponsavel({id:9,nome:'Disponível',tipo_do_acesso:'CLIENTE'});
    expect(component.novoAgendamento.idResponsavel).toBeUndefined();
    component.escolherResponsavel({id:10,nome:'Mecânico',cpf:'16180339805',tipo_do_acesso:'COLABORADOR'});
    expect(component.novoAgendamento.idResponsavel).toBe(10);
    expect(component.novoAgendamento.nomeResponsavel).toBe('Mecânico');
    fixture.detectChanges();
    expect((fixture.nativeElement.querySelector('#agendamento-novoAgendamento-idResponsavel') as HTMLInputElement).value).toBe('Mecânico');
    expect(component.fecharSelecaoResponsavel).toHaveBeenCalledTimes(1);
  });

  it('não anuncia indisponibilidade com catálogo local vazio quando a busca é paginada', () => {
    component.novoAgendamento = {tipoExecucao:'INTERNA',dataHoraInicio:'2026-10-22T10:00',dataHoraFim:'2026-10-22T11:00'};
    expect(component.responsaveis).toEqual([]);
    expect(component.modoPaginado).toBeTrue();
    expect(component.mensagemResponsavelInvalido()).toBe('Selecione um responsável disponível.');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).not.toContain('Nenhum responsável disponível para o período informado.');
  });

  it('mantém o administrador elegível quando disponível, conforme a regra atual', () => {
    spyOn(component, 'fecharSelecaoResponsavel');
    component.novoAgendamento = {tipoExecucao:'INTERNA',dataHoraInicio:'2026-10-22T10:00',dataHoraFim:'2026-10-22T11:00'};
    (component as any).periodoConsultado = '2026-10-22T10:00|2026-10-22T11:00';
    component.escolherResponsavel({id:7,nome:'Administrador',tipo_do_acesso:'ADMINISTRADOR'});
    expect(component.novoAgendamento.idResponsavel).toBe(7);
  });

  it('seleciona no modal somente fornecedores ativos de serviços e exibe o nome sem documento', () => {
    spyOn(component, 'fecharSelecaoFornecedor');
    component.novoAgendamento = {tipoExecucao:'EXTERNA'};
    component.escolherFornecedor({id:4,razaoSocial:'Distribuidora de peças',itemFornecido:'Peças automotivas',ativo:true});
    component.escolherFornecedor({id:5,razaoSocial:'Parceiro inativo',itemFornecido:'Serviços automotivos',ativo:false});
    expect(component.novoAgendamento.idFornecedor).toBeUndefined();
    component.escolherFornecedor({id:6,razaoSocial:'Oficina Parceira',itemFornecido:'Peças e serviços',ativo:true,cnpj:'98765432000198'});
    expect(component.novoAgendamento.idFornecedor).toBe(6);
    expect(component.novoAgendamento.razaoSocialFornecedor).toBe('Oficina Parceira');
    fixture.detectChanges();
    expect((fixture.nativeElement.querySelector('#agendamento-novoAgendamento-idFornecedor') as HTMLInputElement).value).toBe('Oficina Parceira');
    expect(component.fecharSelecaoFornecedor).toHaveBeenCalledTimes(1);
  });

  it('avança pelas guias em ordem somente quando os dados obrigatórios permitem', () => {
    expect(component.abaNovoAgendamento).toBe('agendamento');
    component.avancarAbaNovoAgendamento();
    expect(component.abaNovoAgendamento).toBe('agendamento');
    spyOnProperty(component, 'agendamentoProntoParaSalvar', 'get').and.returnValue(true);
    component.avancarAbaNovoAgendamento();
    expect(component.abaNovoAgendamento).toBe('pecas');
    component.avancarAbaNovoAgendamento();
    expect(component.abaNovoAgendamento).toBe('adicionais');
    component.avancarAbaNovoAgendamento();
    expect(component.abaNovoAgendamento).toBe('revisao');
  });

  it('associa a peça escolhida no modal e carrega seus dados no formulário', () => {
    spyOn(component, 'fecharSelecaoPeca');
    component.escolherPeca({id:11,nome:'Filtro de óleo',descricao:'Filtro para motor',fabricante:'Marca teste',modelo:'Linha 2020'});
    const http = TestBed.inject(HttpTestingController);
    http.expectOne(requisicao => requisicao.url === '/api/fornecimento-pecas/pagina' && requisicao.params.get('ativo') === 'true')
      .flush({content:[],totalElements:0,totalPages:0,number:0,resumo:{},opcoes:{}});
    http.expectOne(requisicao => requisicao.url === '/api/fornecimento-pecas/pagina' && requisicao.params.get('ativo') === 'false')
      .flush({content:[],totalElements:0,totalPages:0,number:0,resumo:{},opcoes:{}});
    expect(component.pecaForm.idPeca).toBe(11);
    expect(component.pecaForm.nomePeca).toBe('Filtro de óleo');
    expect(component.fecharSelecaoPeca).toHaveBeenCalledTimes(1);
    fixture.detectChanges();
    expect((fixture.nativeElement.querySelector('#agendamento-pecaForm-idPeca') as HTMLInputElement).value).toContain('Filtro de óleo');
  });

  it('separa execução externa de interna e só libera salvar na Revisão', () => {
    component.novoAgendamento = {
      idCliente: 1, idVeiculo: 2, idServico: 3, quilometragemAtual: 10000,
      dataHoraInicio: '2026-10-22T10:00', dataHoraFim: '2026-10-22T11:00',
      tipoExecucao: 'EXTERNA', idFornecedor: 4, valorEstimado: 'R$ 80,00'
    };
    component.fornecedores = [{id: 4, razaoSocial: 'Oficina parceira', ativo: true, itemFornecido: 'Serviços automotivos'}];
    component.selecionarFornecedorExterno(component.fornecedores[0]);
    expect(component.agendamentoProntoParaSalvar).toBeTrue();
    fixture.detectChanges();
    expect((fixture.nativeElement.querySelector('button[title="Confira os dados na guia Revisão antes de salvar."]') as HTMLButtonElement).disabled).toBeTrue();
    component.trocarAbaNovoAgendamento('revisao');
    fixture.detectChanges();
    expect(component.abaNovoAgendamento).toBe('revisao');
    expect((fixture.nativeElement.textContent as string)).toContain('Oficina parceira');
    const salvar = Array.from(fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>)
      .find(botao => botao.textContent?.includes('Salvar Agendamento'))!;
    expect(salvar.disabled).toBeFalse();
    component.novoAgendamento.tipoExecucao = 'INTERNA';
    component.alterarTipoExecucao();
    expect(component.novoAgendamento.idFornecedor).toBeUndefined();
    expect(component.agendamentoProntoParaSalvar).toBeFalse();
    fixture.detectChanges();
    expect(salvar.disabled).toBeTrue();
  });
});
