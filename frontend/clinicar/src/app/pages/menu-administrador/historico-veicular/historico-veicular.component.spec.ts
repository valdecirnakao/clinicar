import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { HistoricoVeicularComponent } from './historico-veicular.component';
import { HistoricoVeicular } from './historico-veicular.service';

describe('HistoricoVeicularComponent', () => {
  let fixture: ComponentFixture<HistoricoVeicularComponent>;
  let component: HistoricoVeicularComponent;
  let http: HttpTestingController;
  const resposta = (): HistoricoVeicular => ({
    veiculo: { id: 1, placa: 'XYZ9999', fabricante: 'Toyota', modelo: 'Yaris', cor: 'Branco', anoModeloCombustivel: '2026 Flex' },
    inicio: null, fim: null, situacao: 'TODOS', geradoEm: '2026-10-01T10:00:00',
    resumo: { agendamentos: 0, atendimentos: 0, finalizados: 0, valorFinalizados: 0, ultimaQuilometragem: null }, registros: []
  });
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [HistoricoVeicularComponent], providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()] }).compileComponents();
    fixture = TestBed.createComponent(HistoricoVeicularComponent); component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController); fixture.detectChanges();
    http.expectOne('/api/veiculo').flush([{ id: 1, placa: 'XYZ9999', fabricante: 'Toyota', modelo: 'Yaris' }]);
  });
  afterEach(() => { fixture.destroy(); http.verify(); });
  it('exige veículo e rejeita datas invertidas sem consultar o servidor', () => {
    component.consultar(); expect(component.erro).toContain('Selecione');
    component.veiculoId = 1; component.inicio = '2026-10-02'; component.fim = '2026-10-01'; component.consultar();
    expect(component.erro).toContain('data final'); http.expectNone(req => req.url.includes('/historico'));
  });
  it('envia filtros com sessão e apresenta o estado vazio', () => {
    component.veiculoId = 1; component.inicio = '2026-09-01'; component.fim = '2026-09-30'; component.situacao = 'FINALIZADOS'; component.consultar();
    const req = http.expectOne(r => r.url === '/api/veiculo/1/historico');
    expect(req.request.params.get('fim')).toBe('2026-09-30'); expect(req.request.params.get('situacao')).toBe('FINALIZADOS'); expect(req.request.withCredentials).toBeTrue();
    req.flush(resposta()); fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Nenhum registro encontrado'); expect(component.carregando).toBeFalse();
  });
  it('cancela a consulta anterior quando o usuário altera os filtros', () => {
    component.veiculoId = 1; component.consultar(); const req = http.expectOne('/api/veiculo/1/historico?situacao=TODOS');
    component.limparResultado(); expect(req.cancelled).toBeTrue(); expect(component.relatorio).toBeNull(); expect(component.carregando).toBeFalse();
  });
  it('exibe a placa histórica sem substituir pelo cadastro atual', () => {
    const r = resposta(); r.registros.push({ tipo: 'ATENDIMENTO', id: 7, codigo: 'AT-7', data: '2026-09-30T10:00:00', status: 'ENTREGUE', placa: 'ABC1234', fabricante: 'Toyota', modelo: 'Corolla', cor: 'Preto', anoModeloCombustivel: '2020 Flex', veiculoPreservado: true, kmEntrada: 0, kmSaida: 10, queixa: null, diagnostico: null, execucao: null, recomendacoes: null, valor: 100, finalizado: true, itens: [] });
    component.relatorio = r; fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.record-vehicle').textContent).toContain('ABC1234');
    expect(fixture.nativeElement.querySelector('.vehicle-heading').textContent).toContain('XYZ9999');
    expect(fixture.nativeElement.querySelector('.record-metrics').textContent).toContain('0');
  });
  it('exporta o relatório completo com os mesmos filtros da consulta', () => {
    component.veiculoId = 1; component.inicio = '2026-09-01'; component.fim = '2026-09-30'; component.situacao = 'FINALIZADOS'; component.relatorio = resposta();
    spyOn(URL, 'createObjectURL').and.returnValue('blob:teste'); spyOn(HTMLAnchorElement.prototype, 'click');
    component.exportar(); const req = http.expectOne(r => r.url === '/api/veiculo/1/historico/pdf');
    expect(req.request.responseType).toBe('blob'); expect(req.request.params.get('inicio')).toBe(component.inicio); expect(req.request.params.get('situacao')).toBe('FINALIZADOS');
    req.flush(new Blob(['pdf'], { type: 'application/pdf' })); expect(component.exportando).toBeFalse();
  });
  it('mostra erro de consulta e permite tentar novamente', () => {
    component.veiculoId = 1; component.consultar(); http.expectOne('/api/veiculo/1/historico?situacao=TODOS').flush({ mensagem: 'Período inválido' }, { status: 400, statusText: 'Bad Request' });
    expect(component.erro).toBe('Período inválido'); expect(component.carregando).toBeFalse();
  });
  it('navega por um histórico longo e exibe corretamente a última página parcial', () => {
    const r = resposta();
    r.registros = Array.from({ length: 53 }, (_, i) => ({ tipo: 'ATENDIMENTO', id: i, codigo: `AT-${i}`, data: '2026-09-30T10:00:00', status: 'ENTREGUE', placa: 'ABC1234', fabricante: 'Toyota', modelo: 'Corolla', cor: 'Preto', anoModeloCombustivel: '2020 Flex', veiculoPreservado: true, kmEntrada: 0, kmSaida: 10, queixa: null, diagnostico: null, execucao: null, recomendacoes: null, valor: 100, finalizado: true, itens: [] }));
    component.relatorio = r; fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.history-record').length).toBe(10);
    fixture.nativeElement.querySelector('[aria-label="Última página"]').click(); fixture.detectChanges();
    expect(component.pagina).toBe(6);
    expect(fixture.nativeElement.querySelectorAll('.history-record').length).toBe(3);
    expect(component.registrosPagina.map(registro => registro.codigo)).toEqual(['AT-50', 'AT-51', 'AT-52']);
    expect(fixture.nativeElement.querySelector('.pagination-info').textContent.replace(/\s+/g, ' ').trim()).toBe('Mostrando 51 a 53 de 53 registro(s)');
    expect(fixture.nativeElement.querySelector('[aria-label="Última página"]').disabled).toBeTrue();
    const tamanho = fixture.nativeElement.querySelector('#historicoTamanhoPagina') as HTMLSelectElement;
    tamanho.selectedIndex = 2; tamanho.dispatchEvent(new Event('change')); fixture.detectChanges();
    expect(component.itensPorPagina).toBe(20); expect(component.pagina).toBe(1);
    expect(fixture.nativeElement.querySelectorAll('.history-record').length).toBe(20);
    expect(r.registros.length).toBe(53);
    component.irParaPagina(3); component.limparResultado(); expect(component.pagina).toBe(1);
  });
});
