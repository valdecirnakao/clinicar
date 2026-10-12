import { provideZoneChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';

import { AgendamentoService } from './agendamento.service';

describe('AgendamentoService', () => {
  let service: AgendamentoService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZoneChangeDetection(), provideHttpClient(), provideHttpClientTesting(), provideRouter([])],});
    service = TestBed.inject(AgendamentoService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
