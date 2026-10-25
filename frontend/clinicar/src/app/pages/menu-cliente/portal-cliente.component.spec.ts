import { provideZoneChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { PortalClienteComponent } from './portal-cliente.component';

describe('PortalClienteComponent', () => {
  let fixture: ComponentFixture<PortalClienteComponent>;
  let component: PortalClienteComponent;
  let http: HttpTestingController;
  const usuario = { id: 7, nome: 'Cliente Teste', nome_social: '', email: 'cliente@example.com', cpf: '12345678901',
    nascimento: '1990-01-02', telefone: '11987654321', cep: '12345678', logradouro: 'Rua A', numero_endereco: '10',
    complemento_endereco: '', bairro: 'Centro', cidade: 'Sorocaba', estado: 'SP' };

  beforeEach(async () => {
    sessionStorage.removeItem('clinicar.cadastroCliente');
    await TestBed.configureTestingModule({ imports: [PortalClienteComponent], providers: [provideZoneChangeDetection(), provideHttpClient(), provideHttpClientTesting(), provideRouter([])] }).compileComponents();
    fixture = TestBed.createComponent(PortalClienteComponent);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    http.expectOne('/api/cliente/portal').flush({ usuario, veiculos: [], alertas: { ativo: false } });
    fixture.detectChanges();
  });

  afterEach(() => { http.verify(); sessionStorage.removeItem('clinicar.cadastroCliente'); });

  it('salva a escolha de receber avisos de serviço e desfaz a alteração se falhar', () => {
    component.portal!.avisosServicoWhatsapp = true;
    component.salvarAvisosServico();
    const ativacao = http.expectOne('/api/cliente/portal/avisos-servico-whatsapp');
    expect(ativacao.request.method).toBe('PUT');
    expect(ativacao.request.body).toEqual({ ativo: true });
    ativacao.flush(true);
    expect(component.portal!.avisosServicoWhatsapp).toBeTrue();

    component.portal!.avisosServicoWhatsapp = false;
    component.salvarAvisosServico();
    http.expectOne('/api/cliente/portal/avisos-servico-whatsapp').flush({}, { status: 500, statusText: 'Erro' });
    expect(component.portal!.avisosServicoWhatsapp).toBeTrue();
  });

  it('retoma o cadastro na conta correta, aceita vários veículos e segue para alertas', () => {
    sessionStorage.setItem('clinicar.cadastroCliente', '7:veiculos');
    component.carregar();
    http.expectOne('/api/cliente/portal').flush({ usuario, veiculos: [], alertas: { ativo: false } });
    http.expectOne('/api/cliente/veiculos/edicao').flush([]);
    expect(component.guia).toBe('veiculos');
    expect(component.novoVeiculo).toBeTrue();
    Object.assign(component.veiculoEditando!, { placa: 'ABC1D23', fabricante: 'VW', modelo: 'Gol', cor: 'Prata', anoModeloCombustivel: '2020 Flex' });
    component.salvarVeiculo();
    const cadastro = http.expectOne('/api/cliente/portal/veiculos');
    expect(cadastro.request.method).toBe('POST');
    cadastro.flush({ id: 20, ...component.veiculoEditando });
    expect(component.etapaCadastroCliente).toBe('decisao');
    component.continuarCadastroParaAlertas();
    expect(component.guia).toBe('alertas');
    expect(sessionStorage.getItem('clinicar.cadastroCliente')).toBe('7:alertas');
  });

  it('ignora a continuação de cadastro de outra conta', () => {
    sessionStorage.setItem('clinicar.cadastroCliente', '8:veiculos');
    component.carregar();
    http.expectOne('/api/cliente/portal').flush({ usuario, veiculos: [], alertas: { ativo: false } });
    expect(component.etapaCadastroCliente).toBeNull();
    expect(component.guia).toBe('dados');
    http.expectNone('/api/cliente/veiculos/edicao');
  });

  it('permite cancelar confirmado com antecedência e atualiza a lista', () => {
    const item = { agendamento: { id: 42, codigoAgendamento: 'AGD-42', statusAgendamento: 'CONFIRMADO',
      dataHoraInicio: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString() }, pecas: [] } as any;
    expect(component.podeCancelarAgendamento(item)).toBeTrue();
    spyOn(window, 'confirm').and.returnValue(true);
    component.cancelarAgendamento(item);
    const req = http.expectOne('/api/cliente/agendamentos/42/cancelar');
    expect(req.request.method).toBe('PATCH');
    req.flush({ ...item, agendamento: { ...item.agendamento, statusAgendamento: 'CANCELADO' } });
    http.expectOne(r => r.url === '/api/cliente/agendamentos').flush({ itens: [], total: 0, pagina: 0, tamanho: 10, indicadores: {} });
    expect(component.mensagem).toContain('cancelado');
    item.agendamento.dataHoraInicio = new Date(Date.now() + 23 * 60 * 60 * 1000).toISOString();
    expect(component.podeCancelarAgendamento(item)).toBeFalse();
    item.agendamento.statusAgendamento = 'AGENDADO';
    expect(component.podeReagendarAgendamento(item)).toBeFalse();
  });

  it('confirma agendamento pendente e abre reagendamento de confirmado', () => {
    const item = { agendamento: { id: 42, codigoAgendamento: 'AGD-42', statusAgendamento: 'AGENDADO',
      dataHoraInicio: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
      dataHoraFim: new Date(Date.now() + 49 * 60 * 60 * 1000).toISOString(), idVeiculo: 1,
      idServico: 2, idResponsavel: 3, tipoExecucao: 'INTERNA', observacoes: 'Nota legível\n[PEÇAS PREVISTAS NO AGENDAMENTO]\nPeça' },
      pecas: [{ idPeca: 4, nome: 'Peça', quantidade: '1' }] } as any;
    spyOn(window, 'confirm').and.returnValue(true);
    component.confirmarAgendamento(item);
    const req = http.expectOne('/api/cliente/agendamentos/42/confirmar');
    expect(req.request.method).toBe('PATCH');
    req.flush(item);
    http.expectOne(r => r.url === '/api/cliente/agendamentos').flush({ itens: [], total: 0, pagina: 0, tamanho: 10, indicadores: {} });
    expect(component.mensagem).toContain('confirmado');

    item.agendamento.statusAgendamento = 'CONFIRMADO';
    component.abrirReagendamento(item);
    http.expectOne('/api/cliente/agendamentos/catalogos').flush({ servicos: [], pecas: [], responsaveis: [] });
    expect(component.modoAgenda).toBe('reagendar');
    expect(component.agendaForm?.observacoes).toBe('Nota legível');
  });

  it('pesquisa e seleciona um veículo próprio sem perder o agendamento em edição', () => {
    component.portal!.veiculos = [
      {id: 21, placa: 'ABC1234', fabricante: 'VW', modelo: 'Gol', cor: 'Azul', anoModeloCombustivel: '2020 Flex'},
      {id: 22, placa: 'DEF5678', fabricante: 'Fiat', modelo: 'Uno', cor: 'Branco', anoModeloCombustivel: '2021 Flex'}
    ];
    component.guia = 'agendamentos';
    component.abrirNovoAgendamento();
    http.expectOne('/api/cliente/agendamentos/catalogos').flush({servicos: [], pecas: [], responsaveis: []});
    component.agendaForm!.queixaCliente = 'Revisão';
    component.abrirSelecaoVeiculoAgenda();
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('ABC-1234');
    component.buscaVeiculoAgenda = 'uno';
    expect(component.veiculosFiltradosAgenda().map(v => v.id)).toEqual([22]);
    component.selecionarVeiculoAgenda(component.paginaVeiculosAgenda()[0]);
    expect(component.agendaForm!.idVeiculo).toBe(22);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>('#agendaVeiculo')?.value).toBe('DEF-5678 · Uno');
    expect(component.agendaForm!.queixaCliente).toBe('Revisão');
    expect(component.selecionandoVeiculoAgenda).toBeFalse();
  });

  it('mostra os dados formatados em leitura e salva apenas depois de Editar', async () => {
    const tela = fixture.nativeElement as HTMLElement;
    expect(tela.textContent).toContain('123.456.789-01');
    expect(tela.textContent).toContain('+55 (11) 98765-4321');
    expect(tela.textContent).toContain('12345-678');
    expect(tela.querySelector('#clienteNome')).toBeNull();
    component.editarDados(); fixture.detectChanges();
    await fixture.whenStable(); fixture.detectChanges();
    const nome = tela.querySelector('#clienteNome') as HTMLInputElement;
    expect(nome.value).toBe('Cliente Teste');
    component.dadosEditando!.nome = 'Cliente Atualizado';
    expect(component.portal!.usuario.nome).toBe('Cliente Teste');
    component.salvarDados();
    const req = http.expectOne('/api/cliente/portal/dados');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body.nome).toBe('Cliente Atualizado');
    req.flush({ ...usuario, nome: 'Cliente Atualizado' });
    fixture.detectChanges();
    expect(component.dadosEditando).toBeNull();
    expect(tela.textContent).toContain('Cliente Atualizado');
  });

  it('separa agendamentos e atendimentos na navegação', () => {
    component.abrirGuia('agendamentos');
    http.expectOne(r => r.url === '/api/cliente/agendamentos').flush({ itens: [], total: 0, pagina: 0, tamanho: 10, indicadores: {} });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Nenhum agendamento encontrado');
    expect(fixture.nativeElement.textContent).not.toContain('Nenhum atendimento encontrado');
    component.abrirGuia('atendimentos');
    http.expectOne('/api/cliente/portal/atendimentos').flush([]);
    http.expectOne('/api/cliente/portal/orcamentos').flush([]);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Nenhum atendimento encontrado');
  });

  it('registra a decisão do orçamento pendente com a versão exibida', () => {
    component.abrirGuia('atendimentos');
    http.expectOne('/api/cliente/portal/atendimentos').flush([]);
    const proposta = { id: 30, atendimentoId: 10, versao: 2, status: 'PENDENTE', codigo: 'OS-10', placa: 'ABC1234',
      servico: 'Freios', diagnostico: 'Trocar pastilhas', itens: '', valorMaoObra: 100, valorPecas: 40,
      valorTerceiros: 0, desconto: 0, valorTotal: 140, criadoEm: '2026-10-14T12:00:00' };
    http.expectOne('/api/cliente/portal/orcamentos').flush([proposta]);
    spyOn(window, 'confirm').and.returnValue(true);
    component.decidirOrcamento(proposta, true);
    const req = http.expectOne('/api/cliente/portal/orcamentos/30/decisao');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ aceitar: true });
    req.flush({ ...proposta, status: 'APROVADO' });
    http.expectOne('/api/cliente/portal/atendimentos').flush([]);
    http.expectOne('/api/cliente/portal/orcamentos').flush([{ ...proposta, status: 'APROVADO' }]);
    expect(component.orcamentos[0].status).toBe('APROVADO');
  });

  it('cria pedido sem executor e envia preferência livre para a oficina', () => {
    component.portal!.veiculos = [{ id: 21, placa: 'ABC1234', fabricante: 'VW', modelo: 'Gol', cor: 'Azul', anoModeloCombustivel: '2020 Flex' }];
    component.abrirNovoAgendamento();
    http.expectOne('/api/cliente/agendamentos/catalogos').flush({ servicos: [{ id: 3, nome: 'Revisão', materiaisReferencia: 'Filtro conforme o veículo' }],
      responsaveis: [{ id: 5, nome: 'Mecânico' }] });
    Object.assign(component.agendaForm!, { idVeiculo: 21, idServico: 3,
      dataHoraInicio: '2030-10-01T09:00', dataHoraFim: '2030-10-01T10:00',
      sugestaoMateriaisCliente: 'Prefiro óleo da marca X',
      preferenciaExecucaoCliente: 'Prefiro atendimento na oficina.' });
    component.salvarAgendamento();
    http.expectNone(r => r.method === 'POST');
    expect(component.materiaisReferenciaAgenda()).toBe('Filtro conforme o veículo');
    component.etapaAgenda = 'revisao';
    component.salvarAgendamento();
    const request = http.expectOne('/api/cliente/agendamentos');
    expect(request.request.method).toBe('POST');
    expect(request.request.body.idVeiculo).toBe(21);
    expect(request.request.body.idCliente).toBeUndefined();
    expect(request.request.body.sugestaoMateriaisCliente).toBe('Prefiro óleo da marca X');
    expect(request.request.body.preferenciaExecucaoCliente).toBe('Prefiro atendimento na oficina.');
    expect(request.request.body.idResponsavel).toBeUndefined();
    expect(request.request.body.pecasPrevistas).toBeUndefined();
    request.flush({});
    http.expectOne(r => r.url === '/api/cliente/agendamentos').flush({ itens: [], total: 0, pagina: 0, tamanho: 10, indicadores: {} });
  });

  it('libera as guias em ordem após os dados obrigatórios', () => {
    component.abrirNovoAgendamento();
    http.expectOne('/api/cliente/agendamentos/catalogos').flush({ servicos: [], responsaveis: [] });
    expect(component.progressoAgenda()).toBe(0);
    expect(component.podeAcessarEtapaAgenda('pecas')).toBeFalse();
    component.selecionarEtapaAgenda('revisao');
    component.proximaEtapaAgenda();
    expect(component.etapaAgenda).toBe('dados');
    Object.assign(component.agendaForm!, { idVeiculo: 21, idServico: 3,
      dataHoraInicio: '2030-10-01T09:00', dataHoraFim: '2030-10-01T10:00' });
    expect(component.podeAvancarEtapaAgenda()).toBeTrue();
    expect(component.podeAcessarEtapaAgenda('revisao')).toBeFalse();
    component.proximaEtapaAgenda();
    expect(component.etapaAgenda).toBe('pecas');
    component.proximaEtapaAgenda();
    component.proximaEtapaAgenda();
    expect(component.etapaAgenda).toBe('revisao');
    expect(component.progressoAgenda()).toBe(100);
  });

  it('calcula o fim pela duração do serviço sem perder a hora local', () => {
    component.abrirNovoAgendamento();
    http.expectOne('/api/cliente/agendamentos/catalogos').flush({
      servicos: [{ id: 3, nome: 'Revisão', duracaoEstimada: 1.5, unidadeDuracao: 'HORA' }], responsaveis: [] });
    component.agendaForm!.idServico = 3;
    component.agendaForm!.dataHoraInicio = '2030-10-01T23:30';
    component.alterarInicioAgenda();
    expect(component.duracaoServicoAgenda()).toBe(90);
    expect(component.agendaForm!.dataHoraFim).toBe('2030-10-02T01:00');
  });

  it('não permite confirmação enquanto a oficina não definir a execução', () => {
    const item = { agendamento: { id: 1, codigoAgendamento: 'AG-1', idVeiculo: 21, placaVeiculo: 'ABC1234',
      idServico: 3, nomeServico: 'Revisão', dataHoraInicio: '2030-10-01T09:00',
      dataHoraFim: '2030-10-01T10:00', statusAgendamento: 'AGENDADO', tipoExecucao: 'PENDENTE' }, pecas: [] };
    expect(component.podeConfirmarAgendamento(item)).toBeFalse();
    item.agendamento.tipoExecucao = 'INTERNA';
    expect(component.podeConfirmarAgendamento(item)).toBeFalse();
  });

  it('abre o histórico de veículo próprio com a mesma consulta e opção de PDF', () => {
    component.portal!.veiculos = [{ id: 21, placa: 'ABC1234', fabricante: 'VW', modelo: 'Gol',
      cor: 'Azul', anoModeloCombustivel: '2020 Flex' }];
    component.abrirHistorico(21); fixture.detectChanges();
    const req = http.expectOne('/api/veiculo/21/historico?situacao=TODOS');
    expect(req.request.withCredentials).toBeTrue();
    req.flush({ veiculo: { ...component.portal!.veiculos[0] }, inicio: null, fim: null, situacao: 'TODOS',
      geradoEm: '2026-10-14T10:00:00', resumo: { agendamentos: 0, atendimentos: 0, finalizados: 0,
        valorFinalizados: 0, ultimaQuilometragem: null }, registros: [] });
    fixture.detectChanges();
    const tela = fixture.nativeElement as HTMLElement;
    expect(tela.textContent).toContain('ABC-1234');
    expect(tela.querySelectorAll('#historicoVeiculo option').length).toBe(2);
    expect(tela.textContent).toContain('Exportar PDF');
    (tela.querySelector('app-historico-veicular button.btn-outline-secondary') as HTMLButtonElement).click();
    http.expectOne('/api/cliente/veiculos/edicao').flush([{ veiculoId: 21, possuiHistorico: true, pendente: null }]);
    fixture.detectChanges();
    expect(component.guia).toBe('veiculos');
  });

  it('mantém a identificação em leitura quando há histórico e envia correção para análise', () => {
    const veiculo = { id: 21, placa: 'ABC1234', fabricante: 'VW', modelo: 'Gol', cor: 'Azul', anoModeloCombustivel: '2020 Flex' };
    component.portal!.veiculos = [veiculo];
    component.abrirGuia('veiculos');
    http.expectOne('/api/cliente/veiculos/edicao').flush([{ veiculoId: 21, possuiHistorico: true, pendente: null }]);
    component.editarVeiculo(veiculo); fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>('#veiculoPlaca')?.readOnly).toBeTrue();
    expect((fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>('#veiculoCor')?.readOnly).toBeFalse();
    component.solicitarCorrecaoVeiculo(veiculo);
    component.correcaoVeiculo!.placa = 'ABC1D34';
    component.correcaoVeiculo!.justificativa = 'Placa conferida no documento.';
    component.enviarCorrecaoVeiculo();
    const req = http.expectOne('/api/cliente/veiculos/21/correcoes');
    expect(req.request.method).toBe('POST');
    expect(req.request.body.placa).toBe('ABC1D34');
    req.flush({ id: 1 });
    http.expectOne('/api/cliente/veiculos/edicao').flush([{ veiculoId: 21, possuiHistorico: true,
      pendente: { id: 1, status: 'PENDENTE' } }]);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Correção em análise');
  });
});
