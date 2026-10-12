import { ApplicationConfig, LOCALE_ID, inject, provideAppInitializer, provideZoneChangeDetection } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors, withFetch} from '@angular/common/http';
import { operacaoInterceptor } from './services/operacao.interceptor';
import { FormulariosPendentesService, formularioSalvoInterceptor } from './services/formularios-pendentes.service';
import { ContinuidadeService, continuidadeInterceptor } from './services/continuidade.service';
import { versaoCadastroInterceptor, VersoesCadastroService } from './services/versao-cadastro.interceptor';
import { csrfInterceptor } from './services/csrf.interceptor';
import { routes } from './app.routes';

registerLocaleData(localePt);

export const appConfig: ApplicationConfig = {
  providers: [
    provideAppInitializer(() => inject(FormulariosPendentesService).instalar()),
    provideAppInitializer(() => inject(ContinuidadeService).instalar()),
    provideAppInitializer(() => inject(VersoesCadastroService).instalar()),
    provideZoneChangeDetection({ eventCoalescing: true })
    ,provideRouter(routes)
    ,{
      provide: LOCALE_ID,
      useValue: 'pt-BR'
    }
    ,provideHttpClient(withFetch(), withInterceptors([operacaoInterceptor, versaoCadastroInterceptor, csrfInterceptor, formularioSalvoInterceptor, continuidadeInterceptor]))
  ]
};
