import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExibeFornecedorComponent } from './exibe-fornecedor.component';

describe('ExibeFornecedorComponent', () => {
  let component: ExibeFornecedorComponent;
  let fixture: ComponentFixture<ExibeFornecedorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExibeFornecedorComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ExibeFornecedorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
