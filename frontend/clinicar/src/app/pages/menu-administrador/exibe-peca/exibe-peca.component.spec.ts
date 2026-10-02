import { provideRouter } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { ExibePecaComponent } from './exibe-peca.component';

describe('ExibePecaComponent', () => {
  let component: ExibePecaComponent;
  let fixture: ComponentFixture<ExibePecaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExibePecaComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ExibePecaComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('deve reconhecer óleo de motor recebido como enum do backend', () => {
    expect(component.ehOleoMotor({ tipo: 'OLEO_MOTOR' })).toBeTrue();
  });

  it('deve exibir viscosidade e classificação API no resumo técnico', () => {
    const resumo = component.resumoEspecificacaoTecnica({
      tipo: 'Óleo de motor',
      viscosidadeSae: '5w40',
      classificacaoApi: 'SP'
    });

    expect(resumo).toBe('SAE 5W-40 · API SP');
  });

  it('deve normalizar os nomes snake_case retornados pela API', () => {
    const peca = (component as any).normalizarPecaExibicao({
      id: 1,
      nome: 'óleo teste',
      tipo: 'OLEO_MOTOR',
      fabricante: 'fabricante teste',
      unidade: 'litro',
      viscosidade_sae: '5w40',
      classificacao_api: 'sp'
    });

    expect(peca.viscosidadeSae).toBe('5W-40');
    expect(peca.classificacaoApi).toBe('SP');
    expect(component.resumoEspecificacaoTecnica(peca)).toBe('SAE 5W-40 · API SP');
  });
});
