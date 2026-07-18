import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExibeAgendamentosComponent } from './exibe-agendamentos.component';

describe('ExibeAgendamentosComponent', () => {
  let component: ExibeAgendamentosComponent;
  let fixture: ComponentFixture<ExibeAgendamentosComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExibeAgendamentosComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ExibeAgendamentosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
