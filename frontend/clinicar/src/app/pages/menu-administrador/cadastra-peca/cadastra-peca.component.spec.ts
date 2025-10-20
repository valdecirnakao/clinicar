import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CadastraPecaComponent } from './cadastra-peca.component';

describe('CadastraPecaComponent', () => {
  let component: CadastraPecaComponent;
  let fixture: ComponentFixture<CadastraPecaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CadastraPecaComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CadastraPecaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
