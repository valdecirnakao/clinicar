import { provideZoneChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';

import { FornecimentoServicoService } from './fornecimento-servico.service';

describe('FornecimentoServicoService', () => {
  let service: FornecimentoServicoService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZoneChangeDetection(), provideHttpClient(), provideHttpClientTesting(), provideRouter([])],});
    service = TestBed.inject(FornecimentoServicoService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
