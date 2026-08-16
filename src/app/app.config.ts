import { registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  ApplicationConfig,
  DEFAULT_CURRENCY_CODE,
  LOCALE_ID,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { firstValueFrom } from 'rxjs';

// O app e de uso individual e em portugues: nao ha troca de idioma para justificar i18n.
registerLocaleData(localePt, 'pt-BR');

import { routes } from './app.routes';
import { erroInterceptor } from './core/http/erro.interceptor';
import { tokenInterceptor } from './core/http/token.interceptor';
import { AuthService } from './core/sessao/auth.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    // A ordem importa: o token entra na requisicao antes de sair, o erro e tratado na volta.
    // Nao configuramos timeout: o plano gratuito hiberna e a primeira chamada leva ate um minuto.
    provideHttpClient(withInterceptors([tokenInterceptor, erroInterceptor])),
    // Havendo token guardado, confirma com o servidor quem esta logado antes de renderizar as
    // rotas. E o que evita a tela piscar com dados de uma sessao que ja morreu.
    provideAppInitializer(() => firstValueFrom(inject(AuthService).restaurarSessao())),
    // Com isso `| currency` sai como R$ 1.234,56 e `| date` escreve os meses em portugues,
    // sem repetir locale e moeda em cada template.
    { provide: LOCALE_ID, useValue: 'pt-BR' },
    { provide: DEFAULT_CURRENCY_CODE, useValue: 'BRL' },
    // O Chart.js nao e registrado aqui de proposito: no bootstrap ele arrastaria a biblioteca
    // inteira para o bundle inicial. Quem cuida disso e `core/graficos/registro.ts`, importado
    // pelas duas telas que desenham grafico.
  ],
};
