import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';

import { ExibeServicoService } from './exibe-servico.service';

describe('ExibeServicoService', () => {
  let service: ExibeServicoService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],});
    service = TestBed.inject(ExibeServicoService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
