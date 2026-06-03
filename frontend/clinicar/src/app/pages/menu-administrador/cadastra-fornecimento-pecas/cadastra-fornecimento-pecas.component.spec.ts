import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CadastraFornecimentoPecasComponent } from './cadastra-fornecimento-pecas.component';

describe('CadastraFornecimentoPecasComponent', () => {
  let component: CadastraFornecimentoPecasComponent;
  let fixture: ComponentFixture<CadastraFornecimentoPecasComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CadastraFornecimentoPecasComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CadastraFornecimentoPecasComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
