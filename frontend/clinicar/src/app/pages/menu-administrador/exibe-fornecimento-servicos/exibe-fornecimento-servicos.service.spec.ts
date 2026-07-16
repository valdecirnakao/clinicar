import { TestBed } from '@angular/core/testing';

import { ExibeFornecimentoServicosService } from './exibe-fornecimento-servicos.service';

describe('ExibeFornecimentoServicosService', () => {
  let service: ExibeFornecimentoServicosService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ExibeFornecimentoServicosService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
