import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExibeAtendimentosComponent } from './exibe-atendimentos.component';

describe('ExibeAtendimentosComponent', () => {
  let component: ExibeAtendimentosComponent;
  let fixture: ComponentFixture<ExibeAtendimentosComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExibeAtendimentosComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ExibeAtendimentosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
