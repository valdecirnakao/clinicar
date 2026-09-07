import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { ExibeControleEstoquePecasService } from './exibe-controle-estoque-pecas.service';

describe('ExibeControleEstoquePecasService', () => {
  let service: ExibeControleEstoquePecasService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(ExibeControleEstoquePecasService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
