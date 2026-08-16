import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

/**
 * Protege as rotas internas.
 *
 * A sessao ja foi restaurada no boot da aplicacao, entao aqui basta olhar o estado — sem
 * chamada de rede, sem tela piscando. Guardar a URL pretendida em `returnUrl` faz o login
 * devolver o usuario para onde ele tentou ir, em vez de sempre para o inicio.
 */
export const authGuard: CanActivateFn = (_rota, estado) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.autenticado()) {
    return true;
  }

  return router.createUrlTree(['/login'], { queryParams: { returnUrl: estado.url } });
};
