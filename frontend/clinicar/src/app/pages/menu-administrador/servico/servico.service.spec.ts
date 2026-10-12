import { provideZoneChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';

import { ServicoService } from './servico.service';

describe('ServicoService', () => {
  let service: ServicoService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZoneChangeDetection(), provideHttpClient(), provideHttpClientTesting(), provideRouter([])],});
    service = TestBed.inject(ServicoService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
