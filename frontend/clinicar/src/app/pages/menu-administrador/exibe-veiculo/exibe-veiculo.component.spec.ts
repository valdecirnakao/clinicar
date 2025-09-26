import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExibeVeiculoComponent } from './exibe-veiculo.component';

describe('ExibeVeiculoComponent', () => {
  let component: ExibeVeiculoComponent;
  let fixture: ComponentFixture<ExibeVeiculoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExibeVeiculoComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ExibeVeiculoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
