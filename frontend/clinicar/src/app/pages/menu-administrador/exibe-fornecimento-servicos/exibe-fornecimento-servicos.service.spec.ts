import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';

import { ExibeFornecimentoServicosService } from './exibe-fornecimento-servicos.service';

describe('ExibeFornecimentoServicosService', () => {
  let service: ExibeFornecimentoServicosService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],});
    service = TestBed.inject(ExibeFornecimentoServicosService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
