import { provideZoneChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LoginComponent } from './login.component';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideZoneChangeDetection(), provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
      imports: [LoginComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('oculta o primeiro acesso após a configuração inicial', () => {
    http.expectOne('/api/setup/status').flush({ setupDisponivel: false, estado: 'CONCLUIDO', mensagem: '' });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).not.toContain('Primeiro acesso da oficina?');
  });

  it('permite retomar a ativação do administrador inicial', () => {
    http.expectOne('/api/setup/status').flush({ setupDisponivel: true, estado: 'AGUARDANDO_ATIVACAO', mensagem: '' });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Primeiro acesso da oficina?');
  });
});
