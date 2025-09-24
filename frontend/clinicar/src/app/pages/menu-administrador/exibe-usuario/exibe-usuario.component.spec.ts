import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExibeUsuarioComponent } from './exibe-usuario.component';

describe('ExibeUsuarioComponent', () => {
  let component: ExibeUsuarioComponent;
  let fixture: ComponentFixture<ExibeUsuarioComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExibeUsuarioComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ExibeUsuarioComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
