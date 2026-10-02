import { provideRouter } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { ExibeRegrasManutencaoComponent } from './exibe-regras-manutencao.component';

describe('ExibeRegrasManutencaoComponent', () => {
  let component: ExibeRegrasManutencaoComponent;
  let fixture: ComponentFixture<ExibeRegrasManutencaoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExibeRegrasManutencaoComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ExibeRegrasManutencaoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('deve preencher a origem ao selecionar óleo de motor semissintético', () => {
    component.pecas = [
      {
        id: 10,
        nome: 'Lubrificante SAE 5W30',
        tipo: 'Óleo de motor',
        origemOleo: 'SEMISSINTETICO'
      }
    ];

    component.formulario.idPeca = 10;
    component.aoAlterarPecaFormulario();

    expect(component.formulario.grupoManutencao).toBe('TROCA_OLEO');
    expect(component.formulario.origemOleo).toBe('SEMISSINTETICO');
    expect(component.origensOleo).toContain('SEMISSINTETICO');
  });

  it('deve priorizar a origem cadastrada quando a descrição mencionar outra origem', () => {
    component.pecas = [{
      id: 11,
      nome: 'Óleo de motor para linha sintética',
      tipo: 'Óleo de motor',
      origemOleo: 'SEMISSINTETICO'
    }];
    component.formulario.idPeca = 11;
    component.aoAlterarPecaFormulario();
    expect(component.formulario.origemOleo).toBe('SEMISSINTETICO');
  });

  it('deve manter o comportamento manual para peça que não seja óleo de motor', () => {
    component.pecas = [
      {
        id: 20,
        nome: 'Filtro de Ar',
        tipo: 'FILTRO'
      }
    ];

    component.formulario.grupoManutencao = 'FILTRO_AR';
    component.formulario.idPeca = 20;
    component.formulario.origemOleo = null;
    component.aoAlterarPecaFormulario();

    expect(component.formulario.grupoManutencao).toBe('FILTRO_AR');
    expect(component.formulario.origemOleo).toBeNull();
  });

  it('deve calcular o progresso pelos campos obrigatórios da regra', () => {
    component.formulario = {
      grupoManutencao: 'FILTRO_AR',
      descricao: 'Substituição preventiva do filtro de ar',
      idServico: 1,
      idPeca: null,
      origemOleo: null,
      intervaloKm: 10000,
      intervaloDias: null,
      prioridade: 100,
      ativo: true,
      observacoes: null
    };

    expect(component.progressoFormulario).toBe(100);
    expect(component.formularioProntoParaSalvar).toBeTrue();
  });

  it('deve incluir a origem entre os obrigatórios de troca de óleo', () => {
    component.formulario = {
      grupoManutencao: 'TROCA_OLEO',
      descricao: 'Troca preventiva do óleo do motor',
      idServico: null,
      idPeca: 10,
      origemOleo: null,
      intervaloKm: 10000,
      intervaloDias: 365,
      prioridade: 10,
      ativo: true,
      observacoes: null
    };

    expect(component.progressoFormulario).toBe(83);
    expect(component.formularioProntoParaSalvar).toBeFalse();

    component.formulario.origemOleo = 'SINTETICO';

    expect(component.progressoFormulario).toBe(100);
    expect(component.formularioProntoParaSalvar).toBeTrue();
  });

  it('deve renderizar a barra de progresso no padrão do projeto', () => {
    const modal: HTMLElement = fixture.nativeElement.querySelector('#modalRegraManutencao');

    expect(modal.querySelector('progress')).toBeNull();
    expect(modal.querySelector('.regra-progress .regra-progress-bar')).not.toBeNull();
  });
});
