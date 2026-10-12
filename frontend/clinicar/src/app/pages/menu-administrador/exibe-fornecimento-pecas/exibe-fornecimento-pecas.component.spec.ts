import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExibeFornecimentoPecaComponent } from './exibe-fornecimento-pecas.component';

describe('ExibeFornecimentoPecaComponent', () => {
  let component: ExibeFornecimentoPecaComponent;
  let fixture: ComponentFixture<ExibeFornecimentoPecaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
      imports: [ExibeFornecimentoPecaComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ExibeFornecimentoPecaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
