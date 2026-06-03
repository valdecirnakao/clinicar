import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExibeFornecimentoPecasComponent } from './exibe-fornecimento-pecas.component';

describe('ExibeFornecimentoPecasComponent', () => {
  let component: ExibeFornecimentoPecasComponent;
  let fixture: ComponentFixture<ExibeFornecimentoPecasComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExibeFornecimentoPecasComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ExibeFornecimentoPecasComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
