import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/sessao/auth.service';

/** Casca das rotas protegidas: cabecalho, navegacao e ponto de saida do roteador. */
@Component({
  selector: 'app-area-logada',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
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
