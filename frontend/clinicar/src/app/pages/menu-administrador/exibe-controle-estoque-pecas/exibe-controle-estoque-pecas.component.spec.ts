import { provideRouter } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { ExibeControleEstoquePecasComponent } from './exibe-controle-estoque-pecas.component';

describe('ExibeControleEstoquePecasComponent', () => {
  let component: ExibeControleEstoquePecasComponent;
  let fixture: ComponentFixture<ExibeControleEstoquePecasComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExibeControleEstoquePecasComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ExibeControleEstoquePecasComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('deve exigir custo médio quando houver estoque inicial', () => {
    component.novoEstoque = {
      idPeca: 1,
      idLocalEstoque: 1,
      quantidadeAtual: '10',
      quantidadeReservada: '0',
      estoqueMinimo: '5',
      estoqueCritico: '2',
      custoMedio: ''
    };

    expect(component.custoMedioObrigatorio(component.novoEstoque)).toBeTrue();
    expect(component.progressoCadastroEstoque).toBe(86);
    expect(component.cadastroEstoqueProntoParaSalvar).toBeFalse();
    expect(component.mensagemBloqueioCadastro).toContain('custo médio');

    component.novoEstoque.custoMedio = 'R$ 20,00';

    expect(component.progressoCadastroEstoque).toBe(100);
    expect(component.cadastroEstoqueProntoParaSalvar).toBeTrue();
  });

  it('deve permitir custo médio vazio quando o estoque inicial for zero', () => {
    component.novoEstoque = {
      idPeca: 1,
      idLocalEstoque: 1,
      quantidadeAtual: '0',
      quantidadeReservada: '0',
      estoqueMinimo: '5',
      estoqueCritico: '2',
      custoMedio: ''
    };

    expect(component.custoMedioObrigatorio(component.novoEstoque)).toBeFalse();
    expect(component.progressoCadastroEstoque).toBe(100);
    expect(component.cadastroEstoqueProntoParaSalvar).toBeTrue();
  });

  it('não deve contar texto inválido como quantidade preenchida', () => {
    component.novoEstoque = {
      idPeca: 1,
      idLocalEstoque: 1,
      quantidadeAtual: 'valor inválido',
      quantidadeReservada: '0',
      estoqueMinimo: '5',
      estoqueCritico: '2'
    };

    expect(component.progressoCadastroEstoque).toBe(83);
    expect(component.cadastroEstoqueProntoParaSalvar).toBeFalse();
  });

  it('deve usar a barra Bootstrap no cadastro em vez do progress nativo', () => {
    const modal: HTMLElement = fixture.nativeElement.querySelector('#modalCadastroEstoquePeca');

    expect(modal.querySelector('progress')).toBeNull();
    expect(modal.querySelector('.cadastro-progress .cadastro-progress-bar')).not.toBeNull();
  });
});
