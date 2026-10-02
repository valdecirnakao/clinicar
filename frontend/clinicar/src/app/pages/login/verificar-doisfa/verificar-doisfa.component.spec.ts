import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Verificar2faComponent } from './verificar-doisfa.component';

describe('Verificar2faComponent', () => {
  let component: Verificar2faComponent;
  let fixture: ComponentFixture<Verificar2faComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
      imports: [Verificar2faComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Verificar2faComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
