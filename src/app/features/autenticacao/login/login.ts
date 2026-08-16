import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ErroDaApi, mensagemDoCampo } from '../../../api/erro-da-api';
import { AuthService } from '../../../core/sessao/auth.service';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.html',
})
export class Login {
  private readonly formBuilder = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly rota = inject(ActivatedRoute);

  protected readonly formulario = this.formBuilder.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    senha: ['', [Validators.required]],
  });

  protected readonly enviando = signal(false);
  protected readonly erro = signal<ErroDaApi | null>(null);

  protected erroDoCampo(campo: string): string | null {
    return mensagemDoCampo(this.erro(), campo);
  }

  protected enviar(): void {
    if (this.formulario.invalid || this.enviando()) {
      this.formulario.markAllAsTouched();
      return;
    }

    this.enviando.set(true);
    this.erro.set(null);

    this.auth.entrar(this.formulario.getRawValue()).subscribe({
      next: () => {
        const destino = this.rota.snapshot.queryParamMap.get('returnUrl') ?? '/';
        void this.router.navigateByUrl(destino);
      },
      error: (erro: ErroDaApi) => {
        this.enviando.set(false);
        this.erro.set(erro);
      },
    });
  }
}
