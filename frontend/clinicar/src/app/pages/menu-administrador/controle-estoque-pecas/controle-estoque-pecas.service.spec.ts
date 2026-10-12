import { provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { ControleEstoquePecasService } from './controle-estoque-pecas.service';

describe('ControleEstoquePecasService', () => {
  let service: ControleEstoquePecasService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZoneChangeDetection(), provideRouter([]), provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(ControleEstoquePecasService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
