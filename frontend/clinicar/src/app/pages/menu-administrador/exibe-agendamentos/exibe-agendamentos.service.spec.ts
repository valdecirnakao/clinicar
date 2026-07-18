import { TestBed } from '@angular/core/testing';

import { ExibeAgendamentosService } from './exibe-agendamentos.service';

describe('ExibeAgendamentosService', () => {
  let service: ExibeAgendamentosService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ExibeAgendamentosService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
