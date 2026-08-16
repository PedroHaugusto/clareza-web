import { Component, inject } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/sessao/auth.service';

/**
 * Casca das rotas protegidas. Por enquanto so cabecalho e ponto de saida do roteador — a
 * navegacao entre areas entra quando existirem telas para navegar.
 */
@Component({
  selector: 'app-area-logada',
  imports: [RouterOutlet],
  templateUrl: './area-logada.html',
})
export class AreaLogada {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly usuario = this.auth.usuario;

  protected sair(): void {
    this.auth.encerrarSessao();
    void this.router.navigateByUrl('/login');
  }
}
