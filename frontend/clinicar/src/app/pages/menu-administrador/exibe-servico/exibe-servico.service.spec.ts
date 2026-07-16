import { TestBed } from '@angular/core/testing';

import { ExibeServicoService } from './exibe-servico.service';

describe('ExibeServicoService', () => {
  let service: ExibeServicoService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ExibeServicoService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
