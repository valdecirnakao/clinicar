import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CadastraUsuarioComponent } from '../cadastra-usuario/cadastra-usuario.component';

describe('CadastraUsuarioComponent', () => {
  let component: CadastraUsuarioComponent;
  let fixture: ComponentFixture<CadastraUsuarioComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CadastraUsuarioComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CadastraUsuarioComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
