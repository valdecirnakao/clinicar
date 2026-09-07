import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExibeRegrasManutencaoComponent } from './exibe-regras-manutencao.component';

describe('ExibeRegrasManutencaoComponent', () => {
  let component: ExibeRegrasManutencaoComponent;
  let fixture: ComponentFixture<ExibeRegrasManutencaoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExibeRegrasManutencaoComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ExibeRegrasManutencaoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
