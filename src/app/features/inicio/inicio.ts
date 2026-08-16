import { Component, inject } from '@angular/core';
import { AuthService } from '../../core/sessao/auth.service';

/**
 * Placeholder deliberado.
 *
 * Nao e a visao geral — serve para provar guard, interceptor e restauracao de sessao
 * funcionando ponta a ponta. A tela real entra no proximo bloco, consumindo
 * `GET /api/visao-geral`.
 */
@Component({
  selector: 'app-inicio',
  templateUrl: './inicio.html',
})
export class Inicio {
  protected readonly usuario = inject(AuthService).usuario;
}
