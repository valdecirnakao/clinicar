import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { ExibeControleEstoquePecasComponent } from './exibe-controle-estoque-pecas.component';

describe('ExibeControleEstoquePecasComponent', () => {
  let component: ExibeControleEstoquePecasComponent;
  let fixture: ComponentFixture<ExibeControleEstoquePecasComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExibeControleEstoquePecasComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ExibeControleEstoquePecasComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
