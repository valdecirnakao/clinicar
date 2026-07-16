import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExibeFornecimentoServicosComponent } from './exibe-fornecimento-servicos.component';

describe('ExibeFornecimentoServicosComponent', () => {
  let component: ExibeFornecimentoServicosComponent;
  let fixture: ComponentFixture<ExibeFornecimentoServicosComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExibeFornecimentoServicosComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ExibeFornecimentoServicosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
