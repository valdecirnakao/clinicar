import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExibePecaComponent } from './exibe-peca.component';

describe('ExibePecaComponent', () => {
  let component: ExibePecaComponent;
  let fixture: ComponentFixture<ExibePecaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExibePecaComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ExibePecaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
