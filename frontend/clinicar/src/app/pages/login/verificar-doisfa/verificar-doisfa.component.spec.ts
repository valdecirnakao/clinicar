import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VerificarDoisfaComponent } from './verificar-doisfa.component';

describe('VerificarDoisfaComponent', () => {
  let component: VerificarDoisfaComponent;
  let fixture: ComponentFixture<VerificarDoisfaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VerificarDoisfaComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VerificarDoisfaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
