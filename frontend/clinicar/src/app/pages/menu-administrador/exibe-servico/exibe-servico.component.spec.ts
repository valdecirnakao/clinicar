import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExibeServicoComponent } from './exibe-servico.component';

describe('ExibeServicoComponent', () => {
  let component: ExibeServicoComponent;
  let fixture: ComponentFixture<ExibeServicoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
      imports: [ExibeServicoComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ExibeServicoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
