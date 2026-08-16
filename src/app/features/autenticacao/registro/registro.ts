import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ErroDaApi, mensagemDoCampo } from '../../../api/erro-da-api';
import { AuthService } from '../../../core/sessao/auth.service';

/**
 * O teto de 72 caracteres nao e arbitrario: o BCrypt trunca em 72 bytes, e aceitar mais
 * criaria a ilusao de uma senha mais forte do que a que fica armazenada.
 */
export const TAMANHO_MINIMO_DA_SENHA = 8;
export const TAMANHO_MAXIMO_DA_SENHA = 72;

@Component({
  selector: 'app-registro',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './registro.html',
})
export class Registro {
  private readonly formBuilder = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly tamanhoMinimoDaSenha = TAMANHO_MINIMO_DA_SENHA;

  protected readonly formulario = this.formBuilder.nonNullable.group({
    nome: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    senha: [
      '',
      [
        Validators.required,
        Validators.minLength(TAMANHO_MINIMO_DA_SENHA),
        Validators.maxLength(TAMANHO_MAXIMO_DA_SENHA),
      ],
    ],
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

    // O registro ja devolve o token: entra direto, sem passar pelo login.
    this.auth.registrar(this.formulario.getRawValue()).subscribe({
      next: () => void this.router.navigateByUrl('/'),
      error: (erro: ErroDaApi) => {
        this.enviando.set(false);
        this.erro.set(erro);
      },
    });
  }
}
