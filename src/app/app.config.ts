import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { firstValueFrom } from 'rxjs';

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
  ],
};
