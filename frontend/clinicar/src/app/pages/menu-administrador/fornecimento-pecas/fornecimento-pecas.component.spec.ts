import { provideZoneChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FornecimentoPecasComponent } from './fornecimento-pecas.component';

describe('FornecimentoPecasComponent', () => {
  let component: FornecimentoPecasComponent;
  let fixture: ComponentFixture<FornecimentoPecasComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideZoneChangeDetection(), provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
      imports: [FornecimentoPecasComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FornecimentoPecasComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('destaca os campos obrigatórios vazios e remove o destaque apenas quando válidos', () => {
    const bootstrapAnterior = (globalThis as any).bootstrap;
    (globalThis as any).bootstrap = { Modal: { getOrCreateInstance: () => ({ show: () => {} }) } };
    try { component.abrirModalCadastro(false); } finally { (globalThis as any).bootstrap = bootstrapAnterior; }
    expect(component.novoFornecimento.quantidadeMinima).toBe('');
    component.novoFornecimento = { fornecedor: { id: 7, razaoSocial: 'Fornecedor' }, peca: { id: 12, nome: 'Filtro', fabricante: 'Marca' }, valorCusto: '', prazoEntregaDias: '', quantidadeMinima: '', dataCadastro: '2026-10-04' };
    component.abaCadastroFornecimento = 'condicoes';
    fixture.detectChanges();
    const modal = fixture.nativeElement.querySelector('#modalCadastroFornecimento');
    expect(modal.querySelector('#valorUnitarioCadastro').classList.contains('is-invalid')).toBeTrue();
    expect(modal.querySelector('#prazoEntregaCadastro').classList.contains('is-invalid')).toBeTrue();
    expect(modal.querySelector('#quantidadeMinimaCadastro').classList.contains('is-invalid')).toBeTrue();
    component.normalizarQuantidadeMinimaCadastro();
    expect(component.novoFornecimento.quantidadeMinima).toBe('');
    expect(component.prazoTexto(component.novoFornecimento)).toBe('—');
    expect(component.quantidadeMinimaTexto(component.novoFornecimento)).toBe('—');
    expect(component.podeAvancarCadastro).toBeFalse();
    component.normalizarPrazoEntregaCadastro();
    expect(component.campoMarcadoInvalido('prazoEntregaDias')).toBeTrue();
    component.novoFornecimento.valorCusto = 'R$ 50,00';
    component.novoFornecimento.prazoEntregaDias = '0';
    expect(component.podeAvancarCadastro).toBeFalse();
    component.novoFornecimento.quantidadeMinima = '1';
    fixture.detectChanges();
    expect(modal.querySelector('#valorUnitarioCadastro').classList.contains('is-invalid')).toBeFalse();
    expect(modal.querySelector('#prazoEntregaCadastro').classList.contains('is-invalid')).toBeFalse();
    expect(modal.querySelector('#quantidadeMinimaCadastro').classList.contains('is-invalid')).toBeFalse();
    expect(component.prazoTexto(component.novoFornecimento)).toBe('Imediato');
    expect(component.podeAvancarCadastro).toBeTrue();
    component.novoFornecimento.valorCusto = '';
    component.limparCampoInvalido('valorCusto');
    expect(component.campoMarcadoInvalido('valorCusto')).toBeTrue();
    expect(component.podeAvancarCadastro).toBeFalse();
  });
});
