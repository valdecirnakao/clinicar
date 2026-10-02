import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExibeAgendamentosComponent } from './exibe-agendamentos.component';

describe('ExibeAgendamentosComponent', () => {
  let component: ExibeAgendamentosComponent;
  let fixture: ComponentFixture<ExibeAgendamentosComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
      imports: [ExibeAgendamentosComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ExibeAgendamentosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
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
});
