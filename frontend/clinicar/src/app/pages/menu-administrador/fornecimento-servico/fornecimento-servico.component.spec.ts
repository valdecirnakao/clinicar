import { provideZoneChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FornecimentoServicoComponent } from './fornecimento-servico.component';

describe('FornecimentoServicoComponent', () => {
  let component: FornecimentoServicoComponent;
  let fixture: ComponentFixture<FornecimentoServicoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideZoneChangeDetection(), provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
      imports: [FornecimentoServicoComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FornecimentoServicoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
