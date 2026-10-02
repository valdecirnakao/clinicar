import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';

import { ExibeAgendamentosService } from './exibe-agendamentos.service';

describe('ExibeAgendamentosService', () => {
  let service: ExibeAgendamentosService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],});
    service = TestBed.inject(ExibeAgendamentosService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
