import { provideZoneChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ServicoComponent } from './servico.component';

describe('ServicoComponent', () => {
  let component: ServicoComponent;
  let fixture: ComponentFixture<ServicoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideZoneChangeDetection(), provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
      imports: [ServicoComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ServicoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('exige fornecedor somente para o prestador externo no cadastro e na edição', () => {
    const dados = {
      nome: 'Troca de filtro', categoria: 'Motor', tipoDoPrestador: 'Fornecedor Externo',
      duracaoEstimada: '1', unidadeDuracao: 'HORA', valorBase: '80',
      unidadeCobranca: 'SERVICO', garantiaDias: 30, idFornecedor: null
    };
    component.novoServico = { ...component.novoServico, ...dados };
    component.edit = { ...component.edit, ...dados };
    expect(component.cadastroServicoProntoParaSalvar).toBeFalse();
    expect(component.edicaoServicoProntoParaSalvar).toBeFalse();
    expect(component.pendenciasCadastroAba('fornecedor')).toBe(1);
    component.novoServico.idFornecedor = 1;
    component.edit.idFornecedor = 1;
    expect(component.cadastroServicoProntoParaSalvar).toBeFalse();
    expect(component.edicaoServicoProntoParaSalvar).toBeFalse();
    component.abaCadastroServico = 'revisao';
    component.abaEdicaoServico = 'revisao';
    expect(component.cadastroServicoProntoParaSalvar).toBeTrue();
    expect(component.edicaoServicoProntoParaSalvar).toBeTrue();
    component.novoServico.idFornecedor = null;
    component.novoServico.tipoDoPrestador = 'Mecânico';
    expect(component.cadastroServicoProntoParaSalvar).toBeTrue();
  });

  it('não oferece Terceirizado em novos cadastros', () => {
    expect(component.tiposPrestadorSugeridos).not.toContain('Terceirizado');
    expect(component.tiposPrestadorSugeridos).toContain('Fornecedor Externo');
  });
});
