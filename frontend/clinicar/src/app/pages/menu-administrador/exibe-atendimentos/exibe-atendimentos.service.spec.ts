import { TestBed } from '@angular/core/testing';

import { ExibeAtendimentosService } from './exibe-atendimentos.service';

describe('ExibeAtendimentosService', () => {
  let service: ExibeAtendimentosService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ExibeAtendimentosService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
