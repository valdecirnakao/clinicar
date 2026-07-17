import { TestBed } from '@angular/core/testing';

import { ExibeControleEstoquePecasService } from './exibe-controle-estoque-pecas.service';

describe('ExibeControleEstoquePecasService', () => {
  let service: ExibeControleEstoquePecasService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ExibeControleEstoquePecasService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
